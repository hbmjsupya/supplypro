package com.supplypro.controller;

import com.supplypro.entity.StockFlow;
import com.supplypro.entity.CostAdjustmentSheet;
import com.supplypro.entity.CostAdjustmentItem;
import com.supplypro.entity.Sku;
import com.supplypro.entity.StockBatch;
import com.supplypro.entity.Warehouse;
import com.supplypro.entity.Product;
import com.supplypro.repository.StockFlowRepository;
import com.supplypro.repository.CostAdjustmentSheetRepository;
import com.supplypro.repository.CostAdjustmentItemRepository;
import com.supplypro.repository.SkuRepository;
import com.supplypro.repository.StockBatchRepository;
import com.supplypro.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/stock-flows")
@CrossOrigin(origins = "*")
public class StockFlowController {

    @Autowired
    private StockFlowRepository stockFlowRepository;

    @Autowired
    private CostAdjustmentSheetRepository costAdjustmentSheetRepository;

    @Autowired
    private CostAdjustmentItemRepository costAdjustmentItemRepository;

    @Autowired
    private SkuRepository skuRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EntityManager entityManager;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String warehouseName,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String specName,
            @RequestParam(required = false) String batchNo,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        // 结存数量和结存成本始终按分仓+商品+规格分组计算
        String partitionBy = "sf.warehouse_id, sf.product_id, sf.spec_name";
        
        // 使用SQL窗口函数计算累计值
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT sf.id, sf.warehouse_id, sf.product_id, sf.sku_id, sf.spec_name, sf.batch_no, ");
        sql.append("sf.flow_type, sf.quantity, sf.balance_after, sf.reference_no, sf.related_sheet_no, ");
        sql.append("sf.reason, sf.operator, sf.unit_cost, sf.total_cost, sf.cost_change, sf.created_at, ");
        
        // 使用窗口函数计算累计数量
        sql.append("SUM(sf.quantity) ");
        sql.append("OVER (PARTITION BY ").append(partitionBy).append(" ORDER BY sf.created_at, sf.id) AS balance_quantity, ");
        
        // 使用窗口函数计算累计成本
        sql.append("SUM(COALESCE(sf.cost_change, 0)) ");
        sql.append("OVER (PARTITION BY ").append(partitionBy).append(" ORDER BY sf.created_at, sf.id) AS balance_cost ");
        
        sql.append("FROM stock_flows sf ");
        sql.append("INNER JOIN warehouses w ON sf.warehouse_id = w.id ");
        sql.append("INNER JOIN products p ON sf.product_id = p.id ");
        sql.append("LEFT JOIN skus s ON sf.sku_id = s.id ");
        sql.append("WHERE 1=1 ");
        
        List<Object> params = new ArrayList<>();
        
        if (warehouseName != null && !warehouseName.isEmpty()) {
            sql.append("AND w.name LIKE ? ");
            params.add("%" + warehouseName + "%");
        }
        if (productName != null && !productName.isEmpty()) {
            sql.append("AND p.name LIKE ? ");
            params.add("%" + productName + "%");
        }
        if (specName != null && !specName.isEmpty()) {
            sql.append("AND (sf.spec_name LIKE ? OR s.specification LIKE ?) ");
            params.add("%" + specName + "%");
            params.add("%" + specName + "%");
        }
        if (batchNo != null && !batchNo.isEmpty()) {
            sql.append("AND sf.batch_no LIKE ? ");
            params.add("%" + batchNo + "%");
        }
        if (type != null && !type.isEmpty()) {
            sql.append("AND sf.flow_type = ? ");
            params.add(type);
        }
        if (startDate != null && !startDate.isEmpty()) {
            sql.append("AND sf.created_at >= ? ");
            params.add(LocalDate.parse(startDate).atStartOfDay());
        }
        if (endDate != null && !endDate.isEmpty()) {
            sql.append("AND sf.created_at <= ? ");
            params.add(LocalDate.parse(endDate).plusDays(1).atStartOfDay());
        }
        
        // 查询总数
        String countSql = "SELECT COUNT(*) FROM (" + sql.toString() + ") AS total";
        Query countQuery = entityManager.createNativeQuery(countSql);
        for (int i = 0; i < params.size(); i++) {
            countQuery.setParameter(i + 1, params.get(i));
        }
        Long total = ((Number) countQuery.getSingleResult()).longValue();
        
        // 查询分页数据
        sql.append("ORDER BY sf.created_at DESC LIMIT ? OFFSET ?");
        params.add(size);
        params.add(page * size);
        
        Query query = entityManager.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        List<Map<String, Object>> recordsWithSummary = new ArrayList<>();
        
        // 处理查询结果
        for (Object[] row : results) {
            Map<String, Object> recordMap = new HashMap<>();
            Long flowId = ((Number) row[0]).longValue();
            Long warehouseId = row[1] != null ? ((Number) row[1]).longValue() : null;
            Long productId = row[2] != null ? ((Number) row[2]).longValue() : null;
            Long skuId = row[3] != null ? ((Number) row[3]).longValue() : null;
            String rowSpecName = (String) row[4];
            String rowBatchNo = (String) row[5];
            String flowType = (String) row[6];
            Integer quantity = row[7] != null ? ((Number) row[7]).intValue() : null;
            Integer balanceAfter = row[8] != null ? ((Number) row[8]).intValue() : null;
            String referenceNo = (String) row[9];
            String relatedSheetNo = (String) row[10];
            String reason = (String) row[11];
            String operator = (String) row[12];
            BigDecimal unitCost = (BigDecimal) row[13];
            BigDecimal totalCost = (BigDecimal) row[14];
            BigDecimal costChange = (BigDecimal) row[15];
            java.util.Date createdAt = (java.util.Date) row[16];
            Integer balanceQuantity = row[17] != null ? ((Number) row[17]).intValue() : 0;
            BigDecimal balanceCost = (BigDecimal) row[18];
            
            recordMap.put("id", flowId);
            
            // 只返回需要的字段，避免序列化Hibernate代理对象
            Map<String, Object> warehouseMap = new HashMap<>();
            if (warehouseId != null) {
                warehouseMap.put("id", warehouseId);
                Warehouse warehouse = entityManager.find(Warehouse.class, warehouseId);
                if (warehouse != null) {
                    warehouseMap.put("name", warehouse.getName());
                    warehouseMap.put("code", warehouse.getCode());
                }
            }
            recordMap.put("warehouse", warehouseMap);
            
            Map<String, Object> productMap = new HashMap<>();
            if (productId != null) {
                productMap.put("id", productId);
                Product product = entityManager.find(Product.class, productId);
                if (product != null) {
                    productMap.put("name", product.getName());
                    productMap.put("skuCode", product.getSkuCode());
                }
            }
            recordMap.put("product", productMap);
            
            Map<String, Object> skuMap = new HashMap<>();
            if (skuId != null) {
                skuMap.put("id", skuId);
                Sku sku = entityManager.find(Sku.class, skuId);
                if (sku != null) {
                    skuMap.put("skuCode", sku.getSkuCode());
                    skuMap.put("name", sku.getName());
                    String specification = sku.getName() != null ? 
                        sku.getName() : sku.getSpecification();
                    skuMap.put("specification", specification);
                }
            }
            recordMap.put("sku", skuMap);
            
            recordMap.put("specName", rowSpecName);
            recordMap.put("batchNo", rowBatchNo);
            recordMap.put("flowType", flowType);
            recordMap.put("quantity", quantity);
            recordMap.put("balanceAfter", balanceAfter);
            recordMap.put("referenceNo", referenceNo);
            recordMap.put("relatedSheetNo", relatedSheetNo);
            recordMap.put("reason", reason);
            recordMap.put("operator", operator);
            recordMap.put("unitCost", unitCost);
            recordMap.put("totalCost", totalCost);
            recordMap.put("costChange", costChange);
            recordMap.put("createdAt", createdAt);
            recordMap.put("balanceQuantity", balanceQuantity);
            recordMap.put("balanceCost", balanceCost != null ? balanceCost : BigDecimal.ZERO);
            
            recordsWithSummary.add(recordMap);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", recordsWithSummary,
            "total", total
        ));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/fix-adjustment-sku")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixAdjustmentSku() {
        try {
            List<StockFlow> adjustmentFlows = stockFlowRepository.findAll().stream()
                .filter(s -> s.getFlowType() == StockFlow.FlowType.COST_ADJUSTMENT)
                .filter(s -> s.getSku() == null)
                .collect(java.util.stream.Collectors.toList());
            
            int updated = 0;
            List<String> updateDetails = new ArrayList<>();
            
            for (StockFlow flow : adjustmentFlows) {
                // 优先使用relatedSheetNo，如果没有则使用referenceNo
                String sheetNo = flow.getRelatedSheetNo();
                if (sheetNo == null || sheetNo.isEmpty()) {
                    sheetNo = flow.getReferenceNo();
                }
                if (sheetNo == null || sheetNo.isEmpty()) {
                    continue;
                }
                
                // 查找调价单
                Optional<CostAdjustmentSheet> sheetOpt = costAdjustmentSheetRepository.findBySheetNo(sheetNo);
                if (sheetOpt.isPresent()) {
                    CostAdjustmentSheet sheet = sheetOpt.get();
                    List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheet.getId());
                    
                    // 根据产品ID找到匹配的调价单item
                    CostAdjustmentItem matchedItem = null;
                    if (flow.getProduct() != null) {
                        for (CostAdjustmentItem item : items) {
                            if (item.getProductId() != null && item.getProductId().equals(flow.getProduct().getId())) {
                                matchedItem = item;
                                break;
                            }
                        }
                    }
                    // 如果没找到匹配的，使用第一个item
                    if (matchedItem == null && !items.isEmpty()) {
                        matchedItem = items.get(0);
                    }
                    
                    String specName = matchedItem != null ? matchedItem.getSpecName() : "";
                    
                    // 设置specName
                    flow.setSpecName(specName);
                    // 修复referenceNo为调价单号
                    flow.setReferenceNo(sheetNo);
                    
                    // 查找匹配的SKU
                    if (flow.getProduct() != null && specName != null && !specName.isEmpty()) {
                        Product product = productRepository.findById(flow.getProduct().getId()).orElse(null);
                        if (product != null && product.getSkus() != null) {
                            Sku matchedSku = product.getSkus().stream()
                                    .filter(s -> specName.equals(s.getSpecification()))
                                    .findFirst()
                                    .orElse(null);
                            if (matchedSku != null) {
                                flow.setSku(matchedSku);
                                
                                // 计算当前库存结存数量
                                if (flow.getWarehouse() != null) {
                                    Integer balance = stockBatchRepository.sumQuantityByWarehouseIdAndSkuId(
                                            flow.getWarehouse().getId(), matchedSku.getId());
                                    int currentBalance = balance != null ? balance : 0;
                                    flow.setBalanceAfter(currentBalance);
                                }
                            }
                        }
                    }
                    
                    stockFlowRepository.save(flow);
                    
                    updated++;
                    updateDetails.add(String.format("StockFlow ID %d: 设置specName=%s, referenceNo=%s, balanceAfter=%d", 
                        flow.getId(), specName, sheetNo, flow.getBalanceAfter()));
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "修复完成");
            response.put("updated", updated);
            response.put("details", updateDetails);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "修复失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/fix-cost-data")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixCostData() {
        try {
            List<StockFlow> allFlows = stockFlowRepository.findAll();
            
            int updated = 0;
            List<String> updateDetails = new ArrayList<>();
            
            for (StockFlow flow : allFlows) {
                if (flow.getFlowType() == StockFlow.FlowType.INBOUND) {
                    // 入库记录：从StockBatch获取成本
                    if (flow.getStockBatch() != null && flow.getUnitCost() == null) {
                        StockBatch batch = flow.getStockBatch();
                        BigDecimal unitCost = batch.getUnitCost();
                        Integer quantity = flow.getQuantity();
                        BigDecimal totalCost = unitCost != null ? unitCost.multiply(new BigDecimal(quantity != null ? quantity : 0)) : BigDecimal.ZERO;
                        
                        flow.setUnitCost(unitCost);
                        flow.setTotalCost(totalCost);
                        flow.setCostChange(totalCost);
                        stockFlowRepository.save(flow);
                        
                        updated++;
                        updateDetails.add(String.format("INBOUND ID %d: unitCost=%s, totalCost=%s", 
                            flow.getId(), unitCost, totalCost));
                    }
                } else if (flow.getFlowType() == StockFlow.FlowType.OUTBOUND) {
                    // 出库记录：从StockBatch获取成本
                    if (flow.getStockBatch() != null && flow.getUnitCost() == null) {
                        StockBatch batch = flow.getStockBatch();
                        BigDecimal unitCost = batch.getUnitCost();
                        Integer quantity = flow.getQuantity();
                        BigDecimal totalCost = unitCost != null ? unitCost.multiply(new BigDecimal(quantity != null ? quantity : 0)) : BigDecimal.ZERO;
                        
                        flow.setUnitCost(unitCost);
                        flow.setTotalCost(totalCost);
                        flow.setCostChange(totalCost.negate());
                        stockFlowRepository.save(flow);
                        
                        updated++;
                        updateDetails.add(String.format("OUTBOUND ID %d: unitCost=%s, totalCost=%s", 
                            flow.getId(), unitCost, totalCost));
                    }
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "修复完成");
            response.put("updated", updated);
            response.put("details", updateDetails);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "修复失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/fix-spec-name")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixSpecName() {
        try {
            List<StockFlow> allFlows = stockFlowRepository.findAll();
            
            int updated = 0;
            List<String> updateDetails = new ArrayList<>();
            
            for (StockFlow flow : allFlows) {
                if (flow.getSpecName() == null || flow.getSpecName().isEmpty() || "-".equals(flow.getSpecName())) {
                    String specName = null;
                    
                    if (flow.getSku() != null) {
                        if (flow.getSku().getName() != null && !flow.getSku().getName().isEmpty()) {
                            specName = flow.getSku().getName();
                        } else if (flow.getSku().getSpecification() != null && !flow.getSku().getSpecification().isEmpty()) {
                            specName = flow.getSku().getSpecification();
                        }
                    }
                    if (specName == null && flow.getStockBatch() != null && flow.getStockBatch().getSku() != null) {
                        if (flow.getStockBatch().getSku().getName() != null && !flow.getStockBatch().getSku().getName().isEmpty()) {
                            specName = flow.getStockBatch().getSku().getName();
                        } else if (flow.getStockBatch().getSku().getSpecification() != null && !flow.getStockBatch().getSku().getSpecification().isEmpty()) {
                            specName = flow.getStockBatch().getSku().getSpecification();
                        }
                    }
                    if (specName == null || specName.isEmpty()) {
                        specName = "-";
                    }
                    
                    flow.setSpecName(specName);
                    stockFlowRepository.save(flow);
                    
                    updated++;
                    updateDetails.add(String.format("ID %d: specName=%s", flow.getId(), specName));
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "修复specName完成");
            response.put("updated", updated);
            response.put("details", updateDetails);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "修复specName失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/fix-spec-name-v2")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixSpecNameV2() {
        try {
            List<StockFlow> allFlows = stockFlowRepository.findAll();
            
            int updated = 0;
            List<String> updateDetails = new ArrayList<>();
            
            for (StockFlow flow : allFlows) {
                String currentSpecName = flow.getSpecName();
                boolean needsUpdate = currentSpecName == null || 
                                      currentSpecName.trim().isEmpty() || 
                                      "-".equals(currentSpecName.trim());
                
                if (needsUpdate) {
                    String specName = null;
                    
                    if (flow.getSku() != null) {
                        String skuName = flow.getSku().getName();
                        String skuSpec = flow.getSku().getSpecification();
                        
                        if (skuName != null && !skuName.trim().isEmpty()) {
                            specName = skuName;
                        } else if (skuSpec != null && !skuSpec.trim().isEmpty()) {
                            specName = skuSpec;
                        }
                    }
                    
                    if (specName == null && flow.getStockBatch() != null && flow.getStockBatch().getSku() != null) {
                        String skuName = flow.getStockBatch().getSku().getName();
                        String skuSpec = flow.getStockBatch().getSku().getSpecification();
                        
                        if (skuName != null && !skuName.trim().isEmpty()) {
                            specName = skuName;
                        } else if (skuSpec != null && !skuSpec.trim().isEmpty()) {
                            specName = skuSpec;
                        }
                    }
                    
                    if (specName == null || specName.trim().isEmpty()) {
                        specName = "-";
                    }
                    
                    flow.setSpecName(specName);
                    stockFlowRepository.save(flow);
                    
                    updated++;
                    updateDetails.add(String.format("ID %d: %s -> %s", flow.getId(), currentSpecName, specName));
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "修复specName完成");
            response.put("updated", updated);
            response.put("details", updateDetails);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "修复specName失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/recalculate-balance")
    @Transactional
    public ResponseEntity<Map<String, Object>> recalculateBalance() {
        try {
            List<StockFlow> allFlows = stockFlowRepository.findAll();
            
            Map<Long, List<StockFlow>> skuFlowsMap = new HashMap<>();
            
            for (StockFlow flow : allFlows) {
                Long skuId = flow.getSku() != null ? flow.getSku().getId() : 0L;
                skuFlowsMap.computeIfAbsent(skuId, k -> new ArrayList<>())
                    .add(flow);
            }
            
            int totalUpdated = 0;
            List<String> details = new ArrayList<>();
            
            for (Map.Entry<Long, List<StockFlow>> entry : skuFlowsMap.entrySet()) {
                List<StockFlow> flows = entry.getValue();
                flows.sort((a, b) -> a.getId().compareTo(b.getId()));
                
                int runningBalance = 0;
                for (StockFlow flow : flows) {
                    int qty = flow.getQuantity();
                    runningBalance += qty;
                    flow.setBalanceAfter(runningBalance);
                    stockFlowRepository.save(flow);
                    
                    totalUpdated++;
                    details.add(String.format("SKU %d, Flow %d: qty=%d, balance=%d", 
                        entry.getKey(), flow.getId(), qty, runningBalance));
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "重新计算结存数量完成");
            response.put("updated", totalUpdated);
            response.put("details", details);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "重新计算结存数量失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
