package com.supplypro.repository;

import com.supplypro.entity.ProductStatusChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductStatusChangeLogRepository extends JpaRepository<ProductStatusChangeLog, Long> {
    List<ProductStatusChangeLog> findByProductIdOrderByCreatedAtDesc(Long productId);
    void deleteByProductId(Long productId);
}
