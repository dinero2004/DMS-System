package com.dms.backend.modules.sales.persistence;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity @Table(name = "sales_contract")
public class SalesContractEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "lead_id", nullable = false, length = 36) private String leadId;
    @Column(name = "client_id", nullable = false, length = 36) private String clientId;
    @Column(name = "car_id", length = 36) private String carId;
    @Column(name = "selling_price_cents", nullable = false) private Long sellingPriceCents;
    @Column(name = "insurance_company") private String insuranceCompany;
    @Column(name = "registration_plate", length = 64) private String registrationPlate;
    @Column(name = "contract_date", nullable = false) private LocalDate contractDate;
    @Column(columnDefinition = "TEXT") private String notes;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;

    public String getId() { return id; } public void setId(String v) { this.id = v; }
    public String getLeadId() { return leadId; } public void setLeadId(String v) { this.leadId = v; }
    public String getClientId() { return clientId; } public void setClientId(String v) { this.clientId = v; }
    public String getCarId() { return carId; } public void setCarId(String v) { this.carId = v; }
    public Long getSellingPriceCents() { return sellingPriceCents; } public void setSellingPriceCents(Long v) { this.sellingPriceCents = v; }
    public String getInsuranceCompany() { return insuranceCompany; } public void setInsuranceCompany(String v) { this.insuranceCompany = v; }
    public String getRegistrationPlate() { return registrationPlate; } public void setRegistrationPlate(String v) { this.registrationPlate = v; }
    public LocalDate getContractDate() { return contractDate; } public void setContractDate(LocalDate v) { this.contractDate = v; }
    public String getNotes() { return notes; } public void setNotes(String v) { this.notes = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(OffsetDateTime v) { this.updatedAt = v; }
}
