package com.dms.backend.modules.finance.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, String> {
    List<InvoiceEntity> findAllByOrderByCreatedAtDesc();
}
