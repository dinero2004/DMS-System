package com.dms.backend.modules.sales.persistence;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity @Table(name = "sales_lead")
public class SalesLeadEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "client_id", nullable = false, length = 36) private String clientId;
    @Column(name = "car_id", length = 36) private String carId;
    @Column(nullable = false, length = 30) private String status;
    @Column(name = "interest_model") private String interestModel;
    @Column(columnDefinition = "TEXT") private String notes;
    @Column(name = "lead_source", length = 120) private String leadSource;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;

    public String getId() { return id; } public void setId(String id) { this.id = id; }
    public String getClientId() { return clientId; } public void setClientId(String v) { this.clientId = v; }
    public String getCarId() { return carId; } public void setCarId(String v) { this.carId = v; }
    public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
    public String getInterestModel() { return interestModel; } public void setInterestModel(String v) { this.interestModel = v; }
    public String getNotes() { return notes; } public void setNotes(String v) { this.notes = v; }
    public String getLeadSource() { return leadSource; } public void setLeadSource(String v) { this.leadSource = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(OffsetDateTime v) { this.updatedAt = v; }
}
