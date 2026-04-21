package com.supplypro.repository;

import com.supplypro.entity.ProductTaxChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductTaxChangeLogRepository extends JpaRepository<ProductTaxChangeLog, Long> {
    List<ProductTaxChangeLog> findByProductIdOrderByCreatedAtDesc(Long productId);
    void deleteByProductId(Long productId);
}
