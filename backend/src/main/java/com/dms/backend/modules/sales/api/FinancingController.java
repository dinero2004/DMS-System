package com.dms.backend.modules.sales.api;

import com.dms.backend.modules.customervehicle.api.CarProfile;
import com.dms.backend.modules.customervehicle.api.ClientProfile;
import com.dms.backend.modules.customervehicle.api.CustomerVehicleMapper;
import com.dms.backend.modules.customervehicle.persistence.*;
import com.dms.backend.modules.sales.persistence.FinancingOfferEntity;
import com.dms.backend.modules.sales.persistence.FinancingOfferRepository;
import com.dms.backend.modules.sales.service.FinancingPdfService;
import com.dms.backend.shared.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @Validated @RequestMapping("/api/v1/sales/financing")
public class FinancingController {
    private final FinancingOfferRepository repo;
    private final FinancingPdfService pdfService;
    private final CarRepository carRepo;
    private final ClientRepository clientRepo;

    public FinancingController(FinancingOfferRepository r, FinancingPdfService ps, CarRepository cr, ClientRepository clr) {
        repo = r; pdfService = ps; carRepo = cr; clientRepo = clr;
    }

    @GetMapping public List<OfferView> list() {
        List<OfferView> out = new ArrayList<>();
        for (FinancingOfferEntity o : repo.findAllByOrderByCreatedAtDesc()) out.add(toView(o));
        return out;
    }

    @PostMapping public ApiResponse create(@RequestBody @Valid CreateOfferRequest r) {
        long monthly = calcMonthly(r.offerType(), r.vehicleValueCents(), r.downPaymentCents() != null ? r.downPaymentCents() : 0L,
            r.residualValueCents(), r.durationMonths(), r.interestRatePct().doubleValue());

        FinancingOfferEntity e = new FinancingOfferEntity();
        e.setId(UUID.randomUUID().toString());
        e.setCarId(StringUtils.hasText(r.carId()) ? r.carId() : null);
        e.setClientId(StringUtils.hasText(r.clientId()) ? r.clientId() : null);
        e.setOfferType(r.offerType().trim().toUpperCase());
        e.setVehicleValueCents(r.vehicleValueCents());
        e.setDownPaymentCents(r.downPaymentCents() != null ? r.downPaymentCents() : 0L);
        e.setResidualValueCents(r.residualValueCents());
        e.setResidualPct(r.residualPct());
        e.setDurationMonths(r.durationMonths());
        e.setInterestRatePct(r.interestRatePct());
        e.setMonthlyPaymentCents(monthly);
        e.setCreatedAt(OffsetDateTime.now());
        repo.save(e);
        return new ApiResponse(e.getId(), e.getOfferType(), "Offer created — CHF " + String.format("%.2f", monthly / 100.0) + "/mo");
    }

    @GetMapping("/{id}/pdf") public ResponseEntity<byte[]> pdf(@PathVariable String id) {
        FinancingOfferEntity o = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        CarEntity car = o.getCarId() != null ? carRepo.findById(o.getCarId()).orElse(null) : null;
        ClientEntity client = o.getClientId() != null ? clientRepo.findById(o.getClientId()).orElse(null) : null;
        byte[] bytes = pdfService.render(o, car, client);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"financing-offer-" + id.substring(0, 8) + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF).body(bytes);
    }

    static long calcMonthly(String type, long vehicleValueCents, long downPaymentCents, Long residualCents, int months, double annualPct) {
        double principal = vehicleValueCents - downPaymentCents;
        double monthlyRate = annualPct / 100.0 / 12.0;
        if ("LEASING".equalsIgnoreCase(type)) {
            double residual = residualCents != null ? residualCents : 0;
            double depreciation = (principal - residual) / months;
            double interest = (principal + residual) / 2.0 * monthlyRate;
            return Math.round(depreciation + interest);
        } else {
            if (monthlyRate <= 0) return Math.round(principal / months);
            double pmt = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
            return Math.round(pmt);
        }
    }

    private OfferView toView(FinancingOfferEntity o) {
        CarProfile car = null; ClientProfile client = null;
        if (o.getCarId() != null) { CarEntity c = carRepo.findById(o.getCarId()).orElse(null); if (c != null) car = CustomerVehicleMapper.toCarProfile(c); }
        if (o.getClientId() != null) { ClientEntity c = clientRepo.findById(o.getClientId()).orElse(null); if (c != null) client = CustomerVehicleMapper.toClientProfile(c); }
        return new OfferView(o.getId(), car, client, o.getOfferType(), o.getVehicleValueCents(), o.getDownPaymentCents(),
            o.getResidualValueCents(), o.getResidualPct(), o.getDurationMonths(), o.getInterestRatePct(), o.getMonthlyPaymentCents(), o.getCreatedAt());
    }

    public record CreateOfferRequest(@NotBlank String offerType, String carId, String clientId,
        @NotNull @Positive Long vehicleValueCents, Long downPaymentCents, Long residualValueCents, BigDecimal residualPct,
        @NotNull @Positive Integer durationMonths, @NotNull BigDecimal interestRatePct) {}
    public record OfferView(String id, CarProfile car, ClientProfile client, String offerType, long vehicleValueCents, long downPaymentCents,
        Long residualValueCents, BigDecimal residualPct, int durationMonths, BigDecimal interestRatePct, long monthlyPaymentCents, OffsetDateTime createdAt) {}
}
