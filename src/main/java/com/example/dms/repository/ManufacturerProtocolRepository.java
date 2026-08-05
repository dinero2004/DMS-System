package com.example.dms.repository;

import com.example.dms.entity.ManufacturerProtocol;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManufacturerProtocolRepository extends JpaRepository<ManufacturerProtocol, Long> {
    List<ManufacturerProtocol> findByManufacturerIgnoreCaseAndModelIgnoreCase(String manufacturer, String model);
}
