package com.supplypro.repository;

import com.supplypro.entity.SettlementOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SettlementOrderRepository extends JpaRepository<SettlementOrder, Long>, JpaSpecificationExecutor<SettlementOrder> {
    Page<SettlementOrder> findByType(SettlementOrder.Type type, Pageable pageable);
    Page<SettlementOrder> findByStatus(SettlementOrder.Status status, Pageable pageable);
    Page<SettlementOrder> findByTypeAndStatus(SettlementOrder.Type type, SettlementOrder.Status status, Pageable pageable);
    java.util.List<SettlementOrder> findByRelatedOrderNo(String relatedOrderNo);
    SettlementOrder findBySettlementNo(String settlementNo);
    SettlementOrder findByDeliveryNo(String deliveryNo);
    java.util.List<SettlementOrder> findByDeliveryNoContaining(String deliveryNo);
    java.util.List<SettlementOrder> findByDeliveryNoIn(java.util.List<String> deliveryNos);
    java.util.List<SettlementOrder> findByRelatedOrderNoAndType(String relatedOrderNo, SettlementOrder.Type type);
    java.util.List<SettlementOrder> findBySupplierName(String supplierName);
    
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(s.settlementNo, 15, 3) AS long)), 0) FROM SettlementOrder s WHERE s.settlementNo LIKE CONCAT(:prefix, '%')")
    Long findMaxSequenceByPrefix(@Param("prefix") String prefix);
    
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(s.deliveryNo, 17, 3) AS long)), 0) FROM SettlementOrder s WHERE s.deliveryNo LIKE CONCAT(:prefix, '%')")
    Long findMaxDeliverySequenceByPrefix(@Param("prefix") String prefix);
}
