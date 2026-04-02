package com.dms.backend.modules.finance.api;

import com.dms.backend.modules.customervehicle.api.ClientProfile;
import com.dms.backend.modules.customervehicle.api.CustomerVehicleMapper;
import com.dms.backend.modules.customervehicle.persistence.*;
import com.dms.backend.modules.finance.persistence.InvoiceEntity;
import com.dms.backend.modules.finance.persistence.InvoiceRepository;
import com.dms.backend.modules.finance.service.InvoicePdfService;
import com.dms.backend.modules.finance.service.InvoiceService;
import com.dms.backend.modules.sales.persistence.SalesContractEntity;
import com.dms.backend.modules.sales.persistence.SalesContractRepository;
import com.dms.backend.modules.sales.persistence.SalesLeadEntity;
import com.dms.backend.modules.sales.persistence.SalesLeadRepository;
import com.dms.backend.modules.workshop.persistence.*;
import com.dms.backend.shared.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @Validated @RequestMapping("/api/v1/finance/invoices")
public class FinanceController {
    private static final Set<String> VALID_STATUS = Set.of("DRAFT", "POSTED", "PAID");
    private final InvoiceRepository invoiceRepo;
    private final InvoiceService invoiceService;
    private final InvoicePdfService pdfService;
    private final ClientRepository clientRepo;
    private final CarRepository carRepo;
    private final WorkshopJobRepository jobRepo;
    private final WorkshopJobItemRepository itemRepo;
    private final SalesLeadRepository leadRepo;
    private final SalesContractRepository contractRepo;

    public FinanceController(InvoiceRepository ir, InvoiceService is, InvoicePdfService ps,
                             ClientRepository cr, CarRepository car, WorkshopJobRepository jr,
                             WorkshopJobItemRepository itr, SalesLeadRepository lr,
                             SalesContractRepository scr) {
        invoiceRepo = ir; invoiceService = is; pdfService = ps;
        clientRepo = cr; carRepo = car; jobRepo = jr; itemRepo = itr; leadRepo = lr; contractRepo = scr;
    }

    @GetMapping public List<InvoiceView> list() {
        List<InvoiceView> out = new ArrayList<>();
        for (InvoiceEntity i : invoiceRepo.findAllByOrderByCreatedAtDesc()) out.add(toView(i));
        return out;
    }

    @PostMapping public ApiResponse create(@RequestBody @Valid CreateInvoiceRequest r) {
        String type = r.referenceType().trim().toUpperCase();
        String clientId = resolveClientId(type, r.referenceId());
        InvoiceEntity inv = invoiceService.create(clientId, type, r.referenceId(), r.amountCents(), r.currency() != null ? r.currency() : "CHF");
        return new ApiResponse(inv.getId(), inv.getStatus(), "Invoice " + inv.getInvoiceNumber() + " created");
    }

    @PostMapping("/{id}/status") public ApiResponse setStatus(@PathVariable String id, @RequestBody @Valid SetStatusRequest r) {
        InvoiceEntity inv = invoiceRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
        if ("PAID".equals(inv.getStatus())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paid invoices cannot be changed");
        String s = r.status().trim().toUpperCase();
        if (!VALID_STATUS.contains(s)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        inv.setStatus(s); inv.setUpdatedAt(OffsetDateTime.now());
        if ("POSTED".equals(s) && inv.getIssuedAt() == null) inv.setIssuedAt(OffsetDateTime.now());
        invoiceService.save(inv);
        return new ApiResponse(inv.getId(), inv.getStatus(), "Status updated");
    }

    @GetMapping("/{id}/pdf") public ResponseEntity<byte[]> pdf(@PathVariable String id) {
        InvoiceEntity inv = invoiceRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found"));
        ClientEntity client = clientRepo.findById(inv.getClientId()).orElseThrow(() -> new IllegalStateException("Client missing"));

        WorkshopJobEntity job = null;
        CarEntity car = null;
        List<WorkshopJobItemEntity> items = null;

        SalesContractEntity salesContract = null;
        if ("WORKSHOP_JOB".equals(inv.getReferenceType())) {
            job = jobRepo.findById(inv.getReferenceId()).orElse(null);
            if (job != null) {
                car = carRepo.findById(job.getCarId()).orElse(null);
                items = itemRepo.findByJobIdOrderByCreatedAtAsc(job.getId());
            }
        } else if ("SALES_CONTRACT".equals(inv.getReferenceType())) {
            salesContract = contractRepo.findById(inv.getReferenceId()).orElse(null);
            if (salesContract != null && salesContract.getCarId() != null && !salesContract.getCarId().isBlank()) {
                car = carRepo.findById(salesContract.getCarId()).orElse(null);
            }
            items = List.of();
        } else if ("SALES_LEAD".equals(inv.getReferenceType())) {
            SalesLeadEntity lead = leadRepo.findById(inv.getReferenceId()).orElse(null);
            String leadId = lead != null ? lead.getId() : inv.getReferenceId();
            salesContract = contractRepo.findAllByOrderByCreatedAtDesc().stream()
                .filter(c -> leadId.equals(c.getLeadId()))
                .findFirst()
                .orElse(null);
            if (salesContract != null && salesContract.getCarId() != null && !salesContract.getCarId().isBlank()) {
                car = carRepo.findById(salesContract.getCarId()).orElse(null);
            }
            items = List.of();
        }

        byte[] bytes = pdfService.render(inv, client, job, car, items, salesContract);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + inv.getInvoiceNumber() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF).body(bytes);
    }

    private String resolveClientId(String type, String refId) {
        if ("WORKSHOP_JOB".equals(type)) {
            WorkshopJobEntity j = jobRepo.findById(refId).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job not found"));
            return j.getClientId();
        }
        if ("SALES_CONTRACT".equals(type)) {
            SalesContractEntity c = contractRepo.findById(refId).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Contract not found"));
            return c.getClientId();
        }
        SalesLeadEntity l = leadRepo.findById(refId).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lead not found"));
        return l.getClientId();
    }

    private InvoiceView toView(InvoiceEntity i) {
        ClientEntity cl = clientRepo.findById(i.getClientId()).orElse(null);
        ClientProfile cp = cl != null ? CustomerVehicleMapper.toClientProfile(cl) : null;
        return new InvoiceView(i.getId(), i.getInvoiceNumber(), cp, i.getReferenceType(), i.getReferenceId(), i.getAmountCents(), i.getCurrency(), i.getStatus(), i.getIssuedAt(), i.getCreatedAt());
    }

    public record CreateInvoiceRequest(@NotBlank String referenceType, @NotBlank String referenceId, @NotNull @Positive Long amountCents, String currency) {}
    public record SetStatusRequest(@NotBlank String status) {}
    public record InvoiceView(String id, String invoiceNumber, ClientProfile client, String referenceType, String referenceId, long amountCents, String currency, String status, OffsetDateTime issuedAt, OffsetDateTime createdAt) {}
}
