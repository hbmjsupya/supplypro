package com.supplypro.repository;

import com.supplypro.entity.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {
    java.util.List<PurchaseOrderItem> findByPurchaseOrder(com.supplypro.entity.PurchaseOrder purchaseOrder);
    void deleteByProductId(Long productId);
    java.util.List<PurchaseOrderItem> findByPurchaseOrderId(Long purchaseOrderId);
}
