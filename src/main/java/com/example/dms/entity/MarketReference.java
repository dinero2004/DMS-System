package com.example.dms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "market_references")
public class MarketReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String manufacturer;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private Integer modelYear;

    private Integer mileageMinKm;

    private Integer mileageMaxKm;

    @Column(nullable = false)
    private BigDecimal referencePrice;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private LocalDate observedAt;

    private String notes;

    protected MarketReference() {
    }

    public MarketReference(String manufacturer, String model, Integer modelYear, Integer mileageMinKm,
                           Integer mileageMaxKm, BigDecimal referencePrice, String source, LocalDate observedAt,
                           String notes) {
        this.manufacturer = manufacturer;
        this.model = model;
        this.modelYear = modelYear;
        this.mileageMinKm = mileageMinKm;
        this.mileageMaxKm = mileageMaxKm;
        this.referencePrice = referencePrice;
        this.source = source;
        this.observedAt = observedAt;
        this.notes = notes;
    }

    public Long getId() {
        return id;
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

    public Integer getMileageMinKm() {
        return mileageMinKm;
    }

    public void setMileageMinKm(Integer mileageMinKm) {
        this.mileageMinKm = mileageMinKm;
    }

    public Integer getMileageMaxKm() {
        return mileageMaxKm;
    }

    public void setMileageMaxKm(Integer mileageMaxKm) {
        this.mileageMaxKm = mileageMaxKm;
    }

    public BigDecimal getReferencePrice() {
        return referencePrice;
    }

    public void setReferencePrice(BigDecimal referencePrice) {
        this.referencePrice = referencePrice;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDate getObservedAt() {
        return observedAt;
    }

    public void setObservedAt(LocalDate observedAt) {
        this.observedAt = observedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
