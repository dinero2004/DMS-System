package com.example.dms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 17)
    private String vin;

    @Column(nullable = false)
    private String manufacturer;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private Integer modelYear;

    @Column(nullable = false)
    private Integer mileageKm;

    @Column(nullable = false)
    private String fuelType;

    @Column(nullable = false)
    private String transmission;

    private LocalDate firstRegistrationDate;

    private BigDecimal askingPrice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer owner;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Vehicle() {
    }

    public Vehicle(String vin, String manufacturer, String model, Integer modelYear, Integer mileageKm,
                   String fuelType, String transmission, LocalDate firstRegistrationDate, BigDecimal askingPrice,
                   Customer owner) {
        this.vin = vin;
        this.manufacturer = manufacturer;
        this.model = model;
        this.modelYear = modelYear;
        this.mileageKm = mileageKm;
        this.fuelType = fuelType;
        this.transmission = transmission;
        this.firstRegistrationDate = firstRegistrationDate;
        this.askingPrice = askingPrice;
        this.owner = owner;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getVin() {
        return vin;
    }

    public void setVin(String vin) {
        this.vin = vin;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getModelYear() {
        return modelYear;
    }

    public void setModelYear(Integer modelYear) {
        this.modelYear = modelYear;
    }

    public Integer getMileageKm() {
        return mileageKm;
    }

    public void setMileageKm(Integer mileageKm) {
        this.mileageKm = mileageKm;
    }

    public String getFuelType() {
        return fuelType;
    }

    public void setFuelType(String fuelType) {
        this.fuelType = fuelType;
    }

    public String getTransmission() {
        return transmission;
    }

    public void setTransmission(String transmission) {
        this.transmission = transmission;
    }

    public LocalDate getFirstRegistrationDate() {
        return firstRegistrationDate;
    }

    public void setFirstRegistrationDate(LocalDate firstRegistrationDate) {
        this.firstRegistrationDate = firstRegistrationDate;
    }

    public BigDecimal getAskingPrice() {
        return askingPrice;
    }

    public void setAskingPrice(BigDecimal askingPrice) {
        this.askingPrice = askingPrice;
    }

    public Customer getOwner() {
        return owner;
    }

    public void setOwner(Customer owner) {
        this.owner = owner;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
