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
import java.time.Instant;

@Entity
@Table(name = "vehicle_valuations")
public class VehicleValuation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_protocol_id")
    private ManufacturerProtocol manufacturerProtocol;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "market_reference_id")
    private MarketReference marketReference;

    @Column(nullable = false)
    private BigDecimal estimatedValue;

    @Column(nullable = false)
    private Integer confidenceScore;

    @Column(nullable = false, length = 4000)
    private String rationale;

    @Column(nullable = false)
    private Instant createdAt;

    protected VehicleValuation() {
    }

    public VehicleValuation(Vehicle vehicle, ManufacturerProtocol manufacturerProtocol, MarketReference marketReference,
                            BigDecimal estimatedValue, Integer confidenceScore, String rationale) {
        this.vehicle = vehicle;
        this.manufacturerProtocol = manufacturerProtocol;
        this.marketReference = marketReference;
        this.estimatedValue = estimatedValue;
        this.confidenceScore = confidenceScore;
        this.rationale = rationale;
        this.createdAt = Instant.now();
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

    public ManufacturerProtocol getManufacturerProtocol() {
        return manufacturerProtocol;
    }

    public void setManufacturerProtocol(ManufacturerProtocol manufacturerProtocol) {
        this.manufacturerProtocol = manufacturerProtocol;
    }

    public MarketReference getMarketReference() {
        return marketReference;
    }

    public void setMarketReference(MarketReference marketReference) {
        this.marketReference = marketReference;
    }

    public BigDecimal getEstimatedValue() {
        return estimatedValue;
    }

    public void setEstimatedValue(BigDecimal estimatedValue) {
        this.estimatedValue = estimatedValue;
    }

    public Integer getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Integer confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
