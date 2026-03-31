package com.dms.backend.modules.sales.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesContractRepository extends JpaRepository<SalesContractEntity, String> {
    List<SalesContractEntity> findAllByOrderByCreatedAtDesc();
}
