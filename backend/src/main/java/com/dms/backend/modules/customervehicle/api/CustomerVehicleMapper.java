package com.dms.backend.modules.customervehicle.api;

import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientEntity;

public final class CustomerVehicleMapper {
    private CustomerVehicleMapper() {}

    public static ClientProfile toClientProfile(ClientEntity c) {
        String display = c.getName();
        if (c.getFirstName() != null) {
            display = (c.getFirstName() + " " + (c.getLastName() != null ? c.getLastName() : "")).trim();
        }
        return new ClientProfile(c.getId(), display, c.getFirstName(), c.getLastName(),
            c.getPhone(), c.getEmail(), c.getAddressLine(), c.getZipCode(), c.getCity(),
            c.getBirthday());
    }

    public static CarProfile toCarProfile(CarEntity car) {
        return new CarProfile(car.getId(), car.getClientId(), car.getBranchId(),
            car.getMake(), car.getModel(), car.getPlate(), car.getVin(), car.getStammnummer(),
            car.getVehicleRole(), car.getModelYear(), car.getColor(), car.getTrimColor(),
            car.getMileageKm(), car.getNotes(),
            car.getPurchasePriceCents(), car.getCatalogPriceCents(), car.getUsedValueCents(),
            car.getSellingPriceCents(), car.getPrepFeeCents(), car.getArrivalDate(),
            car.getFuelType(), car.getFirstRegistrationDate());
    }
}
