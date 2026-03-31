package com.dms.backend.modules.sales.persistence;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "financing_offer")
public class FinancingOfferEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "car_id", length = 36) private String carId;
    @Column(name = "client_id", length = 36) private String clientId;
    @Column(name = "offer_type", nullable = false, length = 20) private String offerType;
    @Column(name = "vehicle_value_cents", nullable = false) private Long vehicleValueCents;
    @Column(name = "down_payment_cents", nullable = false) private Long downPaymentCents = 0L;
    @Column(name = "residual_value_cents") private Long residualValueCents;
    @Column(name = "residual_pct", precision = 5, scale = 2) private BigDecimal residualPct;
    @Column(name = "duration_months", nullable = false) private Integer durationMonths;
    @Column(name = "interest_rate_pct", nullable = false, precision = 5, scale = 2) private BigDecimal interestRatePct;
    @Column(name = "monthly_payment_cents", nullable = false) private Long monthlyPaymentCents;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;

    public String getId() { return id; } public void setId(String v) { this.id = v; }
    public String getCarId() { return carId; } public void setCarId(String v) { this.carId = v; }
    public String getClientId() { return clientId; } public void setClientId(String v) { this.clientId = v; }
    public String getOfferType() { return offerType; } public void setOfferType(String v) { this.offerType = v; }
    public Long getVehicleValueCents() { return vehicleValueCents; } public void setVehicleValueCents(Long v) { this.vehicleValueCents = v; }
    public Long getDownPaymentCents() { return downPaymentCents; } public void setDownPaymentCents(Long v) { this.downPaymentCents = v; }
    public Long getResidualValueCents() { return residualValueCents; } public void setResidualValueCents(Long v) { this.residualValueCents = v; }
    public BigDecimal getResidualPct() { return residualPct; } public void setResidualPct(BigDecimal v) { this.residualPct = v; }
    public Integer getDurationMonths() { return durationMonths; } public void setDurationMonths(Integer v) { this.durationMonths = v; }
    public BigDecimal getInterestRatePct() { return interestRatePct; } public void setInterestRatePct(BigDecimal v) { this.interestRatePct = v; }
    public Long getMonthlyPaymentCents() { return monthlyPaymentCents; } public void setMonthlyPaymentCents(Long v) { this.monthlyPaymentCents = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
}
