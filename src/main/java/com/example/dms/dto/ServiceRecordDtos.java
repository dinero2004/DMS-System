package com.example.dms.dto;

import com.example.dms.entity.ServiceRecord;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class ServiceRecordDtos {
    private ServiceRecordDtos() {
    }

    public record CreateServiceRecordRequest(
            @NotNull Long vehicleId,
            @NotNull LocalDate serviceDate,
            @NotNull @Min(0) Integer mileageKm,
            @NotBlank String description,
            String performedBy,
            BigDecimal cost
    ) {
    }

    public record ServiceRecordResponse(
            Long id,
            Long vehicleId,
            String vehicleVin,
            LocalDate serviceDate,
            Integer mileageKm,
            String description,
            String performedBy,
            BigDecimal cost
    ) {
        public static ServiceRecordResponse from(ServiceRecord record) {
            return new ServiceRecordResponse(
                    record.getId(),
                    record.getVehicle().getId(),
                    record.getVehicle().getVin(),
                    record.getServiceDate(),
                    record.getMileageKm(),
                    record.getDescription(),
                    record.getPerformedBy(),
                    record.getCost()
            );
        }
    }
}
