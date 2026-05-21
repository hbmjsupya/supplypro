package com.supplypro.controller;

import com.supplypro.entity.StockBatch;
import com.supplypro.entity.StockFlow;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.RefundOrder;
import com.supplypro.repository.StockBatchRepository;
import com.supplypro.repository.StockFlowRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.RefundOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private StockFlowRepository stockFlowRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private RefundOrderRepository refundOrderRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(required = false) String warehouseCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String specName,
            @RequestParam(required = false) String batchNo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        
        Specification<StockBatch> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (warehouseCode != null && !warehouseCode.isEmpty()) {
                predicates.add(cb.equal(root.get("warehouse").get("code"), warehouseCode));
            }
            if (productName != null && !productName.isEmpty()) {
                predicates.add(cb.like(root.get("product").get("name"), "%" + productName + "%"));
            }
            if (specName != null && !specName.isEmpty()) {
                predicates.add(cb.like(root.get("sku").get("specification"), "%" + specName + "%"));
            }
            if (batchNo != null && !batchNo.isEmpty()) {
                predicates.add(cb.like(root.get("batchNo"), "%" + batchNo + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        Page<StockBatch> pageResult = stockBatchRepository.findAll(spec, PageRequest.of(page, size));
        
        // 计算每个商品规格的结存成本（从StockBatch批次记录计算：Σ(unitCost × availableQuantity))
        Map<String, BigDecimal> productCostMap = new HashMap<>();
        
        for (StockBatch batch : pageResult.getContent()) {
            if (batch.getWarehouse() != null && batch.getProduct() != null && batch.getUnitCost() != null && batch.getAvailableQuantity() != null) {
                String warehouseCodeKey = batch.getWarehouse().getCode();
                Long productId = batch.getProduct().getId();
                String specNameKey = batch.getSku() != null && batch.getSku().getSpecification() != null ? 
                    batch.getSku().getSpecification() : "-";
                String key = warehouseCodeKey + "_" + productId + "_" + specNameKey;
                
                BigDecimal batchCost = batch.getUnitCost().multiply(BigDecimal.valueOf(batch.getAvailableQuantity()));
                productCostMap.merge(key, batchCost, BigDecimal::add);
            }
        }
        
        // 构建返回数据，添加结存成本字段
        List<Map<String, Object>> recordsWithCost = new ArrayList<>();
        for (StockBatch batch : pageResult.getContent()) {
            Map<String, Object> batchMap = new HashMap<>();
            batchMap.put("id", batch.getId());
            batchMap.put("batchNo", batch.getBatchNo());
            
            Map<String, Object> warehouseMap = new HashMap<>();
            if (batch.getWarehouse() != null) {
                warehouseMap.put("id", batch.getWarehouse().getId());
                warehouseMap.put("code", batch.getWarehouse().getCode());
                warehouseMap.put("name", batch.getWarehouse().getName());
            }
            batchMap.put("warehouse", warehouseMap);
            
            Map<String, Object> productMap = new HashMap<>();
            if (batch.getProduct() != null) {
                productMap.put("id", batch.getProduct().getId());
                productMap.put("name", batch.getProduct().getName());
                productMap.put("sku", batch.getProduct().getSkuCode());
            }
            batchMap.put("product", productMap);
            
            Map<String, Object> skuMap = new HashMap<>();
            if (batch.getSku() != null) {
                skuMap.put("id", batch.getSku().getId());
                skuMap.put("skuCode", batch.getSku().getSkuCode());
                String specification = batch.getSku().getName() != null ? 
                    batch.getSku().getName() : batch.getSku().getSpecification();
                skuMap.put("specification", specification);
                skuMap.put("name", batch.getSku().getName());
            }
            batchMap.put("sku", skuMap);
            
            batchMap.put("quantity", batch.getQuantity());
            batchMap.put("availableQuantity", batch.getAvailableQuantity());
            batchMap.put("lockedQuantity", batch.getLockedQuantity() != null ? batch.getLockedQuantity() : 0);
            batchMap.put("availableForShip", batch.getAvailableQuantity() - (batch.getLockedQuantity() != null ? batch.getLockedQuantity() : 0));
            batchMap.put("unitCost", batch.getUnitCost());
            batchMap.put("totalCost", batch.getTotalCost());
            batchMap.put("expiryDate", batch.getExpiryDate());
            batchMap.put("status", batch.getStatus());
            batchMap.put("createdAt", batch.getCreatedAt());
            batchMap.put("updatedAt", batch.getUpdatedAt());
            
            // 添加采购单号
            if (batch.getPurchaseOrderId() != null) {
                PurchaseOrder po = purchaseOrderRepository.findById(batch.getPurchaseOrderId()).orElse(null);
                if (po != null) {
                    batchMap.put("purchaseOrderId", po.getId());
                    batchMap.put("purchaseOrderNo", po.getOrderNo());
                }
            }
            
            if (batch.getBatchNo() != null && batch.getBatchNo().startsWith("T")) {
                RefundOrder ro = refundOrderRepository.findByRefundNo(batch.getBatchNo());
                if (ro != null) {
                    batchMap.put("purchaseOrderNo", ro.getRefundNo());
                    batchMap.put("purchaseOrderId", ro.getId());
                }
            }
            
            // 添加从StockFlow计算的结存成本
            String warehouseCodeKey = batch.getWarehouse() != null ? batch.getWarehouse().getCode() : "";
            Long productId = batch.getProduct() != null ? batch.getProduct().getId() : null;
            String specNameKey = batch.getSku() != null && batch.getSku().getSpecification() != null ? 
                batch.getSku().getSpecification() : "-";
            String key = warehouseCodeKey + "_" + productId + "_" + specNameKey;
            
            batchMap.put("balanceCost", productCostMap.getOrDefault(key, BigDecimal.ZERO));
            
            recordsWithCost.add(batchMap);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", recordsWithCost,
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }
}
