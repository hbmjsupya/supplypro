package com.supplypro.service.impl;

import com.supplypro.entity.*;
import com.supplypro.repository.*;
import com.supplypro.service.CostAdjustmentService;
import com.supplypro.service.PurchaseOrderSnapshotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.context.annotation.Lazy;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;

import javax.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class CostAdjustmentServiceImpl implements CostAdjustmentService {

    @Autowired
    private CostAdjustmentSheetRepository costAdjustmentSheetRepository;

    @Autowired
    private CostAdjustmentItemRepository costAdjustmentItemRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private StockFlowRepository stockFlowRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private SkuRepository skuRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PurchaseOrderSnapshotService snapshotService;

    @Override
    @Transactional
    public CostAdjustmentSheet createSingleAdjustment(Long purchaseOrderId, BigDecimal newCost, String reason) {
        if (newCost != null && newCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("调价后成本价不能小于0");
        }

        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("采购单不存在: " + purchaseOrderId));

        if (po.getItems() == null || po.getItems().isEmpty()) {
            throw new RuntimeException("采购单无商品明细");
        }

        List<Long> poIds = Arrays.asList(purchaseOrderId);
        List<Long> pendingIds = getPurchaseOrderIdsWithPendingAdjustment(poIds);
        if (!pendingIds.isEmpty()) {
            throw new RuntimeException("该采购单存在待审批的调价单，不可重复发起调价");
        }

        PurchaseOrderItem item = po.getItems().get(0);
        BigDecimal oldCost = item.getUnitPrice();
        Integer quantity = item.getQuantity();
        BigDecimal unitDiff = newCost.subtract(oldCost);
        BigDecimal totalDiff = unitDiff.multiply(new BigDecimal(quantity));

        // Find SKU by specification
        Long skuId = null;
        String skuCode = null;
        if (item.getProductId() != null) {
            Product product = productRepository.findById(item.getProductId()).orElse(null);
            if (product != null && product.getSkus() != null && !product.getSkus().isEmpty()) {
                Sku matchedSku = null;
                if (item.getSpec() != null && !item.getSpec().isEmpty()) {
                    matchedSku = product.getSkus().stream()
                            .filter(s -> item.getSpec().equals(s.getSpecification()))
                            .findFirst()
                            .orElse(product.getSkus().get(0));
                } else {
                    matchedSku = product.getSkus().get(0);
                }
                if (matchedSku != null) {
                    skuId = matchedSku.getId();
                    skuCode = matchedSku.getSkuCode();
                }
            }
        }

        CostAdjustmentSheet sheet = new CostAdjustmentSheet();
        sheet.setSheetNo(generateSheetNo());
        sheet.setSupplierId(po.getSupplierId());
        sheet.setSupplierName(po.getSupplierName());
        sheet.setItemCount(1);
        sheet.setTotalQuantity(quantity);
        sheet.setTotalOldCost(oldCost.multiply(new BigDecimal(quantity)));
        sheet.setTotalNewCost(newCost.multiply(new BigDecimal(quantity)));
        sheet.setTotalDiff(totalDiff);
        sheet.setReason(reason != null ? reason : "单条成本调价");
        sheet.setStatus(CostAdjustmentSheet.Status.PENDING);
        sheet.setCreatedBy(getCurrentUser());
        sheet.setCreatedAt(LocalDateTime.now());

        sheet = costAdjustmentSheetRepository.save(sheet);

        CostAdjustmentItem adjustItem = new CostAdjustmentItem();
        adjustItem.setSheetId(sheet.getId());
        adjustItem.setPurchaseOrderId(po.getId());
        adjustItem.setPoNo(po.getOrderNo());
        adjustItem.setProductId(item.getProductId());
        adjustItem.setProductName(item.getProductName());
        adjustItem.setSkuCode(skuCode != null ? skuCode : item.getSkuCode());
        adjustItem.setSkuId(skuId);
        adjustItem.setSpecName(item.getSpec());
        adjustItem.setQuantity(quantity);
        adjustItem.setOldCost(oldCost);
        adjustItem.setNewCost(newCost);
        adjustItem.setUnitDiff(unitDiff);
        adjustItem.setTotalDiff(totalDiff);
        adjustItem.setCreatedBy(getCurrentUser());
        adjustItem.setCreatedAt(LocalDateTime.now());

        costAdjustmentItemRepository.save(adjustItem);

        return sheet;
    }

    @Override
    @Transactional
    public Map<String, Object> batchAdjustWithValidation(List<Map<String, Object>> adjustments) {
        log.info("=== batchAdjustWithValidation START === adjustments count: {}", adjustments.size());
        Map<String, Object> result = new HashMap<>();
        int success = 0;
        int fail = 0;
        List<Map<String, Object>> errors = new ArrayList<>();
        String operator = getCurrentUser();
        log.info("Operator: {}", operator);

        // 按供应商分组
        Map<Long, List<Map<String, Object>>> supplierGroups = new HashMap<>();
        Map<Long, String> supplierNames = new HashMap<>();
        
        for (Map<String, Object> item : adjustments) {
            String poNo = (String) item.get("poNo");
            Object newCostObj = item.get("newCost");
            String supplierName = (String) item.get("supplierName");
            String productName = (String) item.get("productName");
            String specName = (String) item.get("specName");
            Object oldCostObj = item.get("oldCost");
            log.info("Processing item: poNo={}, newCost={}, supplierName={}, productName={}, specName={}", poNo, newCostObj, supplierName, productName, specName);

            Map<String, Object> validationError = validateAdjustmentItem(poNo, productName, specName, null, oldCostObj, newCostObj);
            if (validationError != null) {
                log.warn("Validation failed for poNo={}, error: {}", poNo, validationError);
                fail++;
                validationError.put("poNo", poNo != null ? poNo : "UNKNOWN");
                validationError.put("supplierName", supplierName);
                errors.add(validationError);
                continue;
            }

            try {
                BigDecimal newCost = new BigDecimal(newCostObj.toString());
                PurchaseOrder po = purchaseOrderRepository.findByOrderNo(poNo);
                if (po == null) {
                    log.warn("PurchaseOrder not found for poNo={}", poNo);
                    fail++;
                    Map<String, Object> err = new HashMap<>();
                    err.put("poNo", poNo);
                    err.put("supplierName", supplierName);
                    err.put("msg", "采购单不存在");
                    errors.add(err);
                    continue;
                }

                Long supplierId = po.getSupplierId();
                log.info("Found PO: id={}, supplierId={}, supplierName={}", po.getId(), supplierId, po.getSupplierName());
                supplierGroups.computeIfAbsent(supplierId, k -> new ArrayList<>()).add(item);
                supplierNames.put(supplierId, po.getSupplierName());

            } catch (Exception e) {
                log.error("验证调价项失败: {}", poNo, e);
                fail++;
                Map<String, Object> err = new HashMap<>();
                err.put("poNo", poNo);
                err.put("supplierName", supplierName);
                err.put("msg", e.getMessage());
                errors.add(err);
            }
        }
        
        log.info("Supplier groups count: {}, groups: {}", supplierGroups.size(), supplierGroups.keySet());

        // 按供应商创建调价单
        for (Map.Entry<Long, List<Map<String, Object>>> entry : supplierGroups.entrySet()) {
            Long supplierId = entry.getKey();
            List<Map<String, Object>> items = entry.getValue();
            String supplierName = supplierNames.get(supplierId);
            log.info("Creating sheet for supplier: id={}, name={}, itemCount={}", supplierId, supplierName, items.size());

            // 创建调价单
            CostAdjustmentSheet sheet = new CostAdjustmentSheet();
            sheet.setSheetNo(generateSheetNo());
            sheet.setSupplierId(supplierId);
            sheet.setSupplierName(supplierName);
            sheet.setStatus(CostAdjustmentSheet.Status.PENDING);
            sheet.setReason("批量成本调价");
            sheet.setCreatedBy(operator);
            sheet.setCreatedAt(LocalDateTime.now());

            log.info("Saving sheet: sheetNo={}", sheet.getSheetNo());
            sheet = costAdjustmentSheetRepository.save(sheet);
            log.info("Sheet saved with id={}", sheet.getId());

            int itemCount = 0;
            int totalQuantity = 0;
            BigDecimal totalOldCost = BigDecimal.ZERO;
            BigDecimal totalNewCost = BigDecimal.ZERO;
            BigDecimal totalDiff = BigDecimal.ZERO;

            for (Map<String, Object> item : items) {
                String poNo = (String) item.get("poNo");
                Object newCostObj = item.get("newCost");
                BigDecimal newCost = new BigDecimal(newCostObj.toString());

                PurchaseOrder po = purchaseOrderRepository.findByOrderNo(poNo);
                if (po == null) {
                    fail++;
                    Map<String, Object> err = new HashMap<>();
                    err.put("poNo", poNo);
                    err.put("supplierName", supplierName);
                    err.put("msg", "采购单不存在");
                    errors.add(err);
                    continue;
                }
                
                List<PurchaseOrderItem> poItems = po.getItems();
                if (poItems == null || poItems.isEmpty()) {
                    fail++;
                    Map<String, Object> err = new HashMap<>();
                    err.put("poNo", poNo);
                    err.put("supplierName", supplierName);
                    err.put("msg", "采购单无商品明细");
                    errors.add(err);
                    continue;
                }
                
                PurchaseOrderItem poItem = poItems.get(0);
                BigDecimal oldCost = poItem.getUnitPrice();
                Integer quantity = poItem.getQuantity();
                BigDecimal unitDiff = newCost.subtract(oldCost);
                BigDecimal itemTotalDiff = unitDiff.multiply(new BigDecimal(quantity));

                // Find SKU by specification
                Long skuId = null;
                String skuCode = null;
                if (poItem.getProductId() != null) {
                    Product product = productRepository.findById(poItem.getProductId()).orElse(null);
                    if (product != null && product.getSkus() != null && !product.getSkus().isEmpty()) {
                        Sku matchedSku = null;
                        if (poItem.getSpec() != null && !poItem.getSpec().isEmpty()) {
                            matchedSku = product.getSkus().stream()
                                    .filter(s -> poItem.getSpec().equals(s.getSpecification()))
                                    .findFirst()
                                    .orElse(product.getSkus().get(0));
                        } else {
                            matchedSku = product.getSkus().get(0);
                        }
                        if (matchedSku != null) {
                            skuId = matchedSku.getId();
                            skuCode = matchedSku.getSkuCode();
                        }
                    }
                }

                CostAdjustmentItem adjustItem = new CostAdjustmentItem();
                adjustItem.setSheetId(sheet.getId());
                adjustItem.setPurchaseOrderId(po.getId());
                adjustItem.setPoNo(po.getOrderNo());
                adjustItem.setProductId(poItem.getProductId());
                adjustItem.setProductName(poItem.getProductName());
                adjustItem.setSkuCode(skuCode != null ? skuCode : (poItem.getSkuCode() != null ? poItem.getSkuCode() : ""));
                adjustItem.setSkuId(skuId);
                adjustItem.setSpecName(poItem.getSpecName() != null ? poItem.getSpecName() : "");
                adjustItem.setQuantity(quantity);
                adjustItem.setOldCost(oldCost);
                adjustItem.setNewCost(newCost);
                adjustItem.setUnitDiff(unitDiff);
                adjustItem.setTotalDiff(itemTotalDiff);
                adjustItem.setCreatedBy(operator);
                adjustItem.setCreatedAt(LocalDateTime.now());

                log.info("Saving CostAdjustmentItem: sheetId={}, poNo={}, productId={}", sheet.getId(), po.getOrderNo(), poItem.getProductId());
                costAdjustmentItemRepository.save(adjustItem);
                log.info("CostAdjustmentItem saved successfully");

                itemCount++;
                totalQuantity += quantity;
                totalOldCost = totalOldCost.add(oldCost.multiply(new BigDecimal(quantity)));
                totalNewCost = totalNewCost.add(newCost.multiply(new BigDecimal(quantity)));
                totalDiff = totalDiff.add(itemTotalDiff);
                success++;
            }

            sheet.setItemCount(itemCount);
            sheet.setTotalQuantity(totalQuantity);
            sheet.setTotalOldCost(totalOldCost);
            sheet.setTotalNewCost(totalNewCost);
            sheet.setTotalDiff(totalDiff);
            costAdjustmentSheetRepository.save(sheet);
        }

        result.put("success", success);
        result.put("fail", fail);
        result.put("errors", errors);
        return result;
    }

    public Map<String, Object> createAdjustmentSheetForSupplier(Long supplierId, String supplierName, 
                                                                              List<Map<String, Object>> items, String operator) {
        Map<String, Object> result = new HashMap<>();
        int success = 0;
        int fail = 0;
        List<Map<String, Object>> errors = new ArrayList<>();

        CostAdjustmentSheet sheet = new CostAdjustmentSheet();
        sheet.setSheetNo(generateSheetNo());
        sheet.setSupplierId(supplierId);
        sheet.setSupplierName(supplierName);
        sheet.setStatus(CostAdjustmentSheet.Status.PENDING);
        sheet.setReason("批量成本调价");
        sheet.setCreatedBy(operator);
        sheet.setCreatedAt(LocalDateTime.now());

        sheet = costAdjustmentSheetRepository.save(sheet);

        int itemCount = 0;
        int totalQuantity = 0;
        BigDecimal totalOldCost = BigDecimal.ZERO;
        BigDecimal totalNewCost = BigDecimal.ZERO;
        BigDecimal totalDiff = BigDecimal.ZERO;

        for (Map<String, Object> item : items) {
            String poNo = (String) item.get("poNo");
            Object newCostObj = item.get("newCost");
            BigDecimal newCost = new BigDecimal(newCostObj.toString());

            PurchaseOrder po = purchaseOrderRepository.findByOrderNo(poNo);
            if (po == null) {
                fail++;
                Map<String, Object> err = new HashMap<>();
                err.put("poNo", poNo);
                err.put("supplierName", supplierName);
                err.put("msg", "采购单不存在");
                errors.add(err);
                continue;
            }
            
            List<PurchaseOrderItem> poItems = po.getItems();
            if (poItems == null || poItems.isEmpty()) {
                fail++;
                Map<String, Object> err = new HashMap<>();
                err.put("poNo", poNo);
                err.put("supplierName", supplierName);
                err.put("msg", "采购单无商品明细");
                errors.add(err);
                continue;
            }
            
            PurchaseOrderItem poItem = poItems.get(0);
            BigDecimal oldCost = poItem.getUnitPrice();
            Integer quantity = poItem.getQuantity();
            BigDecimal unitDiff = newCost.subtract(oldCost);
            BigDecimal itemTotalDiff = unitDiff.multiply(new BigDecimal(quantity));

            // Find SKU by specification
            Long skuId = null;
            String skuCode = null;
            if (poItem.getProductId() != null) {
                Product product = productRepository.findById(poItem.getProductId()).orElse(null);
                if (product != null && product.getSkus() != null && !product.getSkus().isEmpty()) {
                    Sku matchedSku = null;
                    if (poItem.getSpec() != null && !poItem.getSpec().isEmpty()) {
                        matchedSku = product.getSkus().stream()
                                .filter(s -> poItem.getSpec().equals(s.getSpecification()))
                                .findFirst()
                                .orElse(product.getSkus().get(0));
                    } else {
                        matchedSku = product.getSkus().get(0);
                    }
                    if (matchedSku != null) {
                        skuId = matchedSku.getId();
                        skuCode = matchedSku.getSkuCode();
                    }
                }
            }

            CostAdjustmentItem adjustItem = new CostAdjustmentItem();
            adjustItem.setSheetId(sheet.getId());
            adjustItem.setPurchaseOrderId(po.getId());
            adjustItem.setPoNo(po.getOrderNo());
            adjustItem.setProductId(poItem.getProductId());
            adjustItem.setProductName(poItem.getProductName());
            adjustItem.setSkuCode(skuCode != null ? skuCode : (poItem.getSkuCode() != null ? poItem.getSkuCode() : ""));
            adjustItem.setSkuId(skuId);
            adjustItem.setSpecName(poItem.getSpecName() != null ? poItem.getSpecName() : "");
            adjustItem.setQuantity(quantity);
            adjustItem.setOldCost(oldCost);
            adjustItem.setNewCost(newCost);
            adjustItem.setUnitDiff(unitDiff);
            adjustItem.setTotalDiff(itemTotalDiff);
            adjustItem.setCreatedBy(operator);
            adjustItem.setCreatedAt(LocalDateTime.now());

            costAdjustmentItemRepository.save(adjustItem);

            itemCount++;
            totalQuantity += quantity;
            totalOldCost = totalOldCost.add(oldCost.multiply(new BigDecimal(quantity)));
            totalNewCost = totalNewCost.add(newCost.multiply(new BigDecimal(quantity)));
            totalDiff = totalDiff.add(itemTotalDiff);
            success++;
        }

        sheet.setItemCount(itemCount);
        sheet.setTotalQuantity(totalQuantity);
        sheet.setTotalOldCost(totalOldCost);
        sheet.setTotalNewCost(totalNewCost);
        sheet.setTotalDiff(totalDiff);
        costAdjustmentSheetRepository.save(sheet);

        result.put("success", success);
        result.put("fail", fail);
        result.put("errors", errors);
        return result;
    }

    private Map<String, Object> validateAdjustmentItem(String poNo, String productName, String specName, 
                                                        String relatedId, Object oldCostObj, Object newCostObj) {
        if (poNo == null || newCostObj == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("msg", "缺少必填字段");
            return err;
        }

        try {
            BigDecimal newCost = new BigDecimal(newCostObj.toString());
            if (newCost.compareTo(BigDecimal.ZERO) < 0) {
                Map<String, Object> err = new HashMap<>();
                err.put("msg", "调价后成本价不能小于0");
                return err;
            }
        } catch (NumberFormatException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("msg", "调价后成本价格式错误");
            return err;
        }

        PurchaseOrder po = purchaseOrderRepository.findByOrderNo(poNo);
        if (po == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("msg", "采购单不存在");
            return err;
        }

        List<Long> poIds = Arrays.asList(po.getId());
        List<Long> pendingIds = getPurchaseOrderIdsWithPendingAdjustment(poIds);
        if (!pendingIds.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("msg", "该采购单存在待审批的调价单，不可重复发起调价");
            return err;
        }

        List<PurchaseOrderItem> items = po.getItems();
        if (items == null || items.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("msg", "采购单无商品明细");
            return err;
        }

        PurchaseOrderItem item = items.get(0);
        
        if (productName != null && !productName.equals(item.getProductName())) {
            Map<String, Object> err = new HashMap<>();
            err.put("msg", "商品名称不匹配");
            return err;
        }

        if (specName != null && !specName.equals(item.getSpecName())) {
            Map<String, Object> err = new HashMap<>();
            err.put("msg", "规格不匹配");
            return err;
        }

        if (oldCostObj != null) {
            try {
                BigDecimal uploadedOldCost = new BigDecimal(oldCostObj.toString());
                if (item.getUnitPrice().compareTo(uploadedOldCost) != 0) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("msg", "调价前成本价不匹配，当前成本价: " + item.getUnitPrice());
                    return err;
                }
            } catch (NumberFormatException e) {
                // Ignore if not a valid number
            }
        }

        return null;
    }

    @Override
    @Transactional
    public CostAdjustmentSheet approve(Long id, String operator) {
        CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("调价单不存在: " + id));

        if (sheet.getStatus() != CostAdjustmentSheet.Status.PENDING) {
            throw new RuntimeException("只有待审批状态的调价单可以审批通过");
        }

        List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheet.getId());
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("调价单无明细记录");
        }

        BigDecimal totalDiff = BigDecimal.ZERO;

        for (CostAdjustmentItem adjustItem : items) {
            PurchaseOrder po = purchaseOrderRepository.findById(adjustItem.getPurchaseOrderId())
                    .orElseThrow(() -> new RuntimeException("采购单不存在: " + adjustItem.getPoNo()));

            PurchaseOrderItem poItem = po.getItems().get(0);
            poItem.setUnitPrice(adjustItem.getNewCost());
            poItem.setTotalPrice(adjustItem.getNewCost().multiply(new BigDecimal(poItem.getQuantity())));

            BigDecimal total = BigDecimal.ZERO;
            for (PurchaseOrderItem pi : po.getItems()) {
                total = total.add(pi.getTotalPrice());
            }
            po.setTotalAmount(total);
            po.setAdjustStatus("Adjusted");
            purchaseOrderRepository.save(po);

            totalDiff = totalDiff.add(adjustItem.getTotalDiff());

            try {
                snapshotService.captureSnapshot(po);
            } catch (Exception e) {
                log.error("快照保存失败: {}", po.getOrderNo(), e);
            }

            syncCostForAdjustmentItem(adjustItem, po);
        }

        sheet.setStatus(CostAdjustmentSheet.Status.APPROVED);
        sheet.setApprovedBy(operator);
        sheet.setApprovedAt(LocalDateTime.now());
        sheet.setUpdatedBy(operator);
        sheet.setUpdatedAt(LocalDateTime.now());
        sheet.setTotalDiff(totalDiff);
        costAdjustmentSheetRepository.save(sheet);

        createSettlementForAdjustment(sheet, totalDiff);

        return sheet;
    }

    private void syncCostForAdjustmentItem(CostAdjustmentItem adjustItem, PurchaseOrder po) {
        if (po.getType() != PurchaseOrder.Type.INBOUND) {
            log.debug("采购单 {} 类型为 {}，不需要同步分仓成本", po.getOrderNo(), po.getType());
            return;
        }

        if (po.getWarehouseId() == null) {
            log.warn("入库采购单 {} 无仓库信息，跳过成本同步", po.getOrderNo());
            return;
        }

        if (adjustItem.getProductId() == null) {
            log.warn("调价明细 {} 无商品ID信息，跳过成本同步", adjustItem.getId());
            return;
        }

        try {
            List<StockBatch> batches = stockBatchRepository.findByPurchaseOrderId(adjustItem.getPurchaseOrderId());

            if (batches == null || batches.isEmpty()) {
                log.warn("采购单 {} 无对应批次记录，跳过成本同步", adjustItem.getPurchaseOrderId());
                return;
            }

            batches = batches.stream()
                .filter(b -> b.getProduct() != null && b.getProduct().getId().equals(adjustItem.getProductId()))
                .collect(java.util.stream.Collectors.toList());

            if (batches.isEmpty()) {
                log.warn("采购单 {} 无商品 {} 的批次记录，跳过成本同步", adjustItem.getPurchaseOrderId(), adjustItem.getProductId());
                return;
            }

            BigDecimal costDiff = adjustItem.getUnitDiff();
            for (StockBatch batch : batches) {
                if (batch.getUnitCost() != null) {
                    BigDecimal oldCost = batch.getUnitCost();
                    BigDecimal newCost = oldCost.add(costDiff);
                    batch.setUnitCost(newCost);
                    batch.setTotalCost(newCost.multiply(new BigDecimal(batch.getQuantity() != null ? batch.getQuantity() : 0)));
                    stockBatchRepository.save(batch);
                    log.info("批次 {} 成本从 {} 更新为 {}", batch.getBatchNo(), oldCost, newCost);
                }
            }

            Warehouse warehouse = warehouseRepository.findById(po.getWarehouseId()).orElse(null);
            Product product = new Product();
            product.setId(adjustItem.getProductId());

            // Find SKU - prefer skuId over skuCode
            Sku sku = null;
            if (adjustItem.getSkuId() != null) {
                sku = skuRepository.findById(adjustItem.getSkuId()).orElse(null);
            }
            if (sku == null && adjustItem.getSkuCode() != null && !adjustItem.getSkuCode().isEmpty()) {
                sku = skuRepository.findBySkuCode(adjustItem.getSkuCode());
            }
            // If still not found, try to match by specification from product's SKUs
            if (sku == null && adjustItem.getProductId() != null && adjustItem.getSpecName() != null) {
                Product fullProduct = productRepository.findById(adjustItem.getProductId()).orElse(null);
                if (fullProduct != null && fullProduct.getSkus() != null) {
                    sku = fullProduct.getSkus().stream()
                            .filter(s -> adjustItem.getSpecName().equals(s.getSpecification()))
                            .findFirst()
                            .orElse(null);
                }
            }

            StockFlow costFlow = new StockFlow();
            costFlow.setWarehouse(warehouse);
            costFlow.setProduct(product);
            costFlow.setSku(sku);
            costFlow.setSpecName(adjustItem.getSpecName());
            costFlow.setFlowType(StockFlow.FlowType.COST_ADJUSTMENT);
            costFlow.setQuantity(0);
            
            // 计算当前库存结存数量（按仓库+SKU查询所有批次的总和）
            int currentBalance = 0;
            if (warehouse != null && sku != null) {
                Integer balance = stockBatchRepository.sumQuantityByWarehouseIdAndSkuId(warehouse.getId(), sku.getId());
                currentBalance = balance != null ? balance : 0;
            }
            costFlow.setBalanceAfter(currentBalance);
            
            // 查询调价单号
            CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(adjustItem.getSheetId()).orElse(null);
            String sheetNo = sheet != null ? sheet.getSheetNo() : String.valueOf(adjustItem.getSheetId());
            
            costFlow.setReferenceNo(sheetNo);
            costFlow.setRelatedSheetNo(sheetNo);
            costFlow.setReason("调价单审批通过，成本变动 - " + adjustItem.getPoNo());
            costFlow.setOperator(getCurrentUser());
            costFlow.setCostChange(adjustItem.getTotalDiff());
            costFlow.setCreatedAt(LocalDateTime.now());
            stockFlowRepository.save(costFlow);

            log.info("入库采购单 {} 调价成本同步完成，调价明细ID: {}, 成本差额: {}", 
                    po.getOrderNo(), adjustItem.getId(), adjustItem.getTotalDiff());

        } catch (Exception e) {
            log.error("同步入库采购单调价成本失败: {}", e.getMessage(), e);
        }
    }

    private void createSettlementForAdjustment(CostAdjustmentSheet sheet, BigDecimal totalDiff) {
        if (totalDiff.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }

        List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheet.getId());
        
        for (CostAdjustmentItem item : items) {
            if (item.getTotalDiff().compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            SettlementOrder settlement = new SettlementOrder();
            settlement.setType(SettlementOrder.Type.PURCHASE);
            settlement.setStatus(SettlementOrder.Status.PENDING);
            settlement.setRelatedOrderNo(item.getPoNo());
            settlement.setSourceType("调价单");
            settlement.setTotalAmount(item.getTotalDiff());
            settlement.setDeliveryNo(sheet.getSheetNo());

            if (sheet.getSupplierId() != null) {
                Supplier supplier = supplierRepository.findById(sheet.getSupplierId()).orElse(null);
                settlement.setSupplier(supplier);
            }

            BigDecimal absAmount = item.getTotalDiff().abs();
            BigDecimal netAmount = absAmount.divide(new BigDecimal("1.06"), 2, RoundingMode.HALF_UP);
            BigDecimal taxAmount = absAmount.subtract(netAmount);
            settlement.setNetAmount(netAmount);
            settlement.setTaxAmount(taxAmount);

            settlement.setCreatedAt(LocalDateTime.now());
            settlement.setCreatedBy("SYSTEM");

            settlementOrderRepository.save(settlement);
            log.info("调价单 {} 审批通过，自动创建结算单，关联采购单 {}，差额 {}", 
                sheet.getSheetNo(), item.getPoNo(), item.getTotalDiff());
        }
    }

    @Override
    public CostAdjustmentSheet reject(Long id, String reason, String operator) {
        CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("调价单不存在: " + id));

        if (sheet.getStatus() != CostAdjustmentSheet.Status.PENDING) {
            throw new RuntimeException("只有待审批状态的调价单可以驳回");
        }

        sheet.setStatus(CostAdjustmentSheet.Status.REJECTED);
        sheet.setRejectReason(reason);
        sheet.setUpdatedBy(operator);
        sheet.setUpdatedAt(LocalDateTime.now());

        return costAdjustmentSheetRepository.save(sheet);
    }

    @Override
    @Transactional
    public CostAdjustmentSheet revoke(Long id, String operator) {
        CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("调价单不存在: " + id));

        if (sheet.getStatus() != CostAdjustmentSheet.Status.PENDING) {
            throw new RuntimeException("只有待审批状态的调价单可以撤销");
        }

        sheet.setStatus(CostAdjustmentSheet.Status.REVOKED);
        sheet.setUpdatedBy(operator);
        sheet.setUpdatedAt(LocalDateTime.now());

        return costAdjustmentSheetRepository.save(sheet);
    }

    @Override
    public CostAdjustmentSheet getById(Long id) {
        CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(id).orElse(null);
        if (sheet != null) {
            List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheet.getId());
            sheet.setItems(items);
        }
        return sheet;
    }

    @Override
    public CostAdjustmentSheet getBySheetNo(String sheetNo) {
        CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findBySheetNo(sheetNo).orElse(null);
        if (sheet != null) {
            List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheet.getId());
            sheet.setItems(items);
        }
        return sheet;
    }

    @Override
    public Page<CostAdjustmentSheet> list(String sheetNo, String supplierName, CostAdjustmentSheet.Status status, Pageable pageable) {
        Specification<CostAdjustmentSheet> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (sheetNo != null && !sheetNo.isEmpty()) {
                predicates.add(cb.like(root.get("sheetNo"), "%" + sheetNo + "%"));
            }

            if (supplierName != null && !supplierName.isEmpty()) {
                predicates.add(cb.like(root.get("supplierName"), "%" + supplierName + "%"));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return costAdjustmentSheetRepository.findAll(spec, pageable);
    }

    @Override
    public synchronized String generateSheetNo() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = "RC" + dateStr;

        long count = costAdjustmentSheetRepository.count();
        String sequence = String.format("%02d", (count % 100) + 1);

        int retry = 0;
        while (costAdjustmentSheetRepository.existsBySheetNo(prefix + sequence) && retry < 100) {
            count++;
            sequence = String.format("%02d", (count % 100) + 1);
            retry++;
        }

        return prefix + sequence;
    }

    @Override
    public List<Long> getPurchaseOrderIdsWithPendingAdjustment(List<Long> purchaseOrderIds) {
        if (purchaseOrderIds == null || purchaseOrderIds.isEmpty()) {
            return List.of();
        }
        return costAdjustmentItemRepository.findPurchaseOrderIdsWithPendingAdjustment(purchaseOrderIds, CostAdjustmentSheet.Status.PENDING);
    }

    @Override
    @Transactional
    public void resetAdjustmentByPoNos(List<String> poNos) {
        if (poNos == null || poNos.isEmpty()) {
            return;
        }
        
        for (String poNo : poNos) {
            List<CostAdjustmentItem> items = costAdjustmentItemRepository.findByPoNo(poNo);
            
            if (items == null || items.isEmpty()) {
                continue;
            }
            
            PurchaseOrder po = purchaseOrderRepository.findByOrderNo(poNo);
            
            for (CostAdjustmentItem item : items) {
                CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(item.getSheetId()).orElse(null);
                
                if (sheet != null && sheet.getStatus() == CostAdjustmentSheet.Status.APPROVED) {
                    if (po != null && po.getItems() != null && !po.getItems().isEmpty()) {
                        PurchaseOrderItem poItem = po.getItems().get(0);
                        poItem.setUnitPrice(item.getOldCost());
                        poItem.setTotalPrice(item.getOldCost().multiply(new BigDecimal(poItem.getQuantity())));
                        
                        BigDecimal total = BigDecimal.ZERO;
                        for (PurchaseOrderItem pi : po.getItems()) {
                            total = total.add(pi.getTotalPrice());
                        }
                        po.setTotalAmount(total);
                    }
                }
                
                costAdjustmentItemRepository.delete(item);
                log.info("已删除调价明细: {} for PO: {}", item.getId(), poNo);
                
                if (sheet != null) {
                    List<CostAdjustmentItem> remainingItems = costAdjustmentItemRepository.findBySheetId(sheet.getId());
                    if (remainingItems.isEmpty()) {
                        costAdjustmentSheetRepository.delete(sheet);
                        log.info("已删除调价单: {}", sheet.getSheetNo());
                    }
                }
            }
            
            if (po != null) {
                po.setAdjustStatus("None");
                purchaseOrderRepository.save(po);
                
                try {
                    snapshotService.captureSnapshot(po);
                } catch (Exception e) {
                    log.error("快照保存失败: {}", po.getOrderNo(), e);
                }
            }
        }
    }

    @Override
    public List<CostAdjustmentItem> getItemsBySheetId(Long sheetId) {
        List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheetId);
        CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(sheetId).orElse(null);
        if (sheet != null) {
            for (CostAdjustmentItem item : items) {
                item.setSheetNo(sheet.getSheetNo());
                item.setStatus(sheet.getStatus());
                item.setReason(sheet.getReason());
            }
        }
        return items;
    }

    @Override
    public List<CostAdjustmentItem> getItemsByPurchaseOrderId(Long purchaseOrderId) {
        List<CostAdjustmentItem> items = costAdjustmentItemRepository.findByPurchaseOrderId(purchaseOrderId);
        for (CostAdjustmentItem item : items) {
            CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(item.getSheetId()).orElse(null);
            if (sheet != null) {
                item.setSheetNo(sheet.getSheetNo());
                item.setStatus(sheet.getStatus());
                item.setReason(sheet.getReason());
            }
        }
        return items;
    }

    @Override
    public List<CostAdjustmentSheet> getByPurchaseOrderId(Long purchaseOrderId) {
        List<CostAdjustmentItem> items = costAdjustmentItemRepository.findByPurchaseOrderId(purchaseOrderId);
        Set<Long> sheetIds = items.stream().map(CostAdjustmentItem::getSheetId).collect(Collectors.toSet());
        List<CostAdjustmentSheet> sheets = new ArrayList<>();
        for (Long sheetId : sheetIds) {
            CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(sheetId).orElse(null);
            if (sheet != null) {
                sheets.add(sheet);
            }
        }
        return sheets;
    }

    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() ? auth.getName() : "System";
    }
}
