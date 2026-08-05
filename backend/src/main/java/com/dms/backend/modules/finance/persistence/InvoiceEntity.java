package com.dms.backend.modules.finance.persistence;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity @Table(name = "invoice")
public class InvoiceEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "invoice_number", nullable = false, unique = true, length = 40) private String invoiceNumber;
    @Column(name = "client_id", nullable = false, length = 36) private String clientId;
    @Column(name = "reference_type", nullable = false, length = 30) private String referenceType;
    @Column(name = "reference_id", nullable = false, length = 36) private String referenceId;
    @Column(name = "amount_cents", nullable = false) private Long amountCents;
    @Column(nullable = false, length = 3) private String currency;
    @Column(nullable = false, length = 30) private String status;
    @Column(name = "issued_at") private OffsetDateTime issuedAt;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;

    public String getId() { return id; } public void setId(String v) { this.id = v; }
    public String getInvoiceNumber() { return invoiceNumber; } public void setInvoiceNumber(String v) { this.invoiceNumber = v; }
    public String getClientId() { return clientId; } public void setClientId(String v) { this.clientId = v; }
    public String getReferenceType() { return referenceType; } public void setReferenceType(String v) { this.referenceType = v; }
    public String getReferenceId() { return referenceId; } public void setReferenceId(String v) { this.referenceId = v; }
    public Long getAmountCents() { return amountCents; } public void setAmountCents(Long v) { this.amountCents = v; }
    public String getCurrency() { return currency; } public void setCurrency(String v) { this.currency = v; }
    public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
    public OffsetDateTime getIssuedAt() { return issuedAt; } public void setIssuedAt(OffsetDateTime v) { this.issuedAt = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(OffsetDateTime v) { this.updatedAt = v; }
}
