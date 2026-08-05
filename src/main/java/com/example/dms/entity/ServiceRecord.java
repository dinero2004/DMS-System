package com.example.dms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "service_records")
public class ServiceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(nullable = false)
    private LocalDate serviceDate;

    @Column(nullable = false)
    private Integer mileageKm;

    @Column(nullable = false, length = 1000)
    private String description;

    private String performedBy;

    private BigDecimal cost;

    protected ServiceRecord() {
    }

    public ServiceRecord(Vehicle vehicle, LocalDate serviceDate, Integer mileageKm, String description,
                         String performedBy, BigDecimal cost) {
        this.vehicle = vehicle;
        this.serviceDate = serviceDate;
        this.mileageKm = mileageKm;
        this.description = description;
        this.performedBy = performedBy;
        this.cost = cost;
    }

    public Long getId() {
        return id;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }

    public void setVehicle(Vehicle vehicle) {
        this.vehicle = vehicle;
    }

    public LocalDate getServiceDate() {
        return serviceDate;
    }

    public void setServiceDate(LocalDate serviceDate) {
        this.serviceDate = serviceDate;
    }

    public Integer getMileageKm() {
        return mileageKm;
    }

    public void setMileageKm(Integer mileageKm) {
        this.mileageKm = mileageKm;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public BigDecimal getCost() {
        return cost;
    }

    public void setCost(BigDecimal cost) {
        this.cost = cost;
    }
}
