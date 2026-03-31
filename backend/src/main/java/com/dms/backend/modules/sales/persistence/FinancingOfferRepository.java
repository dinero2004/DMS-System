package com.dms.backend.modules.sales.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinancingOfferRepository extends JpaRepository<FinancingOfferEntity, String> {
    List<FinancingOfferEntity> findAllByOrderByCreatedAtDesc();
}
