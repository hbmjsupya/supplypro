package com.supplypro.repository;

import com.supplypro.entity.StockBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockBatchRepository extends JpaRepository<StockBatch, Long>, JpaSpecificationExecutor<StockBatch> {
    List<StockBatch> findByWarehouseIdAndProductIdAndStatusOrderByExpiryDateAsc(Long warehouseId, Long productId, StockBatch.Status status);

    List<StockBatch> findByProductId(Long productId);

    List<StockBatch> findByPurchaseOrderId(Long purchaseOrderId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(sb.availableQuantity), 0) FROM StockBatch sb WHERE sb.product.id = :productId AND sb.status = 'ACTIVE'")
    Integer sumAvailableQuantityByProductId(@org.springframework.web.bind.annotation.RequestParam("productId") Long productId);

    boolean existsByProductIdAndWarehouseId(Long productId, Long warehouseId);

    void deleteByProductId(Long productId);
    void deleteByWarehouseId(Long warehouseId);

    @org.springframework.data.jpa.repository.Query("SELECT sb FROM StockBatch sb WHERE sb.warehouse.id = :warehouseId AND sb.sku.id = :skuId AND sb.status = 'ACTIVE'")
    List<StockBatch> findByWarehouseIdAndSkuId(Long warehouseId, Long skuId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(sb.quantity), 0) FROM StockBatch sb WHERE sb.warehouse.id = :warehouseId AND sb.sku.id = :skuId AND sb.status = 'ACTIVE'")
    Integer sumQuantityByWarehouseIdAndSkuId(Long warehouseId, Long skuId);

    @org.springframework.data.jpa.repository.Query("SELECT sb FROM StockBatch sb LEFT JOIN FETCH sb.sku WHERE sb.id = :id")
    java.util.Optional<StockBatch> findByIdWithSku(Long id);
}
