package com.dms.backend.modules.workshop.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkshopJobRepository extends JpaRepository<WorkshopJobEntity, String> {
    List<WorkshopJobEntity> findAllByOrderByCreatedAtDesc();
}
