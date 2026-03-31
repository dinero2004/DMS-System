package com.dms.backend.modules.customervehicle.persistence;

import com.dms.backend.modules.customervehicle.domain.VehicleRole;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "car")
public class CarEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "client_id", nullable = false, length = 36) private String clientId;
    @Column(name = "branch_id", length = 64) private String branchId;
    @Column(length = 80) private String make;
    @Column(nullable = false, length = 160) private String model;
    @Column(length = 40) private String plate;
    @Column(length = 17) private String vin;
    @Column(length = 20) private String stammnummer;
    @Enumerated(EnumType.STRING) @Column(name = "vehicle_role", length = 30) private VehicleRole vehicleRole;
    @Column(name = "model_year") private Integer modelYear;
    @Column(length = 60) private String color;
    @Column(name = "trim_color", length = 60) private String trimColor;
    @Column(name = "mileage_km") private Integer mileageKm;
    @Column(columnDefinition = "TEXT") private String notes;
    @Column(name = "purchase_price_cents") private Long purchasePriceCents;
    @Column(name = "catalog_price_cents") private Long catalogPriceCents;
    @Column(name = "used_value_cents") private Long usedValueCents;
    @Column(name = "selling_price_cents") private Long sellingPriceCents;
    @Column(name = "prep_fee_cents") private Long prepFeeCents;
    @Column(name = "arrival_date") private LocalDate arrivalDate;
    @Column(name = "fuel_type", length = 30) private String fuelType;
    @Column(name = "first_registration_date") private LocalDate firstRegistrationDate;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }
    public String getBranchId() { return branchId; }
    public void setBranchId(String branchId) { this.branchId = branchId; }
    public String getMake() { return make; }
    public void setMake(String make) { this.make = make; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getPlate() { return plate; }
    public void setPlate(String plate) { this.plate = plate; }
    public String getVin() { return vin; }
    public void setVin(String vin) { this.vin = vin; }
    public String getStammnummer() { return stammnummer; }
    public void setStammnummer(String stammnummer) { this.stammnummer = stammnummer; }
    public VehicleRole getVehicleRole() { return vehicleRole; }
    public void setVehicleRole(VehicleRole vehicleRole) { this.vehicleRole = vehicleRole; }
    public Integer getModelYear() { return modelYear; }
    public void setModelYear(Integer modelYear) { this.modelYear = modelYear; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getTrimColor() { return trimColor; }
    public void setTrimColor(String trimColor) { this.trimColor = trimColor; }
    public Integer getMileageKm() { return mileageKm; }
    public void setMileageKm(Integer mileageKm) { this.mileageKm = mileageKm; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Long getPurchasePriceCents() { return purchasePriceCents; }
    public void setPurchasePriceCents(Long purchasePriceCents) { this.purchasePriceCents = purchasePriceCents; }
    public Long getCatalogPriceCents() { return catalogPriceCents; }
    public void setCatalogPriceCents(Long catalogPriceCents) { this.catalogPriceCents = catalogPriceCents; }
    public Long getUsedValueCents() { return usedValueCents; }
    public void setUsedValueCents(Long usedValueCents) { this.usedValueCents = usedValueCents; }
    public Long getSellingPriceCents() { return sellingPriceCents; }
    public void setSellingPriceCents(Long sellingPriceCents) { this.sellingPriceCents = sellingPriceCents; }
    public Long getPrepFeeCents() { return prepFeeCents; }
    public void setPrepFeeCents(Long prepFeeCents) { this.prepFeeCents = prepFeeCents; }
    public LocalDate getArrivalDate() { return arrivalDate; }
    public void setArrivalDate(LocalDate arrivalDate) { this.arrivalDate = arrivalDate; }
    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }
    public LocalDate getFirstRegistrationDate() { return firstRegistrationDate; }
    public void setFirstRegistrationDate(LocalDate firstRegistrationDate) { this.firstRegistrationDate = firstRegistrationDate; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
