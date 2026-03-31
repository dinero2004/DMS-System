package com.dms.backend.modules.customervehicle.api;

import com.dms.backend.modules.customervehicle.domain.VehicleRole;
import java.time.LocalDate;

public record CarProfile(
    String id, String clientId, String branchId, String make, String model,
    String plate, String vin, String stammnummer, VehicleRole vehicleRole,
    Integer modelYear, String color, String trimColor, Integer mileageKm, String notes,
    Long purchasePriceCents, Long catalogPriceCents, Long usedValueCents,
    Long sellingPriceCents, Long prepFeeCents, LocalDate arrivalDate,
    String fuelType, LocalDate firstRegistrationDate
) {}
