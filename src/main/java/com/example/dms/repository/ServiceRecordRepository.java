package com.example.dms.repository;

import com.example.dms.entity.ServiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceRecordRepository extends JpaRepository<ServiceRecord, Long> {
    List<ServiceRecord> findByVehicleId(Long vehicleId);
}
