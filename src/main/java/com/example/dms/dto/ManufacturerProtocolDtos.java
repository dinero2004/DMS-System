package com.example.dms.dto;

import com.example.dms.entity.ManufacturerProtocol;
import jakarta.validation.constraints.NotBlank;

public final class ManufacturerProtocolDtos {
    private ManufacturerProtocolDtos() {
    }

    public record CreateManufacturerProtocolRequest(
            @NotBlank String manufacturer,
            @NotBlank String model,
            String generation,
            @NotBlank String inspectionChecklist,
            String knownIssues,
            String valuationGuidance
    ) {
    }

    public record ManufacturerProtocolResponse(
            Long id,
            String manufacturer,
            String model,
            String generation,
            String inspectionChecklist,
            String knownIssues,
            String valuationGuidance
    ) {
        public static ManufacturerProtocolResponse from(ManufacturerProtocol protocol) {
            return new ManufacturerProtocolResponse(
                    protocol.getId(),
                    protocol.getManufacturer(),
                    protocol.getModel(),
                    protocol.getGeneration(),
                    protocol.getInspectionChecklist(),
                    protocol.getKnownIssues(),
                    protocol.getValuationGuidance()
            );
        }
    }
}
