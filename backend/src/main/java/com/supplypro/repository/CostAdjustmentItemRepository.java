package com.supplypro.repository;

import com.supplypro.entity.CostAdjustmentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CostAdjustmentItemRepository extends JpaRepository<CostAdjustmentItem, Long>, JpaSpecificationExecutor<CostAdjustmentItem> {
    List<CostAdjustmentItem> findBySheetId(Long sheetId);
    List<CostAdjustmentItem> findByPurchaseOrderId(Long purchaseOrderId);
    List<CostAdjustmentItem> findByPoNo(String poNo);
    
    @Query("SELECT cai.purchaseOrderId FROM CostAdjustmentItem cai JOIN CostAdjustmentSheet cas ON cai.sheetId = cas.id WHERE cai.purchaseOrderId IN :purchaseOrderIds AND cas.status = :status")
    List<Long> findPurchaseOrderIdsWithPendingAdjustment(@Param("purchaseOrderIds") List<Long> purchaseOrderIds, @Param("status") com.supplypro.entity.CostAdjustmentSheet.Status status);
}
