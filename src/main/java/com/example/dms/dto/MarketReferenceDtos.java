package com.example.dms.dto;

import com.example.dms.entity.MarketReference;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class MarketReferenceDtos {
    private MarketReferenceDtos() {
    }

    public record CreateMarketReferenceRequest(
            @NotBlank String manufacturer,
            @NotBlank String model,
            @NotNull @Min(1900) Integer modelYear,
            @Min(0) Integer mileageMinKm,
            @Min(0) Integer mileageMaxKm,
            @NotNull BigDecimal referencePrice,
            @NotBlank String source,
            @NotNull LocalDate observedAt,
            String notes
    ) {
    }

    public record MarketReferenceResponse(
            Long id,
            String manufacturer,
            String model,
            Integer modelYear,
            Integer mileageMinKm,
            Integer mileageMaxKm,
            BigDecimal referencePrice,
            String source,
            LocalDate observedAt,
            String notes
    ) {
        public static MarketReferenceResponse from(MarketReference reference) {
            return new MarketReferenceResponse(
                    reference.getId(),
                    reference.getManufacturer(),
                    reference.getModel(),
                    reference.getModelYear(),
                    reference.getMileageMinKm(),
                    reference.getMileageMaxKm(),
                    reference.getReferencePrice(),
                    reference.getSource(),
                    reference.getObservedAt(),
                    reference.getNotes()
            );
        }
    }
}
