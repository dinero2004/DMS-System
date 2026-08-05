package com.dms.backend.modules.finance.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, String> {
    List<InvoiceEntity> findAllByOrderByCreatedAtDesc();

    /** Next INV-###### suffix; works on PostgreSQL and H2 (no PostgreSQL-only sequence required). */
    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTR(invoice_number, 5) AS BIGINT)), 0) + 1 FROM invoice", nativeQuery = true)
    long computeNextInvoiceSequenceValue();
}
