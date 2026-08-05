package com.dms.backend.modules.sales.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesLeadRepository extends JpaRepository<SalesLeadEntity, String> {
    List<SalesLeadEntity> findAllByOrderByCreatedAtDesc();
}
