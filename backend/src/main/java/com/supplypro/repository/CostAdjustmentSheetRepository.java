package com.supplypro.repository;

import com.supplypro.entity.CostAdjustmentSheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CostAdjustmentSheetRepository extends JpaRepository<CostAdjustmentSheet, Long>, JpaSpecificationExecutor<CostAdjustmentSheet> {
    boolean existsBySheetNo(String sheetNo);
    
    Optional<CostAdjustmentSheet> findBySheetNo(String sheetNo);
    
    List<CostAdjustmentSheet> findBySupplierId(Long supplierId);
    
    List<CostAdjustmentSheet> findByStatus(CostAdjustmentSheet.Status status);
    
    long countByStatusAndCreatedAtBetween(CostAdjustmentSheet.Status status, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT DISTINCT cai.purchaseOrderId FROM CostAdjustmentItem cai JOIN CostAdjustmentSheet cas ON cai.sheetId = cas.id WHERE cai.purchaseOrderId IN :purchaseOrderIds AND cas.status = :status")
    List<Long> findPurchaseOrderIdsWithPendingAdjustment(@Param("purchaseOrderIds") List<Long> purchaseOrderIds, @Param("status") CostAdjustmentSheet.Status status);
}
