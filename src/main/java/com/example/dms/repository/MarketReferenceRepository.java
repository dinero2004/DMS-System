package com.example.dms.repository;

import com.example.dms.entity.MarketReference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MarketReferenceRepository extends JpaRepository<MarketReference, Long> {
    List<MarketReference> findByManufacturerIgnoreCaseAndModelIgnoreCase(String manufacturer, String model);

    boolean existsByManufacturerIgnoreCaseAndModelIgnoreCaseAndModelYearAndSource(
            String manufacturer,
            String model,
            Integer modelYear,
            String source
    );
}
