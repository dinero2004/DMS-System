package com.dms.backend.modules.sales.api;

import com.dms.backend.modules.customervehicle.api.CarProfile;
import com.dms.backend.modules.customervehicle.api.ClientProfile;
import com.dms.backend.modules.customervehicle.api.CustomerVehicleMapper;
import com.dms.backend.modules.customervehicle.persistence.*;
import com.dms.backend.modules.sales.persistence.SalesLeadEntity;
import com.dms.backend.modules.sales.persistence.SalesLeadRepository;
import com.dms.backend.shared.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @Validated @RequestMapping("/api/v1/sales/leads")
public class SalesLeadController {
    private static final Set<String> VALID_STATUS = Set.of("NEW", "CONTACTED", "NEGOTIATION", "WON", "LOST");
    private final SalesLeadRepository leadRepo;
    private final ClientRepository clientRepo;
    private final CarRepository carRepo;

    public SalesLeadController(SalesLeadRepository lr, ClientRepository cr, CarRepository ca) { leadRepo = lr; clientRepo = cr; carRepo = ca; }

    @GetMapping public List<LeadView> list() {
        List<LeadView> out = new ArrayList<>();
        for (SalesLeadEntity l : leadRepo.findAllByOrderByCreatedAtDesc()) out.add(toView(l));
        return out;
    }

    @PostMapping public ApiResponse create(@RequestBody @Valid CreateLeadRequest r) {
        clientRepo.findById(r.clientId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown client"));
        OffsetDateTime now = OffsetDateTime.now();
        SalesLeadEntity l = new SalesLeadEntity();
        l.setId(UUID.randomUUID().toString()); l.setClientId(r.clientId());
        l.setCarId(StringUtils.hasText(r.carId()) ? r.carId() : null);
        l.setStatus("NEW"); l.setInterestModel(StringUtils.hasText(r.interestModel()) ? r.interestModel().trim() : null);
        l.setNotes(StringUtils.hasText(r.notes()) ? r.notes().trim() : null);
        l.setLeadSource(StringUtils.hasText(r.leadSource()) ? r.leadSource().trim() : null);
        l.setCreatedAt(now); l.setUpdatedAt(now); leadRepo.save(l);
        return new ApiResponse(l.getId(), "NEW", "Lead created");
    }

    @PostMapping("/{id}/status") public ApiResponse setStatus(@PathVariable String id, @RequestBody @Valid SetStatusRequest r) {
        SalesLeadEntity l = leadRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        String s = r.status().trim().toUpperCase();
        if (!VALID_STATUS.contains(s)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + s);
        l.setStatus(s); l.setUpdatedAt(OffsetDateTime.now()); leadRepo.save(l);
        return new ApiResponse(l.getId(), l.getStatus(), "Status updated");
    }

    private LeadView toView(SalesLeadEntity l) {
        ClientEntity cl = clientRepo.findById(l.getClientId()).orElse(null);
        ClientProfile cp = cl != null ? CustomerVehicleMapper.toClientProfile(cl) : null;
        CarProfile carP = null;
        if (l.getCarId() != null) { CarEntity car = carRepo.findById(l.getCarId()).orElse(null); if (car != null) carP = CustomerVehicleMapper.toCarProfile(car); }
        return new LeadView(l.getId(), cp, carP, l.getStatus(), l.getInterestModel(), l.getNotes(), l.getLeadSource(), l.getCreatedAt());
    }

    public record CreateLeadRequest(@NotBlank String clientId, String carId, String interestModel, String notes, String leadSource) {}
    public record SetStatusRequest(@NotBlank String status) {}
    public record LeadView(String id, ClientProfile client, CarProfile car, String status, String interestModel, String notes, String leadSource, OffsetDateTime createdAt) {}
}
