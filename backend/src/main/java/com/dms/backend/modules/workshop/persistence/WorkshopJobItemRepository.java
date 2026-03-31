package com.dms.backend.modules.workshop.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkshopJobItemRepository extends JpaRepository<WorkshopJobItemEntity, String> {
    List<WorkshopJobItemEntity> findByJobIdOrderByCreatedAtAsc(String jobId);
    void deleteByJobId(String jobId);
}
