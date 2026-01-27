package com.supplypro.repository;

import com.supplypro.entity.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {
    Page<PurchaseOrder> findByOrderNoContaining(String orderNo, Pageable pageable);
    PurchaseOrder findByOrderNo(String orderNo);
    List<PurchaseOrder> findBySettlementStatusNot(PurchaseOrder.SettlementStatus status);
}
