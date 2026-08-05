package com.dms.backend.modules.customervehicle.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CarRepository extends JpaRepository<CarEntity, String> {
    List<CarEntity> findByClientId(String clientId);
    Optional<CarEntity> findByVin(String vin);
}
