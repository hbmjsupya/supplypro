package com.supplypro.repository;

import com.supplypro.entity.PurchaseOrderLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderLogRepository extends JpaRepository<PurchaseOrderLog, Long> {
    List<PurchaseOrderLog> findByPurchaseOrderIdOrderByCreatedAtDesc(Long purchaseOrderId);
}
