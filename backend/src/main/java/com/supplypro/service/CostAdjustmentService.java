package com.supplypro.service;

import com.supplypro.entity.CostAdjustmentSheet;
import com.supplypro.entity.CostAdjustmentItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface CostAdjustmentService {
    
    CostAdjustmentSheet createSingleAdjustment(Long purchaseOrderId, BigDecimal newCost, String reason);
    
    Map<String, Object> batchAdjustWithValidation(List<Map<String, Object>> adjustments);
    
    CostAdjustmentSheet approve(Long id, String operator);
    
    CostAdjustmentSheet reject(Long id, String reason, String operator);
    
    CostAdjustmentSheet revoke(Long id, String operator);
    
    CostAdjustmentSheet getById(Long id);
    
    CostAdjustmentSheet getBySheetNo(String sheetNo);
    
    Page<CostAdjustmentSheet> list(String sheetNo, String supplierName, CostAdjustmentSheet.Status status, Pageable pageable);
    
    String generateSheetNo();
    
    List<Long> getPurchaseOrderIdsWithPendingAdjustment(List<Long> purchaseOrderIds);
    
    void resetAdjustmentByPoNos(List<String> poNos);
    
    List<CostAdjustmentItem> getItemsBySheetId(Long sheetId);
    
    List<CostAdjustmentItem> getItemsByPurchaseOrderId(Long purchaseOrderId);
    
    List<CostAdjustmentSheet> getByPurchaseOrderId(Long purchaseOrderId);
}
