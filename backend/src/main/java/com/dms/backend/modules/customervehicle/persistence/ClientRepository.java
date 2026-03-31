package com.dms.backend.modules.customervehicle.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClientRepository extends JpaRepository<ClientEntity, String> {

    @Query("SELECT c FROM ClientEntity c WHERE " +
        "LOWER(c.firstName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
        "LOWER(c.lastName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
        "LOWER(c.email) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
        "LOWER(c.phone) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<ClientEntity> searchByQuery(@Param("q") String query);
}
