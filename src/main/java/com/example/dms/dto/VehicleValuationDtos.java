package com.example.dms.dto;

import com.example.dms.entity.VehicleValuation;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class VehicleValuationDtos {
    private VehicleValuationDtos() {
    }

    public record CreateVehicleValuationRequest(
            @NotNull Long vehicleId,
            Long manufacturerProtocolId,
            Long marketReferenceId,
            @NotNull BigDecimal estimatedValue,
            @NotNull @Min(0) @Max(100) Integer confidenceScore,
            @NotBlank String rationale
    ) {
    }

    public record VehicleValuationResponse(
            Long id,
            Long vehicleId,
            String vehicleVin,
            Long manufacturerProtocolId,
            Long marketReferenceId,
            BigDecimal estimatedValue,
            Integer confidenceScore,
            String rationale,
            Instant createdAt
    ) {
        public static VehicleValuationResponse from(VehicleValuation valuation) {
            return new VehicleValuationResponse(
                    valuation.getId(),
                    valuation.getVehicle().getId(),
                    valuation.getVehicle().getVin(),
                    valuation.getManufacturerProtocol() == null ? null : valuation.getManufacturerProtocol().getId(),
                    valuation.getMarketReference() == null ? null : valuation.getMarketReference().getId(),
                    valuation.getEstimatedValue(),
                    valuation.getConfidenceScore(),
                    valuation.getRationale(),
                    valuation.getCreatedAt()
            );
        }
    }

    public record CreateValuationSuggestionRequest(
            @NotNull Long vehicleId
    ) {
    }

    public record ValuationSuggestionResponse(
            Long vehicleId,
            String vehicleVin,
            String manufacturer,
            String model,
            Integer modelYear,
            Integer mileageKm,
            Long manufacturerProtocolId,
            List<Long> marketReferenceIds,
            Integer serviceRecordCount,
            BigDecimal suggestedPrice,
            Integer confidenceScore,
            List<String> positiveFactors,
            List<String> negativeFactors,
            List<String> missingDataWarnings,
            String explanation
    ) {
    }
}
