package com.supplypro.repository;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InboundOrderRepository extends JpaRepository<InboundOrder, Long>, JpaSpecificationExecutor<InboundOrder> {
    java.util.Optional<InboundOrder> findByPurchaseOrder(PurchaseOrder purchaseOrder);
    
    java.util.Optional<InboundOrder> findByInboundNo(String inboundNo);

    void deleteByWarehouseId(Long warehouseId);
    
    List<InboundOrder> findAllByStatus(InboundOrder.Status status);

    List<InboundOrder> findByPurchaseOrderIn(List<PurchaseOrder> purchaseOrders);
    
    List<InboundOrder> findByWarehouseId(Long warehouseId);
    
    List<InboundOrder> findByStatus(InboundOrder.Status status);
}
