package com.example.dms.repository;

import com.example.dms.entity.VehicleValuation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleValuationRepository extends JpaRepository<VehicleValuation, Long> {
    List<VehicleValuation> findByVehicleId(Long vehicleId);
}
