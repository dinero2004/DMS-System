package com.dms.backend.modules.workshop.persistence;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

@Entity
@Table(name = "workshop_job_item")
public class WorkshopJobItemEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "job_id", nullable = false, length = 36) private String jobId;
    @Column(name = "item_type", nullable = false, length = 20) private String itemType;
    @Column(name = "art_nr", length = 20) private String artNr;
    @Column(nullable = false, length = 200) private String name;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal quantity = BigDecimal.ONE;
    @Column(length = 20) private String unit = "Stk";
    @Column(name = "unit_price_cents", nullable = false) private Long unitPriceCents = 0L;
    @Column(name = "discount_pct", precision = 5, scale = 2) private BigDecimal discountPct = BigDecimal.ZERO;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;

    public long computeTotal() {
        BigDecimal q = quantity != null ? quantity : BigDecimal.ONE;
        BigDecimal up = BigDecimal.valueOf(unitPriceCents != null ? unitPriceCents : 0);
        BigDecimal disc = discountPct != null && discountPct.compareTo(BigDecimal.ZERO) > 0
            ? BigDecimal.ONE.subtract(discountPct.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
            : BigDecimal.ONE;
        return q.multiply(up).multiply(disc).setScale(0, RoundingMode.HALF_UP).longValue();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }
    public String getArtNr() { return artNr; }
    public void setArtNr(String artNr) { this.artNr = artNr; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public Long getUnitPriceCents() { return unitPriceCents; }
    public void setUnitPriceCents(Long unitPriceCents) { this.unitPriceCents = unitPriceCents; }
    public BigDecimal getDiscountPct() { return discountPct; }
    public void setDiscountPct(BigDecimal discountPct) { this.discountPct = discountPct; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
