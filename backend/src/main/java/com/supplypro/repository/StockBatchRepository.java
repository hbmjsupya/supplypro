package com.supplypro.repository;

import com.supplypro.entity.StockBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockBatchRepository extends JpaRepository<StockBatch, Long>, JpaSpecificationExecutor<StockBatch> {
    List<StockBatch> findByWarehouseIdAndProductIdAndStatusOrderByExpiryDateAsc(Long warehouseId, Long productId, StockBatch.Status status);
}
