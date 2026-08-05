package com.example.dms.dto;

import com.example.dms.entity.Customer;
import com.example.dms.entity.Vehicle;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class VehicleDtos {
    private VehicleDtos() {
    }

    public record CreateVehicleRequest(
            @NotBlank @Size(min = 17, max = 17) String vin,
            @NotBlank String manufacturer,
            @NotBlank String model,
            @NotNull @Min(1900) Integer modelYear,
            @NotNull @Min(0) Integer mileageKm,
            @NotBlank String fuelType,
            @NotBlank String transmission,
            LocalDate firstRegistrationDate,
            BigDecimal askingPrice,
            Long ownerId
    ) {
    }

    public record VehicleResponse(
            Long id,
            String vin,
            String manufacturer,
            String model,
            Integer modelYear,
            Integer mileageKm,
            String fuelType,
            String transmission,
            LocalDate firstRegistrationDate,
            BigDecimal askingPrice,
            OwnerSummary owner,
            Instant createdAt
    ) {
        public static VehicleResponse from(Vehicle vehicle) {
            Customer owner = vehicle.getOwner();
            OwnerSummary ownerSummary = owner == null
                    ? null
                    : new OwnerSummary(owner.getId(), owner.getFirstName(), owner.getLastName(), owner.getEmail());
            return new VehicleResponse(
                    vehicle.getId(),
                    vehicle.getVin(),
                    vehicle.getManufacturer(),
                    vehicle.getModel(),
                    vehicle.getModelYear(),
                    vehicle.getMileageKm(),
                    vehicle.getFuelType(),
                    vehicle.getTransmission(),
                    vehicle.getFirstRegistrationDate(),
                    vehicle.getAskingPrice(),
                    ownerSummary,
                    vehicle.getCreatedAt()
            );
        }
    }

    public record OwnerSummary(Long id, String firstName, String lastName, String email) {
    }
}
