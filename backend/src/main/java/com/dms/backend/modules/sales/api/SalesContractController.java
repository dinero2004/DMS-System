package com.dms.backend.modules.sales.api;

import com.dms.backend.modules.customervehicle.api.*;
import com.dms.backend.modules.customervehicle.persistence.*;
import com.dms.backend.modules.sales.persistence.*;
import com.dms.backend.modules.sales.service.ContractPdfService;
import com.dms.backend.shared.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @Validated @RequestMapping("/api/v1/sales/contracts")
public class SalesContractController {
    private final SalesContractRepository contractRepo;
    private final SalesLeadRepository leadRepo;
    private final ClientRepository clientRepo;
    private final CarRepository carRepo;
    private final ContractPdfService pdfService;

    public SalesContractController(SalesContractRepository cr, SalesLeadRepository lr, ClientRepository clr, CarRepository car, ContractPdfService ps) {
        contractRepo = cr; leadRepo = lr; clientRepo = clr; carRepo = car; pdfService = ps;
    }

    @GetMapping public List<ContractView> list() {
        List<ContractView> out = new ArrayList<>();
        for (SalesContractEntity c : contractRepo.findAllByOrderByCreatedAtDesc()) out.add(toView(c));
        return out;
    }

    @PostMapping public ApiResponse create(@RequestBody @Valid CreateContractRequest r) {
        String clientId = r.clientId();
        if (!StringUtils.hasText(clientId) && StringUtils.hasText(r.leadId())) {
            SalesLeadEntity lead = leadRepo.findById(r.leadId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown lead"));
            clientId = lead.getClientId();
        }
        if (!StringUtils.hasText(clientId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client is required");
        ClientEntity client = clientRepo.findById(clientId).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client not found"));

        String carId = StringUtils.hasText(r.carId()) ? r.carId().trim() : null;
        if (carId == null && StringUtils.hasText(r.leadId())) {
            SalesLeadEntity lead = leadRepo.findById(r.leadId()).orElse(null);
            if (lead != null && lead.getCarId() != null) carId = lead.getCarId();
        }

        OffsetDateTime now = OffsetDateTime.now();
        SalesContractEntity ct = new SalesContractEntity();
        ct.setId(UUID.randomUUID().toString());
        ct.setLeadId(StringUtils.hasText(r.leadId()) ? r.leadId().trim() : null);
        ct.setClientId(client.getId());
        ct.setCarId(carId);
        ct.setSellingPriceCents(r.sellingPriceCents());
        ct.setPrepFeeCents(r.prepFeeCents() != null ? r.prepFeeCents() : 0L);
        ct.setAdditionalCostsText(StringUtils.hasText(r.additionalCostsText()) ? r.additionalCostsText().trim() : null);
        ct.setAdditionalCostsCents(r.additionalCostsCents() != null ? r.additionalCostsCents() : 0L);
        ct.setInsuranceCompany(StringUtils.hasText(r.insuranceCompany()) ? r.insuranceCompany().trim() : null);
        ct.setRegistrationPlate(StringUtils.hasText(r.registrationPlate()) ? r.registrationPlate().trim() : null);
        ct.setContractDate(r.contractDate() != null ? LocalDate.parse(r.contractDate()) : LocalDate.now());
        ct.setNotes(StringUtils.hasText(r.notes()) ? r.notes().trim() : null);
        ct.setCreatedAt(now); ct.setUpdatedAt(now); contractRepo.save(ct);

        if (carId != null) {
            CarEntity car = carRepo.findById(carId).orElse(null);
            if (car != null && com.dms.backend.modules.customervehicle.domain.VehicleRole.FOR_SALE_INVENTORY.equals(car.getVehicleRole())) {
                car.setClientId(client.getId());
                car.setVehicleRole(com.dms.backend.modules.customervehicle.domain.VehicleRole.CUSTOMER_OWNED);
                carRepo.save(car);
            }
        }

        return new ApiResponse(ct.getId(), "CREATED", "Contract created");
    }

    @GetMapping("/{id}/pdf") public ResponseEntity<byte[]> pdf(@PathVariable String id) {
        SalesContractEntity ct = contractRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found"));
        ClientEntity client = clientRepo.findById(ct.getClientId()).orElseThrow(() -> new IllegalStateException("Client missing"));
        CarEntity car = ct.getCarId() != null ? carRepo.findById(ct.getCarId()).orElse(null) : null;
        byte[] bytes = pdfService.render(ct, client, car);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"contract-" + id.substring(0, 8) + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF).body(bytes);
    }

    private ContractView toView(SalesContractEntity c) {
        ClientEntity cl = clientRepo.findById(c.getClientId()).orElse(null);
        ClientProfile cp = cl != null ? CustomerVehicleMapper.toClientProfile(cl) : null;
        CarProfile carP = null; if (c.getCarId() != null) { CarEntity car = carRepo.findById(c.getCarId()).orElse(null); if (car != null) carP = CustomerVehicleMapper.toCarProfile(car); }
        return new ContractView(c.getId(), c.getLeadId(), cp, carP, c.getSellingPriceCents(),
            c.getPrepFeeCents() != null ? c.getPrepFeeCents() : 0L,
            c.getAdditionalCostsText(), c.getAdditionalCostsCents() != null ? c.getAdditionalCostsCents() : 0L,
            c.getInsuranceCompany(), c.getRegistrationPlate(), c.getContractDate(), c.getNotes(), c.getCreatedAt());
    }

    public record CreateContractRequest(String leadId, String clientId, String carId,
        @NotNull @Positive Long sellingPriceCents, Long prepFeeCents,
        String additionalCostsText, Long additionalCostsCents,
        String insuranceCompany, String registrationPlate, String contractDate, String notes) {}
    public record ContractView(String id, String leadId, ClientProfile client, CarProfile car,
        long sellingPriceCents, long prepFeeCents, String additionalCostsText, long additionalCostsCents,
        String insuranceCompany, String registrationPlate, java.time.LocalDate contractDate,
        String notes, OffsetDateTime createdAt) {}
}
