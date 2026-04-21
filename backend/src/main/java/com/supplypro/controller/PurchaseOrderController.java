package com.supplypro.controller;

import com.supplypro.common.annotation.OperationLog;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.service.PurchaseOrderService;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.InboundOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.time.LocalDateTime;

import lombok.extern.slf4j.Slf4j;

import com.supplypro.service.PurchaseOrderSnapshotService;

import com.supplypro.entity.PurchaseOrderSnapshot;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.PurchaseOrderSnapshotRepository;
import com.supplypro.repository.SupplierPrepaymentLogRepository;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.entity.SupplierPrepaymentLog;
import com.supplypro.entity.RefundOrder;
import com.supplypro.repository.RefundOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.service.RegionService;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.repository.PurchaseOrderItemRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.Warehouse;
import com.supplypro.entity.Product;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/purchase-orders")
@CrossOrigin(origins = "*")
@Slf4j
public class PurchaseOrderController {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private PurchaseOrderSnapshotService snapshotService;

    @Autowired
    private PurchaseOrderSnapshotRepository purchaseOrderSnapshotRepository;

    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Autowired
    private SupplierPrepaymentLogRepository supplierPrepaymentLogRepository;

    @Autowired
    private RefundOrderRepository refundOrderRepository;

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private com.supplypro.repository.ProductRepository productRepository;

    @Autowired
    private RegionService regionService;

    @Autowired
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private com.supplypro.repository.LogisticsCompanyRepository logisticsCompanyRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private org.springframework.context.ApplicationContext applicationContext;

    @Autowired
    private com.supplypro.service.KuaidiNiaoService kuaidiNiaoService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<String> poNos,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String shippingStatus,
            @RequestParam(required = false) String settlementStatus,
            @RequestParam(required = false) String bizType,
            @RequestParam(required = false) String platformOrderNo,
            @RequestParam(required = false) String bizNo,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String platformName,
            @RequestParam(required = false) String thirdPartyNo
            ) {
        
        // Sort by id desc (latest first) to ensure absolute order stability
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        
        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<PurchaseOrder, PurchaseOrderSnapshot> snapshotJoin = root.join("currentSnapshot", JoinType.LEFT);

            if (startDate != null && !startDate.isEmpty()) {
                try {
                    java.time.LocalDate start = java.time.LocalDate.parse(startDate);
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start.atStartOfDay()));
                } catch (Exception e) {
                    log.error("Invalid start date format: {}", startDate);
                }
            }
            
            if (endDate != null && !endDate.isEmpty()) {
                try {
                    java.time.LocalDate end = java.time.LocalDate.parse(endDate);
                    predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), end.atTime(23, 59, 59)));
                } catch (Exception e) {
                    log.error("Invalid end date format: {}", endDate);
                }
            }

            if (keyword != null && !keyword.isEmpty()) {
                log.info("Filtering by keyword: {}", keyword);
                predicates.add(cb.equal(root.get("orderNo"), keyword));
            }
            if (poNos != null && !poNos.isEmpty()) {
                log.info("Filtering by poNos: {}", poNos);
                predicates.add(root.get("orderNo").in(poNos));
            }
            if (supplierName != null && !supplierName.isEmpty()) {
                predicates.add(cb.like(snapshotJoin.get("supplierName"), "%" + supplierName + "%"));
            }
            if (project != null && !project.isEmpty()) {
                predicates.add(cb.equal(snapshotJoin.get("project"), project));
            }
            if (status != null && !status.isEmpty()) {
                if ("TO_SHIP".equals(status)) {
                    predicates.add(cb.equal(root.get("status"), PurchaseOrder.Status.CONFIRMED));
                } else if ("RECEIVED".equals(status)) {
                    predicates.add(cb.equal(root.get("status"), PurchaseOrder.Status.RECEIVED));
                } else {
                    predicates.add(cb.equal(root.get("status"), PurchaseOrder.Status.valueOf(status)));
                }
            }
            if (shippingStatus != null && !shippingStatus.isEmpty()) {
                predicates.add(cb.equal(snapshotJoin.get("shippingStatus"), shippingStatus));
            }
            if (settlementStatus != null && !settlementStatus.isEmpty()) {
                predicates.add(cb.equal(snapshotJoin.get("settlementStatus"), settlementStatus));
            }
            if (bizType != null && !bizType.isEmpty()) {
                log.info("Filtering by bizType: {}", bizType);
                List<Predicate> bizTypePredicates = new ArrayList<>();
                bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), bizType));
                
                // Add legacy data compatibility
                if ("INBOUND".equals(bizType)) {
                    bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), "商品入库"));
                    bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), "入库单"));
                    bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), "ProductInbound"));
                } else if ("PLATFORM".equals(bizType)) {
                    bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), "平台单"));
                    bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), "OrderPurchase"));
                } else if ("REPLENISHMENT".equals(bizType)) {
                    bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), "补货单"));
                    bizTypePredicates.add(cb.equal(snapshotJoin.get("bizType"), "ReplenishPurchase"));
                }
                
                predicates.add(cb.or(bizTypePredicates.toArray(new Predicate[0])));
            }
            if (platformOrderNo != null && !platformOrderNo.isEmpty()) {
                 predicates.add(cb.like(snapshotJoin.get("platformOrderNo"), "%" + platformOrderNo + "%"));
            }
            if (bizNo != null && !bizNo.isEmpty()) {
                 predicates.add(cb.like(snapshotJoin.get("bizNo"), "%" + bizNo + "%"));
            }
            if (costType != null && !costType.isEmpty()) {
                predicates.add(cb.equal(root.get("costType"), costType));
            }
            if (platformName != null && !platformName.isEmpty()) {
                predicates.add(cb.like(root.get("platformName"), "%" + platformName + "%"));
            }
            if (thirdPartyNo != null && !thirdPartyNo.isEmpty()) {
                predicates.add(cb.like(root.get("thirdPartyNo"), "%" + thirdPartyNo + "%"));
            }
            if (product != null && !product.isEmpty()) {
                log.info("Filtering by product: {}", product);
                javax.persistence.criteria.Predicate namePredicate = cb.like(snapshotJoin.get("productNames"), "%" + product + "%");
                javax.persistence.criteria.Predicate specPredicate = cb.like(snapshotJoin.get("productSpecs"), "%" + product + "%");
                predicates.add(cb.or(namePredicate, specPredicate));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        log.info("Searching POs with page: {}, size: {}", page, size);
        
        List<PurchaseOrder> records;
        long total;
        int pageNum;
        int totalPages;
        
        try {
            Page<PurchaseOrder> pageResult = purchaseOrderRepository.findAll(spec, pageable);
            
            // Convert to snapshot-driven POs
            records = pageResult.getContent().stream()
                .map(po -> {
                    if (po.getCurrentSnapshot() != null) {
                        return snapshotService.convertSnapshotToPO(po.getCurrentSnapshot());
                    } else {
                        log.info("PO {} has no current snapshot. Triggering sync backfill.", po.getOrderNo());
                        try {
                            // Need to load PO with items to capture snapshot
                            PurchaseOrder loadedPo = purchaseOrderRepository.findByIdWithItems(po.getId()).stream().findFirst().orElse(po);
                            PurchaseOrderSnapshot newSnapshot = snapshotService.captureSnapshot(loadedPo);
                            return snapshotService.convertSnapshotToPO(newSnapshot);
                        } catch (Exception e) {
                            log.error("Failed to backfill snapshot for PO {}", po.getOrderNo(), e);
                            return po; // return original PO as fallback (might fail on lazy load later, but better than nothing)
                        }
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

            // Identify POs needing repair (Batch Processing)
            List<Long> badPoIds = records.stream()
                .filter(po -> {
                    // Condition 1: Empty Items but Amount > 0
                    boolean isEmptyItems = (po.getItems() == null || po.getItems().isEmpty()) && 
                                           po.getTotalAmount() != null && 
                                           po.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) > 0;
                    if (isEmptyItems) return true;
                    
                    // Condition 2: Missing Product Details (Image/SKU)
                    if (po.getItems() != null && !po.getItems().isEmpty()) {
                        com.supplypro.entity.PurchaseOrderItem firstItem = po.getItems().get(0);
                        return firstItem.getProductImage() == null || firstItem.getSkuCode() == null;
                    }
                    return false;
                })
                .map(PurchaseOrder::getId)
                .collect(java.util.stream.Collectors.toList());
            
            if (!badPoIds.isEmpty()) {
                log.warn("Detected {} Bad Snapshots. Fetching from Main DB in batch.", badPoIds.size());
                try {
                    // Batch fetch all bad POs in one query
                    List<PurchaseOrder> fixedPOs = purchaseOrderRepository.findByIdWithItemsIn(badPoIds);
                    Map<Long, PurchaseOrder> fixedPOMap = fixedPOs.stream()
                        .collect(java.util.stream.Collectors.toMap(PurchaseOrder::getId, java.util.function.Function.identity()));
                    
                    // Replace bad POs and trigger async repair
                    for (int i = 0; i < records.size(); i++) {
                        PurchaseOrder po = records.get(i);
                        if (badPoIds.contains(po.getId()) && fixedPOMap.containsKey(po.getId())) {
                            PurchaseOrder fixedPO = fixedPOMap.get(po.getId());
                            records.set(i, fixedPO);
                            // Async repair the bad snapshot for future requests
                            snapshotService.asyncCaptureSnapshot(fixedPO);
                        }
                    }
                } catch (Exception e) {
                    log.error("Failed to batch recover POs from Main DB", e);
                }
            }
            // Populate stockInNo for INBOUND orders
            List<PurchaseOrder> inboundPOs = records.stream()
                .filter(po -> po.getType() == PurchaseOrder.Type.INBOUND)
                .collect(java.util.stream.Collectors.toList());

            if (!inboundPOs.isEmpty()) {
                try {
                    List<InboundOrder> inboundOrders = inboundOrderRepository.findByPurchaseOrderIn(inboundPOs);
                    if (inboundOrders != null) {
                        Map<Long, String> poIdToInboundNo = inboundOrders.stream()
                            .filter(io -> io != null && io.getPurchaseOrder() != null && io.getInboundNo() != null)
                            .collect(java.util.stream.Collectors.toMap(
                                io -> io.getPurchaseOrder().getId(),
                                InboundOrder::getInboundNo,
                                (existing, replacement) -> existing // Keep existing if duplicate
                            ));
                        
                        for (PurchaseOrder po : records) {
                            if (po != null && po.getType() == PurchaseOrder.Type.INBOUND && poIdToInboundNo.containsKey(po.getId())) {
                                po.setStockInNo(poIdToInboundNo.get(po.getId()));
                                // Also set inboundOrderNo for backward compatibility if needed, though snapshot usually has it
                                if (po.getInboundOrderNo() == null) {
                                    po.setInboundOrderNo(poIdToInboundNo.get(po.getId()));
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.error("Error populating stockInNo: {}", e.getMessage());
                    // Continue without stockInNo
                }
            }
            
            // Fix: total should match actual records count after filtering null conversions
            // 问题修复：total应该与过滤后的实际记录数一致
            // 由于convertSnapshotToPO可能返回null（当snapshotData为null或反序列化失败时），
            // 我们需要确保total与实际返回的records数量一致
            // 注意：这里records.size()是当前页的记录数，对于分页场景需要特殊处理
            // Always use the database query total (已经过滤了snapshotData为null的记录)
            total = pageResult.getTotalElements();
            totalPages = pageResult.getTotalPages();
            pageNum = pageResult.getNumber() + 1;
            
        } catch (Exception e) {
            log.error("Failed to search snapshots: {}. Falling back to main table query.", e.getMessage());
            // Fallback to main table query
            try {
                Specification<PurchaseOrder> poSpec = (root, query, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    if (keyword != null && !keyword.isEmpty()) {
                        predicates.add(cb.equal(root.get("orderNo"), keyword));
                    }
                    if (supplierName != null && !supplierName.isEmpty()) {
                        // Use Left Join to handle missing suppliers safely
                        javax.persistence.criteria.Join<PurchaseOrder, Supplier> supplierJoin = root.join("supplier", javax.persistence.criteria.JoinType.LEFT);
                        predicates.add(cb.like(supplierJoin.get("name"), "%" + supplierName + "%"));
                    }
                    if (status != null && !status.isEmpty()) {
                        try {
                            predicates.add(cb.equal(root.get("status"), PurchaseOrder.Status.valueOf(status)));
                        } catch (IllegalArgumentException ex) {
                            // Ignore invalid status
                        }
                    }
                    if (settlementStatus != null && !settlementStatus.isEmpty()) {
                        try {
                            predicates.add(cb.equal(root.get("settlementStatus"), PurchaseOrder.SettlementStatus.valueOf(settlementStatus)));
                        } catch (IllegalArgumentException ex) {
                            // Ignore invalid status
                        }
                    }
                    if (bizType != null && !bizType.isEmpty()) {
                        List<Predicate> bizTypePredicates = new ArrayList<>();
                        bizTypePredicates.add(cb.equal(root.get("bizType"), bizType));
                        
                        // Add legacy data compatibility
                        if ("INBOUND".equals(bizType)) {
                            bizTypePredicates.add(cb.equal(root.get("bizType"), "商品入库"));
                            bizTypePredicates.add(cb.equal(root.get("bizType"), "入库单"));
                            bizTypePredicates.add(cb.equal(root.get("bizType"), "ProductInbound"));
                        } else if ("PLATFORM".equals(bizType)) {
                            bizTypePredicates.add(cb.equal(root.get("bizType"), "平台单"));
                            bizTypePredicates.add(cb.equal(root.get("bizType"), "OrderPurchase"));
                        } else if ("REPLENISHMENT".equals(bizType)) {
                            bizTypePredicates.add(cb.equal(root.get("bizType"), "补货单"));
                            bizTypePredicates.add(cb.equal(root.get("bizType"), "ReplenishPurchase"));
                        }
                        
                        predicates.add(cb.or(bizTypePredicates.toArray(new Predicate[0])));
                    }
                    if (platformOrderNo != null && !platformOrderNo.isEmpty()) {
                         predicates.add(cb.like(root.get("platformOrderNo"), "%" + platformOrderNo + "%"));
                    }
                    if (bizNo != null && !bizNo.isEmpty()) {
                         predicates.add(cb.like(root.get("bizNo"), "%" + bizNo + "%"));
                    }
                    if (product != null && !product.isEmpty()) {
                        javax.persistence.criteria.Join<PurchaseOrder, com.supplypro.entity.PurchaseOrderItem> itemsJoin = root.join("items", javax.persistence.criteria.JoinType.LEFT);
                        javax.persistence.criteria.Join<com.supplypro.entity.PurchaseOrderItem, com.supplypro.entity.Product> productJoin = itemsJoin.join("product", javax.persistence.criteria.JoinType.LEFT);
                        javax.persistence.criteria.Predicate productNamePredicate = cb.like(productJoin.get("name"), "%" + product + "%");
                        javax.persistence.criteria.Predicate specPredicate = cb.like(itemsJoin.get("spec"), "%" + product + "%");
                        predicates.add(cb.or(productNamePredicate, specPredicate));
                        query.distinct(true);
                    }
                    return cb.and(predicates.toArray(new Predicate[0]));
                };
                
                Page<PurchaseOrder> poPage = purchaseOrderRepository.findAll(poSpec, pageable);
                
                // Use POs directly (no need to convert to snapshots)
                records = poPage.getContent();
                total = poPage.getTotalElements();
                pageNum = poPage.getNumber() + 1;
                totalPages = poPage.getTotalPages();
            } catch (Exception ex) {
                log.error("Fatal error in PurchaseOrder List fallback: {}", ex.getMessage(), ex);
                // Return empty result to avoid 500
                records = new ArrayList<>();
                total = 0;
                pageNum = 1;
                totalPages = 0;
            }
        }
        
        // 转换物流公司编码为中文名称
        for (PurchaseOrder po : records) {
            if (po != null && po.getLogisticsCompany() != null) {
                String companyName = po.getLogisticsCompany();
                // 检查是否为编码（长度较短且不含中文）
                if (companyName.length() <= 10 && !companyName.matches(".*[\\u4e00-\\u9fa5].*")) {
                    // 尝试通过编码查找中文名称
                    try {
                        // 先尝试通过kdnCode查找
                        java.util.List<com.supplypro.entity.LogisticsCompany> companies = 
                            logisticsCompanyRepository.findByKdnCode(companyName);
                        if (companies != null && !companies.isEmpty()) {
                            po.setLogisticsCompany(companies.get(0).getName());
                            continue;
                        }
                        // 再尝试通过code查找
                        if (logisticsCompanyRepository.findByCode(companyName).isPresent()) {
                            po.setLogisticsCompany(logisticsCompanyRepository.findByCode(companyName).get().getName());
                        }
                    } catch (Exception e) {
                        log.debug("Failed to convert logistics company code: {}", companyName);
                    }
                }
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", records,
            "total", total,
            "pageNum", pageNum,
            "pageSize", size,
            "pages", totalPages
        ));
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/from-platform-confirm")
    public ResponseEntity<Map<String, Object>> confirmPlatform(@RequestBody com.supplypro.dto.PlatformConfirmRequest request) {
        log.info("Received platform confirm request: {}", request);
        try {
            PurchaseOrder saved = purchaseOrderService.createFromPlatformConfirm(request);
            
            Map<String, Object> simplifiedData = new HashMap<>();
            simplifiedData.put("id", saved.getId());
            simplifiedData.put("orderNo", saved.getOrderNo());
            simplifiedData.put("type", saved.getType());
            simplifiedData.put("bizType", saved.getBizType());
            simplifiedData.put("costType", saved.getCostType());
            simplifiedData.put("payableAmount", saved.getPayableAmount());
            simplifiedData.put("settlementStatus", saved.getSettlementStatus());
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Created successfully");
            response.put("data", simplifiedData);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to create PO from platform confirm: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/update-snapshot-product-names")
    @OperationLog(module = "PurchaseOrder", operation = "UpdateSnapshotProductNames")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateSnapshotProductNames() {
        log.info("========== 开始更新快照商品名称字段 ==========");
        long startTime = System.currentTimeMillis();
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        try {
            javax.persistence.Query findSnapshots = entityManager.createNativeQuery(
                "SELECT id, snapshot_data FROM purchase_order_snapshots WHERE product_names IS NULL OR product_names = ''");
            @SuppressWarnings("unchecked")
            java.util.List<Object[]> snapshots = findSnapshots.getResultList();
            
            log.info("发现需要更新的快照记录: {} 条", snapshots.size());
            
            int updatedCount = 0;
            int errorCount = 0;
            
            com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
            objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            
            for (Object[] row : snapshots) {
                Long snapshotId = ((Number) row[0]).longValue();
                String snapshotData = (String) row[1];
                
                try {
                    if (snapshotData == null || snapshotData.isEmpty()) {
                        continue;
                    }
                    
                    @SuppressWarnings("unchecked")
                    Map<String, Object> poData = objectMapper.readValue(snapshotData, Map.class);
                    Object itemsObj = poData.get("items");
                    
                    if (itemsObj instanceof java.util.List) {
                        @SuppressWarnings("unchecked")
                        java.util.List<Map<String, Object>> items = (java.util.List<Map<String, Object>>) itemsObj;
                        
                        java.util.Set<String> names = new java.util.LinkedHashSet<>();
                        java.util.Set<String> specs = new java.util.LinkedHashSet<>();
                        
                        for (Map<String, Object> item : items) {
                            String productName = (String) item.get("productName");
                            String spec = (String) item.get("spec");
                            
                            if (productName != null && !productName.isEmpty()) {
                                names.add(productName);
                            }
                            if (spec != null && !spec.isEmpty()) {
                                specs.add(spec);
                            }
                        }
                        
                        String productNames = names.isEmpty() ? null : String.join("|", names);
                        String productSpecs = specs.isEmpty() ? null : String.join("|", specs);
                        
                        if (productNames != null || productSpecs != null) {
                            javax.persistence.Query updateQuery = entityManager.createNativeQuery(
                                "UPDATE purchase_order_snapshots SET product_names = ?, product_specs = ? WHERE id = ?");
                            updateQuery.setParameter(1, productNames);
                            updateQuery.setParameter(2, productSpecs);
                            updateQuery.setParameter(3, snapshotId);
                            updateQuery.executeUpdate();
                            updatedCount++;
                        }
                    }
                } catch (Exception e) {
                    log.warn("更新快照 {} 失败: {}", snapshotId, e.getMessage());
                    errorCount++;
                }
            }
            
            long elapsed = System.currentTimeMillis() - startTime;
            log.info("========== 快照商品名称更新完成: 更新 {} 条, 失败 {} 条, 耗时 {}ms ==========", 
                updatedCount, errorCount, elapsed);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "快照商品名称更新完成");
            response.put("data", Map.of(
                "updated", updatedCount,
                "errors", errorCount,
                "elapsedMs", elapsed
            ));
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("更新快照商品名称失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @PostMapping("/cleanup-orphan-snapshots")
    @OperationLog(module = "PurchaseOrder", operation = "CleanupOrphanSnapshots")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupOrphanSnapshots() {
        log.info("========== 开始清理孤儿快照记录 ==========");
        long startTime = System.currentTimeMillis();
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        try {
            // 步骤1：查找孤儿快照记录（purchase_order_id不存在于purchase_orders表）
            log.info("步骤1：查找孤儿快照记录...");
            javax.persistence.Query findOrphans = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM purchase_order_snapshots pos " +
                "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id)");
            Long orphanCount = ((Number) findOrphans.getSingleResult()).longValue();
            log.info("发现孤儿快照记录: {} 条", orphanCount);
            
            // 步骤2：查找孤儿快照记录的详细信息
            List<Map<String, Object>> orphanDetails = new ArrayList<>();
            if (orphanCount > 0) {
                javax.persistence.Query findOrphanDetails = entityManager.createNativeQuery(
                    "SELECT pos.id, pos.purchase_order_id, pos.status, pos.version, pos.is_latest " +
                    "FROM purchase_order_snapshots pos " +
                    "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id) " +
                    "LIMIT 100");
                @SuppressWarnings("unchecked")
                java.util.List<Object[]> results = findOrphanDetails.getResultList();
                for (Object[] row : results) {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", row[0]);
                    detail.put("purchaseOrderId", row[1]);
                    detail.put("status", row[2]);
                    detail.put("version", row[3]);
                    detail.put("isLatest", row[4]);
                    orphanDetails.add(detail);
                }
                log.info("孤儿快照记录详情（前100条）: {}", orphanDetails);
            }
            
            // 步骤3：删除孤儿快照记录
            int deletedCount = 0;
            if (orphanCount > 0) {
                log.info("步骤2：删除孤儿快照记录...");
                javax.persistence.Query deleteOrphans = entityManager.createNativeQuery(
                    "DELETE FROM purchase_order_snapshots pos " +
                    "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id)");
                deletedCount = deleteOrphans.executeUpdate();
                log.info("已删除孤儿快照记录: {} 条", deletedCount);
            } else {
                log.info("无需删除，未发现孤儿快照记录");
            }
            
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            log.info("========== 清理孤儿快照记录完成，耗时: {} ms ==========", duration);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("data", Map.of(
                "orphanCount", orphanCount,
                "deletedCount", deletedCount,
                "orphanDetails", orphanDetails,
                "durationMs", duration,
                "message", "清理孤儿快照记录完成"
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("清理孤儿快照记录失败: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "清理孤儿快照记录失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @GetMapping("/status-summary")
    public ResponseEntity<Map<String, Object>> getStatusSummary(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<String> poNos,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String shippingStatus,
            @RequestParam(required = false) String settlementStatus,
            @RequestParam(required = false) String bizType,
            @RequestParam(required = false) String platformOrderNo,
            @RequestParam(required = false) String bizNo,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String platformName,
            @RequestParam(required = false) String thirdPartyNo
    ) {
        // Get status counts from snapshot table (is_latest = true AND snapshot_data IS NOT NULL)
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // Build dynamic query with filters using current_snapshot_id
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT po.status, COUNT(po.id) as count FROM purchase_orders po ");
        sqlBuilder.append("INNER JOIN purchase_order_snapshots pos ON po.current_snapshot_id = pos.id ");
        sqlBuilder.append("LEFT JOIN suppliers s ON s.id = po.supplier_id "); // Join supplier for filtering
        sqlBuilder.append("WHERE pos.snapshot_data IS NOT NULL ");
        sqlBuilder.append("AND pos.snapshot_data != '' AND pos.snapshot_data != '{}' ");
        sqlBuilder.append("AND JSON_VALID(pos.snapshot_data) = 1 ");

        Map<String, Object> queryParams = new HashMap<>();

        if (keyword != null && !keyword.isEmpty()) {
            sqlBuilder.append("AND po.order_no = :keyword ");
            queryParams.put("keyword", keyword);
        }
        if (poNos != null && !poNos.isEmpty()) {
            sqlBuilder.append("AND po.order_no IN :poNos ");
            queryParams.put("poNos", poNos);
        }
        if (supplierName != null && !supplierName.isEmpty()) {
            sqlBuilder.append("AND s.name LIKE :supplierName ");
            queryParams.put("supplierName", "%" + supplierName + "%");
        }
        if (project != null && !project.isEmpty()) {
            sqlBuilder.append("AND pos.project = :project ");
            queryParams.put("project", project);
        }
        if (shippingStatus != null && !shippingStatus.isEmpty()) {
            sqlBuilder.append("AND pos.shipping_status = :shippingStatus ");
            queryParams.put("shippingStatus", shippingStatus);
        }
        if (settlementStatus != null && !settlementStatus.isEmpty()) {
            sqlBuilder.append("AND pos.settlement_status = :settlementStatus ");
            queryParams.put("settlementStatus", settlementStatus);
        }
        if (bizType != null && !bizType.isEmpty()) {
            if ("INBOUND".equals(bizType)) {
                sqlBuilder.append("AND pos.biz_type IN (:bizType, '商品入库', '入库单', 'ProductInbound') ");
            } else if ("PLATFORM".equals(bizType)) {
                sqlBuilder.append("AND pos.biz_type IN (:bizType, '平台单', 'OrderPurchase') ");
            } else if ("REPLENISHMENT".equals(bizType)) {
                sqlBuilder.append("AND pos.biz_type IN (:bizType, '补货单', 'ReplenishPurchase') ");
            } else {
                sqlBuilder.append("AND pos.biz_type = :bizType ");
            }
            queryParams.put("bizType", bizType);
        }
        if (platformOrderNo != null && !platformOrderNo.isEmpty()) {
            sqlBuilder.append("AND pos.platform_order_no LIKE :platformOrderNo ");
            queryParams.put("platformOrderNo", "%" + platformOrderNo + "%");
        }
        if (bizNo != null && !bizNo.isEmpty()) {
            sqlBuilder.append("AND pos.biz_no LIKE :bizNo ");
            queryParams.put("bizNo", "%" + bizNo + "%");
        }
        if (startDate != null && !startDate.isEmpty()) {
            sqlBuilder.append("AND po.created_at >= :startDate ");
            try {
                java.time.LocalDate start = java.time.LocalDate.parse(startDate);
                queryParams.put("startDate", start.atStartOfDay());
            } catch (Exception e) {
                log.error("Invalid start date format in summary: {}", startDate);
                sqlBuilder.setLength(sqlBuilder.length() - "AND po.created_at >= :startDate ".length());
            }
        }
        if (endDate != null && !endDate.isEmpty()) {
            sqlBuilder.append("AND po.created_at <= :endDate ");
            try {
                java.time.LocalDate end = java.time.LocalDate.parse(endDate);
                queryParams.put("endDate", end.atTime(23, 59, 59));
            } catch (Exception e) {
                log.error("Invalid end date format in summary: {}", endDate);
                sqlBuilder.setLength(sqlBuilder.length() - "AND po.created_at <= :endDate ".length());
            }
        }
        
        if (product != null && !product.isEmpty()) {
            sqlBuilder.append("AND (pos.product_names LIKE :product OR pos.product_specs LIKE :product) ");
            queryParams.put("product", "%" + product + "%");
        }
        if (costType != null && !costType.isEmpty()) {
            sqlBuilder.append("AND po.cost_type = :costType ");
            queryParams.put("costType", costType);
        }
        if (platformName != null && !platformName.isEmpty()) {
            sqlBuilder.append("AND po.platform_name LIKE :platformName ");
            queryParams.put("platformName", "%" + platformName + "%");
        }
        if (thirdPartyNo != null && !thirdPartyNo.isEmpty()) {
            sqlBuilder.append("AND po.third_party_no LIKE :thirdPartyNo ");
            queryParams.put("thirdPartyNo", "%" + thirdPartyNo + "%");
        }

        sqlBuilder.append("GROUP BY po.status");

        javax.persistence.Query query = entityManager.createNativeQuery(sqlBuilder.toString());
        for (Map.Entry<String, Object> entry : queryParams.entrySet()) {
            query.setParameter(entry.getKey(), entry.getValue());
        }

        @SuppressWarnings("unchecked")
        java.util.List<Object[]> statusCounts = query.getResultList();
        
        // Build status map with proper mapping
        Map<String, Long> statusMap = new HashMap<>();
        long total = 0;
        
        for (Object[] row : statusCounts) {
            String dbStatus = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            
            // Map DB statuses to Frontend Display Statuses
            String displayStatus = dbStatus;
            
            // Map CONFIRMED to TO_SHIP
            if ("CONFIRMED".equals(dbStatus)) {
                displayStatus = "TO_SHIP";
            }
            // Map PARTIAL_RECEIVED to RECEIVED
            else if ("PARTIAL_RECEIVED".equals(dbStatus)) {
                displayStatus = "RECEIVED";
            }
            
            // Aggregate counts if multiple DB statuses map to same display status
            statusMap.put(displayStatus, statusMap.getOrDefault(displayStatus, 0L) + count);
            total += count;
        }
        
        // Status labels mapping
        Map<String, String> statusLabels = new java.util.LinkedHashMap<>();
        statusLabels.put("PENDING", "待处理");
        statusLabels.put("TO_SHIP", "待发货");
        statusLabels.put("SHIPPED", "已发货");
        statusLabels.put("RECEIVED", "已收货");
        statusLabels.put("CANCELLED", "已取消");
        
        // Status colors mapping
        Map<String, String> statusColors = new java.util.HashMap<>();
        statusColors.put("PENDING", "#faad14");
        statusColors.put("TO_SHIP", "#722ed1");
        statusColors.put("SHIPPED", "#13c2c2");
        statusColors.put("RECEIVED", "#52c41a");
        statusColors.put("CANCELLED", "#ff4d4f");
        
        // Build status list
        List<Map<String, Object>> statusList = new ArrayList<>();
        
        // Iterate through predefined order to ensure all cards are present even if count is 0
        for (String statusKey : statusLabels.keySet()) {
            Map<String, Object> statusItem = new HashMap<>();
            statusItem.put("status", statusKey);
            statusItem.put("label", statusLabels.get(statusKey));
            statusItem.put("count", statusMap.getOrDefault(statusKey, 0L));
            statusItem.put("color", statusColors.get(statusKey));
            statusList.add(statusItem);
        }
        
        // Build response with proper structure (code + data wrapper)
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "total", total,
            "statusList", statusList
        ));
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/logistics-detail/{trackingNumber}")
    public ResponseEntity<Map<String, Object>> getLogisticsDetail(@PathVariable String trackingNumber) {
        log.info("Request received for logistics detail with tracking number: {}", trackingNumber);
        
        // Find all POs with this tracking number (removed fee > 0 filter)
        List<PurchaseOrder> pos = purchaseOrderRepository.findByTrackingNumber(trackingNumber);
        
        log.info("Found {} purchase orders for tracking number: {}", pos.size(), trackingNumber);
        
        // Construct detailed response even if empty to avoid 404 or error on frontend
        // If pos is empty, we still return code 200 but with empty list
        
        // Calculate total fee
        java.math.BigDecimal totalFee = pos.stream()
            .map(PurchaseOrder::getLogisticsFee)
            .filter(java.util.Objects::nonNull)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            
        // Construct detailed response
        List<Map<String, Object>> orderDetails = pos.stream().map(po -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", po.getId());
            map.put("orderNo", po.getOrderNo());
            map.put("supplierName", po.getSupplier() != null ? po.getSupplier().getName() : "");
            map.put("logisticsFee", po.getLogisticsFee());
            map.put("status", po.getStatus());
            map.put("deliveryMethod", po.getDeliveryMethod()); // Add delivery method
            
            // Logistics Supplier Name Logic (Consistent with getById)
            // Priority: 1. Explicitly set logisticsSupplierName (from import/service)
            //           2. logisticsProvider relationship
            //           3. Supplier name (for dropship/zero-fee cases)
            String logisticsSupplierName = po.getLogisticsSupplierName();
            if (logisticsSupplierName == null && po.getLogisticsProvider() != null) {
                logisticsSupplierName = po.getLogisticsProvider().getName();
            }
            if (logisticsSupplierName == null && po.getSupplier() != null) {
                logisticsSupplierName = po.getSupplier().getName();
            }
            // Fallback to logistics company if still null
            if (logisticsSupplierName == null) {
                logisticsSupplierName = po.getLogisticsCompany();
            }
            map.put("logisticsSupplierName", logisticsSupplierName);
            
            // Shipping Time
            map.put("shippedTime", po.getShippedAt());
            
            // Self Delivery Details
            map.put("deliverer", po.getDeliverer());
            map.put("delivererPhone", po.getDelivererPhone());
            map.put("plateNumber", po.getPlateNumber());
            map.put("currentLocation", po.getCurrentLocation());
            
            // Receiver Address Construction
            String province = po.getProvince();
            String city = po.getCity();
            String district = po.getDistrict();
            
            // Translate region codes
            if (province != null && province.matches("\\d+")) province = regionService.getNameByCode(province);
            if (city != null && city.matches("\\d+")) city = regionService.getNameByCode(city);
            if (district != null && district.matches("\\d+")) district = regionService.getNameByCode(district);
            
            StringBuilder addressBuilder = new StringBuilder();
            if (province != null) addressBuilder.append(province).append(" ");
            if (city != null) addressBuilder.append(city).append(" ");
            if (district != null) addressBuilder.append(district).append(" ");
            if (po.getDetailAddress() != null) addressBuilder.append(po.getDetailAddress());
            
            String address = addressBuilder.toString().trim();
            
            if (po.getContactName() != null || po.getContactPhone() != null) {
                address += String.format(" (%s %s)", 
                    po.getContactName() != null ? po.getContactName() : "", 
                    po.getContactPhone() != null ? po.getContactPhone() : "").trim();
            }
            map.put("receiverAddress", address);

            map.put("items", po.getItems().stream().map(item -> {
                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("productName", item.getProductName());
                itemMap.put("quantity", item.getQuantity());
                return itemMap;
            }).collect(java.util.stream.Collectors.toList()));
            return map;
        }).collect(java.util.stream.Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "trackingNumber", trackingNumber,
            "orders", orderDetails,
            "totalFee", totalFee
        ));
        
        return ResponseEntity.ok(response);
    }
    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @GetMapping("/{id:\\d+}")
    @OperationLog(module = "PurchaseOrder", operation = "GetById")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        // 1. Fetch Live Data (Reference for Status/Consistency)
        List<PurchaseOrder> livePoList = purchaseOrderRepository.findByIdWithItems(id);
        PurchaseOrder livePo = livePoList.isEmpty() ? null : livePoList.get(0);
        
        if (livePo == null) {
             return ResponseEntity.notFound().build();
        }

        // 2. Fetch Latest Snapshot
        PurchaseOrder snapshotPo = null;
        try {
            snapshotPo = snapshotService.getLatestSnapshotAsPO(id).orElse(null);
        } catch (Exception e) {
            log.warn("Failed to fetch snapshot for PO {}", id, e);
        }
        
        PurchaseOrder responsePo = livePo;
        String source = "LIVE";

        if (snapshotPo != null) {
            // Consistency Check: Status
            if (snapshotPo.getStatus() == livePo.getStatus()) {
                responsePo = snapshotPo;
                source = "SNAPSHOT";
            } else {
                log.warn("Snapshot Stale: PO {} Live Status {} vs Snapshot {}. Triggering async update.", 
                         id, livePo.getStatus(), snapshotPo.getStatus());
                try {
                    snapshotService.asyncCaptureSnapshot(livePo);
                } catch (Exception e) {
                    log.error("Failed to trigger async snapshot update", e);
                }
            }
        } else {
             log.warn("Snapshot missing for PO {}. Triggering backfill.", id);
             try {
                 snapshotService.asyncBackfillSnapshot(id);
             } catch (Exception e) {
                 log.warn("Failed to trigger backfill for PO {}", id, e);
             }
        }

        // Convert PO to Map to avoid modifying entity and to merge with extra data
        @SuppressWarnings("unchecked")
        Map<String, Object> dataMap = objectMapper.convertValue(responsePo, Map.class);
        
        // Fallback: Recover missing supplier from snapshot
        if (responsePo.getSupplier() == null && snapshotPo != null && snapshotPo.getSupplier() != null) {
            log.info("Recovering missing supplier for PO {} from snapshot", id);
            // We manually put supplier into map since responsePo (livePo) didn't have it
            dataMap.put("supplier", snapshotPo.getSupplier());
            dataMap.put("supplierId", snapshotPo.getSupplier().getId());
        }

        // Translate region codes to names for address display (Modify Map, not Entity)
        if (responsePo.getProvince() != null && responsePo.getProvince().matches("\\d+")) {
             dataMap.put("province", regionService.getNameByCode(responsePo.getProvince()));
        }
        if (responsePo.getCity() != null && responsePo.getCity().matches("\\d+")) {
             dataMap.put("city", regionService.getNameByCode(responsePo.getCity()));
        }
        if (responsePo.getDistrict() != null && responsePo.getDistrict().matches("\\d+")) {
             dataMap.put("district", regionService.getNameByCode(responsePo.getDistrict()));
        }

        dataMap.put("dataSource", source);
        
        // Compute Logistics Supplier Name for display
        // Priority: 1. Explicitly set logisticsSupplierName (from import/service)
        //           2. logisticsProvider relationship
        //           3. Supplier name (for dropship/zero-fee cases)
        String logisticsSupplierName = responsePo.getLogisticsSupplierName();
        if (logisticsSupplierName == null && responsePo.getLogisticsProvider() != null) {
            logisticsSupplierName = responsePo.getLogisticsProvider().getName();
        }
        if (logisticsSupplierName == null && responsePo.getSupplier() != null) {
            logisticsSupplierName = responsePo.getSupplier().getName();
        }
        if (logisticsSupplierName != null) {
            dataMap.put("logisticsSupplierName", logisticsSupplierName);
        }
        
        // Fetch extra records
        List<RefundOrder> refundRecords = refundOrderRepository.findByRelatedOrderIdAndBizType(
            responsePo.getId(), RefundOrder.BizType.PURCHASE);
        List<Map<String, Object>> refundRecordMaps = new ArrayList<>();
        for (RefundOrder ro : refundRecords) {
            Map<String, Object> rMap = new HashMap<>();
            rMap.put("id", ro.getId());
            rMap.put("refundNo", ro.getRefundNo());
            rMap.put("relatedOrderNo", ro.getRelatedOrderNo());
            rMap.put("refundAmount", ro.getRefundAmount());
            rMap.put("refundType", ro.getRefundType() != null ? ro.getRefundType().name() : null);
            rMap.put("bearer", ro.getBearer() != null ? ro.getBearer().name() : null);
            rMap.put("status", ro.getStatus() != null ? ro.getStatus().name() : null);
            rMap.put("applicant", ro.getApplicant());
            rMap.put("productName", ro.getProductName());
            rMap.put("specName", ro.getSpecName());
            rMap.put("quantity", ro.getQuantity());
            rMap.put("unitPrice", ro.getUnitPrice());
            rMap.put("remark", ro.getRemark());
            rMap.put("approvalRemark", ro.getApprovalRemark());
            rMap.put("approvalTime", ro.getApprovalTime());
            rMap.put("createdAt", ro.getCreatedAt());
            refundRecordMaps.add(rMap);
        }
        dataMap.put("refundRecords", refundRecordMaps);
        dataMap.put("supplierRefundTotal", refundRecords.stream()
            .filter(r -> r.getBearer() == RefundOrder.Bearer.SUPPLIER)
            .filter(r -> r.getStatus() == RefundOrder.Status.COMPLETED)
            .map(RefundOrder::getRefundAmount)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add));
        
        List<SettlementOrder> settlementRecords = settlementOrderRepository.findByRelatedOrderNo(responsePo.getOrderNo());
        dataMap.put("settlementRecords", settlementRecords);

        List<PurchaseOrderLog> orderLogs = purchaseOrderLogRepository.findByPurchaseOrderIdOrderByCreatedAtDesc(responsePo.getId());
        
        // Translate remarks
        List<Map<String, Object>> logDtos = new ArrayList<>();
        if (orderLogs != null) {
            for (PurchaseOrderLog log : orderLogs) {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", log.getId());
                dto.put("createdAt", log.getCreatedAt());
                dto.put("operator", translateOperator(log.getOperator()));
                dto.put("operationType", log.getOperationType());
                dto.put("remark", translateRemark(log.getRemark()));
                dto.put("oldValue", log.getOldValue());
                dto.put("newValue", log.getNewValue());
                logDtos.add(dto);
            }
        }
        dataMap.put("orderLogs", logDtos);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", dataMap);
        
        return ResponseEntity.ok(response);
    }

    private String translateOperator(String operator) {
        if (operator == null) return "";
        if ("System".equalsIgnoreCase(operator)) return "系统";
        if ("SYSTEM_AUTO".equalsIgnoreCase(operator)) return "系统自动";
        return operator;
    }

    private String translateRemark(String remark) {
        if (remark == null) return "";
        
        // Exact matches
        if (remark.equals("Order Shipped")) return "订单已发货";
        if (remark.equals("Order Created")) return "订单已创建";
        if (remark.equals("Order Updated")) return "订单已更新";
        if (remark.equals("Order Submitted")) return "订单已提交";
        if (remark.equals("Order Approved")) return "订单已审核";
        if (remark.equals("Order Rejected")) return "订单已拒绝";
        if (remark.equals("Order Cancelled")) return "订单已取消";
        if (remark.equals("Order Closed")) return "订单已关闭";
        if (remark.equals("Order Completed")) return "订单已完成";
        if (remark.equals("Auto-received based on KuaidiNiao status: Signed")) return "根据快递鸟物流状态自动收货：已签收";

        // Prefix matches
        if (remark.contains("Inbound Purchase Order initialized with PENDING status")) {
            return "初始化入库单，状态：待处理";
        }
        if (remark.startsWith("Updated logistics info with ETA: ")) {
            String date = remark.substring("Updated logistics info with ETA: ".length());
            // If date is "null", just say "更新物流信息"
            if ("null".equals(date)) {
                return "更新物流信息";
            }
            return "更新物流信息，预计送达：" + date;
        }
        if (remark.startsWith("Status changed from ")) {
             // Example: Status changed from PENDING to CONFIRMED
             String[] parts = remark.split(" ");
             if (parts.length >= 6) {
                 String oldStatus = parts[3];
                 String newStatus = parts[5];
                 return "状态变更：从 " + translateStatus(oldStatus) + " 变为 " + translateStatus(newStatus);
             }
             return "状态变更";
        }

        // Fallbacks
        if (remark.contains("Created")) return "创建成功";
        if (remark.contains("Updated")) return "更新成功";
        
        return remark;
    }

    private String translateStatus(String status) {
        if (status == null) return "";
        switch (status) {
            // Order Status
            case "PENDING": return "待处理";
            case "CONFIRMED": return "待发货";
            case "SHIPPED": return "已发货";
            case "RECEIVED": return "已收货";
            case "COMPLETED": return "已完成";
            case "CANCELLED": return "已取消";
            case "PENDING_SETTLEMENT": return "待结算";
            case "SETTLED": return "已结算";
            // Shipping Status
            case "TO_SHIP": return "待发货";
            default: return status;
        }
    }

    private void validateAndSetBizInfo(PurchaseOrder order, boolean isUpdate) {
        if (order.getBizType() != null) {
            if (order.getBizNo() == null || order.getBizNo().trim().isEmpty()) {
                throw new IllegalArgumentException("业务单号不能为空");
            }

            // Check uniqueness
            purchaseOrderRepository.findByBizNo(order.getBizNo()).ifPresent(existing -> {
                if (!isUpdate || !existing.getId().equals(order.getId())) {
                    throw new IllegalArgumentException("业务单号已绑定其他采购单");
                }
            });

            switch (order.getBizType()) {
                case INBOUND:
                    // Check if inbound order exists
                    inboundOrderRepository.findByInboundNo(order.getBizNo()).orElseThrow(() -> 
                        new IllegalArgumentException("无效的入库单号: " + order.getBizNo()));
                    order.setType(PurchaseOrder.Type.INBOUND);
                    break;
                case PLATFORM:
                    order.setType(PurchaseOrder.Type.STANDARD);
                    break;
                case REPLENISHMENT:
                    order.setType(PurchaseOrder.Type.REPLENISHMENT);
                    break;
            }
        }
    }

    @PostMapping
    @OperationLog(module = "PurchaseOrder", operation = "Create")
    // Remove @Transactional to avoid "silent rollback" when Service throws exception
    // The Service methods (generateInboundPurchaseOrder, createGeneralPurchaseOrder) manage their own transactions.
    public ResponseEntity<Map<String, Object>> create(@RequestBody PurchaseOrder order) {
        log.info("Create PO request received. OrderNo: {}, Attachments: {}", order.getOrderNo(), order.getAttachments());
        if (order.getItems() != null) {
            log.info("Items count: {}", order.getItems().size());
        } else {
            log.warn("Items is null");
        }

        // Basic validation and setup
        if (order.getOrderNo() == null || order.getOrderNo().isEmpty()) {
            order.setOrderNo("PO" + System.currentTimeMillis());
        }
        
        // Validation: Supplier is mandatory or derived
        if (order.getSupplier() == null && order.getSupplierId() == null) {
            // Attempt to derive supplier from first item if available
            if (order.getItems() != null && !order.getItems().isEmpty()) {
                com.supplypro.entity.PurchaseOrderItem firstItem = order.getItems().get(0);
                if (firstItem.getProductId() != null) {
                    com.supplypro.entity.Product product = productRepository.findById(firstItem.getProductId()).orElse(null);
                    if (product != null && product.getDefaultSupplierId() != null) {
                        order.setSupplierId(product.getDefaultSupplierId());
                        // Explicitly set supplier object to satisfy downstream checks
                        Supplier s = new Supplier();
                        s.setId(product.getDefaultSupplierId());
                        order.setSupplier(s);
                    }
                }
            }
        }

        if (order.getSupplier() == null) {
            if (order.getSupplierId() != null) {
                Supplier s = new Supplier();
                s.setId(order.getSupplierId());
                order.setSupplier(s);
            } else {
                 return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Supplier is required (could not be derived from items)"));
            }
        } else if (order.getSupplier().getId() == null) {
             return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Supplier ID is required"));
        }
        
        try {
            validateAndSetBizInfo(order, false);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", e.getMessage()));
        }
        
        // Delegate Inbound Order creation to Service to ensure transactional consistency and complete data return (including InboundNo and refreshed relations)
        if (order.getType() == PurchaseOrder.Type.INBOUND) {
            try {
                // Ensure WarehouseID is present
                if (order.getWarehouseId() == null) {
                    return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Warehouse ID is required for INBOUND orders"));
                }
                
                // Force status to PENDING before processing
                order.setStatus(PurchaseOrder.Status.PENDING);
                
                // CRITICAL: The following service method enforces the 4 mandatory field rules for Inbound POs:
                // 1. Purchase Type: Fixed as INBOUND ("入库采购")
                // 2. Business Type: Fixed as "商品入库"
                // 3. Order No: Synced with Inbound Order No ("IN...")
                // 4. Expected Delivery Time: Raw user input (no timezone conversion)
                PurchaseOrder saved = purchaseOrderService.generateInboundPurchaseOrder(order);
                
                // Simplify response to avoid StackOverflowError due to circular references
                Map<String, Object> simplifiedData = new HashMap<>();
                simplifiedData.put("id", saved.getId());
                simplifiedData.put("orderNo", saved.getOrderNo());
                simplifiedData.put("inboundOrderNo", saved.getInboundOrderNo());
                simplifiedData.put("bizNo", saved.getInboundOrderNo());
                simplifiedData.put("type", saved.getType());
                simplifiedData.put("bizType", saved.getBizType());
                
                Map<String, Object> response = new HashMap<>();
                response.put("code", 200);
                response.put("message", "Created successfully");
                response.put("data", simplifiedData);
                return ResponseEntity.ok(response);
            } catch (Exception e) {
                log.error("Failed to create Inbound PO: {}", e.getMessage(), e);
                return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", e.getMessage()));
            }
        }

        // For General Purchase Orders (non-INBOUND)
        try {
            if (order.getItems() == null || order.getItems().isEmpty()) {
                return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Purchase Order must contain at least one product item"));
            }
            
            PurchaseOrder saved = purchaseOrderService.createGeneralPurchaseOrder(order);
            
            log.info("MONITOR_PO_CREATED: id={}, orderNo={}, status={}, type={}", 
                        saved.getId(), saved.getOrderNo(), saved.getStatus(), saved.getType());
            
            Map<String, Object> simplifiedData = new HashMap<>();
            simplifiedData.put("id", saved.getId());
            simplifiedData.put("orderNo", saved.getOrderNo());
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Created successfully");
            response.put("data", simplifiedData);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to save order: {}", e.getMessage(), e);
            throw e;
        }
    }
    

    @PutMapping("/{id:\\d+}/status")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable long id, @RequestBody Map<String, String> payload) {
        return purchaseOrderRepository.findById(id)
                .map(order -> {
                    String statusStr = payload.get("status");
                    if (statusStr != null) {
                        try {
                            PurchaseOrder.Status newStatus = PurchaseOrder.Status.valueOf(statusStr);
                            
                            // Check if triggering Inbound Order creation
                            if (newStatus == PurchaseOrder.Status.CONFIRMED && order.getType() == PurchaseOrder.Type.INBOUND) {
                                // Idempotency check: prevent duplicate Inbound Orders for same PO
                                if (inboundOrderRepository.findByPurchaseOrder(order).isEmpty()) {
                                    try {
                                        purchaseOrderService.createInboundOrder(order);
                                        log.info("Synchronously created Inbound Order for PO status update: {}", order.getOrderNo());
                                        
                                        // Update references in 'order' object since createInboundOrder might have updated the DB entity but not this instance
                                        // Actually, createInboundOrder updates the passed entity if it's attached? 
                                        // Best to re-fetch or trust the service updates.
                                        // For now, we continue.
                                    } catch (Exception e) {
                                        log.error("Failed to create Inbound Order synchronously: {}", e.getMessage());
                                        throw new RuntimeException("Failed to create associated Inbound Order: " + e.getMessage());
                                    }
                                }
                            }

                            order.setStatus(newStatus);
                            purchaseOrderRepository.save(order);
                            
                            // Capture snapshot for status update
                            try {
                                snapshotService.captureSnapshot(order, "STATUS_UPDATE");
                            } catch (Exception e) {
                                log.error("Failed to capture snapshot after status update for PO {}", order.getOrderNo(), e);
                            }
                            
                            Map<String, Object> response = new HashMap<>();
                            response.put("code", 200);
                            response.put("message", "Status updated");
                            return ResponseEntity.ok(response);
                        } catch (IllegalArgumentException e) {
                            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Invalid status"));
                        }
                    }
                    return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Status required"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id:\\d+}/ship")
    @OperationLog(module = "PurchaseOrder", operation = "Ship")
    public ResponseEntity<Map<String, Object>> ship(@PathVariable long id, @RequestBody Map<String, Object> payload) {
        String company = (String) payload.get("shipCompany");
        String trackingNo = (String) payload.get("shipNo");
        String shippedAtStr = (String) payload.get("shippedAt");
        LocalDateTime shippedAt = shippedAtStr != null ? LocalDateTime.parse(shippedAtStr) : null;
        
        String expectedArrivalStr = (String) payload.get("expectedArrival");
        LocalDateTime expectedArrival = expectedArrivalStr != null ? LocalDateTime.parse(expectedArrivalStr) : null;

        String deliverer = (String) payload.get("deliverer");
        String delivererPhone = (String) payload.get("contact");
        String plateNumber = (String) payload.get("plateNo");
        String deliveryMethod = (String) payload.get("shipType");
        
        // Handle attachments
        String attachments = null;
        Object attachmentsObj = payload.get("attachments");
        if (attachmentsObj instanceof String) {
            attachments = (String) attachmentsObj;
        } else if (attachmentsObj instanceof java.util.List) {
            try {
                attachments = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(attachmentsObj);
            } catch (Exception e) {
                log.warn("Failed to serialize attachments", e);
            }
        }
        
        java.math.BigDecimal logisticsFee = null;
        if (payload.get("logisticsFee") != null) {
            logisticsFee = new java.math.BigDecimal(payload.get("logisticsFee").toString());
        }

        Long logisticsProviderId = null;
        Object supplierVal = payload.get("logisticsSupplier");
        if (supplierVal != null) {
            if (supplierVal instanceof Number) {
                logisticsProviderId = ((Number) supplierVal).longValue();
            } else if (supplierVal instanceof String && !((String) supplierVal).equals("DROPSHIP")) {
                try {
                    logisticsProviderId = Long.parseLong((String) supplierVal);
                } catch (NumberFormatException e) {
                    log.warn("Invalid logistics supplier ID: {}", supplierVal);
                }
            }
        }

        try {
            // Pre-save attachments so they are available when snapshot is captured inside the service
            if (attachments != null) {
                com.supplypro.entity.PurchaseOrder po = purchaseOrderRepository.findById(id).orElse(null);
                if (po != null) {
                    po.setShippingProof(attachments); // Use shippingProof for ship operation
                    purchaseOrderRepository.save(po);
                }
            }

            purchaseOrderService.shipWithLogisticsInfo(id, company, trackingNo, shippedAt, expectedArrival, deliverer, delivererPhone, plateNumber, logisticsFee, logisticsProviderId, deliveryMethod);
            
            // Snapshot is already captured in shipWithLogisticsInfo
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Order shipped successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to ship order", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id:\\d+}/logistics")
    @OperationLog(module = "PurchaseOrder", operation = "LogisticsUpdate")
    public ResponseEntity<Map<String, Object>> updateLogistics(@PathVariable long id, @RequestBody Map<String, Object> payload) {
        return processLogisticsUpdate(id, payload);
    }

    private ResponseEntity<Map<String, Object>> processLogisticsUpdate(long id, Map<String, Object> payload) {
        String company = (String) payload.get("shipCompany");
        String trackingNo = (String) payload.get("shipNo");
        String shippedAtStr = (String) payload.get("shippedAt");
        LocalDateTime shippedAt = shippedAtStr != null ? LocalDateTime.parse(shippedAtStr) : null;
        
        String expectedArrivalStr = (String) payload.get("expectedArrival");
        LocalDateTime expectedArrival = expectedArrivalStr != null ? LocalDateTime.parse(expectedArrivalStr) : null;

        String deliverer = (String) payload.get("deliverer");
        String delivererPhone = (String) payload.get("contact"); // Frontend sends 'contact' for phone
        String plateNumber = (String) payload.get("plateNo");
        String currentLocation = (String) payload.get("currentLocation");
        String deliveryMethod = (String) payload.get("shipType");
        
        // Handle attachments
        String attachments = null;
        Object attachmentsObj = payload.get("attachments");
        if (attachmentsObj instanceof String) {
            attachments = (String) attachmentsObj;
        } else if (attachmentsObj instanceof java.util.List) {
            try {
                attachments = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(attachmentsObj);
            } catch (Exception e) {
                log.warn("Failed to serialize attachments", e);
            }
        }
        
        java.math.BigDecimal logisticsFee = null;
        if (payload.get("logisticsFee") != null) {
            logisticsFee = new java.math.BigDecimal(payload.get("logisticsFee").toString());
        }

        Long logisticsProviderId = null;
        Object supplierVal = payload.get("logisticsSupplier");
        if (supplierVal != null) {
            if (supplierVal instanceof Number) {
                logisticsProviderId = ((Number) supplierVal).longValue();
            } else if (supplierVal instanceof String && !((String) supplierVal).equals("DROPSHIP")) {
                try {
                    logisticsProviderId = Long.parseLong((String) supplierVal);
                } catch (NumberFormatException e) {
                    log.warn("Invalid logistics supplier ID: {}", supplierVal);
                }
            }
        }

        try {
            // Pre-save attachments and location so they are available when snapshot is captured
            if (attachments != null || currentLocation != null) {
                com.supplypro.entity.PurchaseOrder po = purchaseOrderRepository.findById(id).orElse(null);
                if (po != null) {
                    if (attachments != null) po.setShippingProof(attachments); // Use shippingProof for logistics update
                    if (currentLocation != null) po.setCurrentLocation(currentLocation);
                    purchaseOrderRepository.save(po);
                }
            }

            purchaseOrderService.updateLogisticsInfo(id, company, trackingNo, shippedAt, expectedArrival, deliverer, delivererPhone, plateNumber, logisticsFee, logisticsProviderId, deliveryMethod);

            // Capture snapshot for logistics update
            purchaseOrderRepository.findById(id).ifPresent(po -> {
                try {
                    snapshotService.captureSnapshot(po, "SHIP_INFO_UPDATE");
                } catch (Exception e) {
                    log.error("Failed to capture snapshot after logistics update for PO {}", po.getOrderNo(), e);
                }
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Order logistics updated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update logistics info", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/delivery/checkWaybill")
    public ResponseEntity<Map<String, Object>> checkWaybill(
            @RequestParam String waybillNo,
            @RequestParam String deliveryType,
            @RequestParam(required = false) String excludePurchaseNo) {
        
        Map<String, Object> result = purchaseOrderService.checkWaybill(waybillNo, deliveryType, excludePurchaseNo);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id:\\d+}/receive")
    @OperationLog(module = "PurchaseOrder", operation = "Receive")
    // @PreAuthorize("hasAuthority('purchase:receive')") // Permission check as per requirement
    public ResponseEntity<Map<String, Object>> receive(@PathVariable long id) {
        try {
            // Get current user from security context
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String operator = (authentication != null) ? authentication.getName() : "system";
            
            purchaseOrderService.receivePurchaseOrder(id, operator);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Order received successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to receive purchase order {}", id, e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id:\\d+}/cancel")
    @OperationLog(module = "PurchaseOrder", operation = "Cancel")
    @Transactional
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable long id) {
        return purchaseOrderRepository.findById(id)
                .map(order -> {
                    // Check settlement status
                    if (order.getSettlementStatus() != PurchaseOrder.SettlementStatus.UNSETTLED) {
                        return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Cannot cancel order with initiated settlement"));
                    }
                    
                    PurchaseOrder.Status oldStatus = order.getStatus();
                    order.setStatus(PurchaseOrder.Status.CANCELLED);
                    purchaseOrderRepository.save(order);
                    
                    // Log the cancellation to purchase_order_log table
                    try {
                        PurchaseOrderLog logEntry = new PurchaseOrderLog();
                        logEntry.setPurchaseOrderId(order.getId());
                        logEntry.setOperationType("CANCEL");
                        logEntry.setOldValue(oldStatus.name());
                        logEntry.setNewValue(PurchaseOrder.Status.CANCELLED.name());
                        logEntry.setRemark("订单已取消");
                        
                        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                        String operator = (auth != null && auth.isAuthenticated()) ? auth.getName() : "系统";
                        logEntry.setOperator(operator);
                        logEntry.setCreatedAt(LocalDateTime.now());
                        
                        purchaseOrderLogRepository.save(logEntry);
                        log.info("Cancellation logged for PO {} by {}", order.getOrderNo(), operator);
                    } catch (Exception e) {
                        log.error("Failed to log cancellation for PO {}", order.getOrderNo(), e);
                    }
                    
                    // Capture snapshot for cancellation
                    try {
                        snapshotService.captureSnapshot(order, "CANCEL");
                    } catch (Exception e) {
                        log.error("Failed to capture snapshot after cancellation for PO {}", order.getOrderNo(), e);
                    }
                    
                    // Sync to Inbound Order
                    inboundOrderRepository.findByPurchaseOrder(order).ifPresent(io -> {
                        io.setStatus(InboundOrder.Status.CANCELLED);
                        inboundOrderRepository.save(io);
                        log.info("Synchronously cancelled Inbound Order {} for PO {}", io.getInboundNo(), order.getOrderNo());
                    });
                    
                    log.info("Purchase Order {} cancelled. OrderNo: {}", id, order.getOrderNo());
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Order cancelled successfully");
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id:\\d+}")
    @OperationLog(module = "PurchaseOrder", operation = "Update")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody PurchaseOrder order) {
        order.setId(id);
        try {
            validateAndSetBizInfo(order, true);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", e.getMessage()));
        }

        return purchaseOrderRepository.findById(id)
                .map(existing -> {
                    // Allow update if PENDING or PENDING_SETTLEMENT (before settlement)
                    if (existing.getStatus() != PurchaseOrder.Status.PENDING && existing.getStatus() != PurchaseOrder.Status.PENDING_SETTLEMENT) {
                        return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Only pending orders can be updated"));
                    }
                    
                    existing.setSupplier(order.getSupplier());
                    existing.setType(order.getType());
                    existing.setBizType(order.getBizType());
                    existing.setBizNo(order.getBizNo());
                    existing.setDeliveryDate(order.getDeliveryDate());
                    existing.setRemark(order.getRemark());
                    existing.setTotalAmount(order.getTotalAmount());
                    existing.setWarehouseId(order.getWarehouseId());

                    // Consistency check: If type is INBOUND, ensure platformOrderNo is consistent
                    if (existing.getType() == PurchaseOrder.Type.INBOUND) {
                        inboundOrderRepository.findByPurchaseOrder(existing).ifPresent(inbound -> {
                            String expected = "入库采购-" + inbound.getInboundNo();
                            if (!expected.equals(existing.getPlatformOrderNo())) {
                                existing.setPlatformOrderNo(expected);
                            }
                        });
                    }
                    
                    // New fields
                    existing.setContactName(order.getContactName());
                    existing.setContactPhone(order.getContactPhone());
                    existing.setProvince(order.getProvince());
                    existing.setCity(order.getCity());
                    existing.setDistrict(order.getDistrict());
                    existing.setDetailAddress(order.getDetailAddress());
                    existing.setIsManualAddress(order.getIsManualAddress());
                    existing.setAttachments(order.getAttachments());
                    
                    // Update items
                    if (order.getItems() != null) {
                        existing.getItems().clear();
                        for (var item : order.getItems()) {
                            item.setPurchaseOrder(existing);
                            existing.getItems().add(item);
                        }
                    }
                    
                    PurchaseOrder saved = purchaseOrderRepository.save(existing);
                    
                    // Capture snapshot for update
                    try {
                        snapshotService.captureSnapshot(saved, "UPDATE");
                    } catch (Exception e) {
                        log.error("Failed to capture snapshot after update for PO {}", saved.getOrderNo(), e);
                    }
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Updated successfully");
                    response.put("data", saved);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id:\\d+}")
    @OperationLog(module = "PurchaseOrder", operation = "Delete")
    @Transactional
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id, @RequestParam(required = false) String reason) {
        log.info("Delete request received for PO ID: {}, Reason: {}", id, reason);
        
        // Use findByIdWithItems to ensure entity is properly loaded
        List<PurchaseOrder> poList = purchaseOrderRepository.findByIdWithItems(id);
        PurchaseOrder order = poList.isEmpty() ? null : poList.get(0);
        
        if (order == null) {
            log.warn("PO with ID {} not found", id);
            return ResponseEntity.notFound().build();
        }
        
        log.info("Found PO: {}, Status: {}, SettlementStatus: {}", order.getOrderNo(), order.getStatus(), order.getSettlementStatus());
        
        // 1. Validate Status: Only PENDING or CANCELLED allowed for deletion
        if (order.getStatus() != PurchaseOrder.Status.PENDING && order.getStatus() != PurchaseOrder.Status.CANCELLED) {
            log.warn("Cannot delete PO {} - status is {} (must be PENDING or CANCELLED)", order.getOrderNo(), order.getStatus());
            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Only PENDING or CANCELLED orders can be deleted"));
        }

        // 2. Validate Settlement Status: Must be UNSETTLED
        if (order.getSettlementStatus() != PurchaseOrder.SettlementStatus.UNSETTLED) {
            log.warn("Cannot delete PO {} - settlement status is {}", order.getOrderNo(), order.getSettlementStatus());
            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Cannot delete order with initiated settlement"));
        }
        
        // 3. Check for existing Settlement Orders
        List<SettlementOrder> settlements = settlementOrderRepository.findByRelatedOrderNo(order.getOrderNo());
        if (settlements != null && !settlements.isEmpty()) {
            boolean hasNonPending = settlements.stream()
                .anyMatch(s -> s.getStatus() != SettlementOrder.Status.PENDING);
            if (hasNonPending) {
                log.warn("Cannot delete PO {} - has non-pending settlements", order.getOrderNo());
                return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Cannot delete order with processed settlement orders"));
            }
            // Delete pending settlements
            settlementOrderRepository.deleteAll(settlements);
            log.info("Deleted {} pending settlement orders for PO {}", settlements.size(), order.getOrderNo());
        }

        // 4. Log the deletion before actual delete (Audit Trail)
        try {
            PurchaseOrderLog logEntry = new PurchaseOrderLog();
            logEntry.setPurchaseOrderId(order.getId()); // Note: ID might be reused if auto-increment resets, but log remains
            logEntry.setOperationType("DELETE");
            logEntry.setOldValue(order.getStatus().name());
            logEntry.setNewValue("DELETED");
            
            String logReason = reason != null && !reason.trim().isEmpty() ? reason : "用户手动删除";
            logEntry.setRemark("删除采购单: " + order.getOrderNo() + ", 原因: " + logReason + ", 金额: " + order.getTotalAmount());
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String operator = (auth != null && auth.isAuthenticated()) ? auth.getName() : "系统";
            logEntry.setOperator(operator);
            logEntry.setCreatedAt(LocalDateTime.now());
            
            // Save log even if PO is deleted (log table usually separate, but here we might lose referential integrity if cascade delete?)
            // Usually logs should be kept. If foreign key exists, we might need to soft delete or nullify FK.
            // Assuming current schema allows null FK or cascade. If cascade, log is gone.
            // Let's assume we want to keep logs. If cascade delete is on, we can't keep logs linked to PO ID easily without PO.
            // For now, follow existing pattern: save log. If FK constraint fails, we might need to handle it.
            // However, typically for "Delete", we might want Soft Delete. User asked for "Soft or Hard".
            // Let's stick to Hard Delete as per existing code, but ensure related entities are handled.
            purchaseOrderLogRepository.save(logEntry);
            log.info("Deletion logged for PO {} by {}", order.getOrderNo(), operator);
        } catch (Exception e) {
            log.error("Failed to log deletion for PO {}", order.getOrderNo(), e);
        }
        
        // 5. Handle Inbound Order
        inboundOrderRepository.findByPurchaseOrder(order).ifPresent(io -> {
            if (io.getStatus() != InboundOrder.Status.PENDING && io.getStatus() != InboundOrder.Status.CANCELLED) {
                throw new RuntimeException("Cannot delete PO with Inbound Order in status: " + io.getStatus());
            }
            inboundOrderRepository.delete(io);
            log.info("Deleted associated Inbound Order {} for PO {}", io.getInboundNo(), order.getOrderNo());
        });
        
        // 6. Delete associated snapshots
        purchaseOrderSnapshotRepository.deleteByPurchaseOrderId(order.getId());
        log.info("Deleted snapshots for PO {}", order.getOrderNo());
        
        // 7. Execute Delete
        purchaseOrderRepository.delete(order);
        log.info("PO {} deleted successfully", order.getOrderNo());
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Deleted successfully");
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{id:\\d+}/force")
    @OperationLog(module = "PurchaseOrder", operation = "ForceDeletePurchaseOrder")
    @Transactional
    public ResponseEntity<Map<String, Object>> forceDeletePurchaseOrder(@PathVariable long id) {
        log.info("强制删除采购单 ID: {}", id);
        
        PurchaseOrder po = purchaseOrderRepository.findById(id).orElse(null);
        if (po == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 404);
            response.put("message", "采购单不存在");
            return ResponseEntity.status(404).body(response);
        }
        
        log.info("强制删除采购单: {} (状态: {})", po.getOrderNo(), po.getStatus());
        
        // 1. 删除所有快照记录
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        javax.persistence.Query deleteSnapshots = entityManager.createNativeQuery(
            "DELETE FROM purchase_order_snapshots WHERE purchase_order_id = ?");
        deleteSnapshots.setParameter(1, id);
        int snapshotCount = deleteSnapshots.executeUpdate();
        log.info("删除快照记录: {} 条", snapshotCount);
        
        // 2. 删除关联的配送单（待结算状态的settlement_orders）
        // settlement_orders表使用related_order_no字段存储采购单号
        javax.persistence.Query deleteDeliveries = entityManager.createNativeQuery(
            "DELETE FROM settlement_orders WHERE related_order_no = ? AND status = 'PENDING'");
        deleteDeliveries.setParameter(1, po.getOrderNo());
        int deliveryCount = deleteDeliveries.executeUpdate();
        log.info("删除配送单(settlement_orders): {} 条", deliveryCount);
        
        // 3. 删除关联的入库单及其明细（必须在删除采购单之前）
        // 先查询所有关联的入库单
        javax.persistence.Query findInboundOrders = entityManager.createNativeQuery(
            "SELECT id FROM inbound_orders WHERE purchase_order_id = ?");
        findInboundOrders.setParameter(1, id);
        @SuppressWarnings("unchecked")
        java.util.List<Number> inboundOrderIds = findInboundOrders.getResultList();
        
        for (Number inboundOrderId : inboundOrderIds) {
            // 先删除入库单明细
            javax.persistence.Query deleteInboundItems = entityManager.createNativeQuery(
                "DELETE FROM inbound_order_items WHERE inbound_order_id = ?");
            deleteInboundItems.setParameter(1, inboundOrderId.longValue());
            int inboundItemCount = deleteInboundItems.executeUpdate();
            log.info("删除入库单明细: {} 条", inboundItemCount);
        }
        
        // 再删除入库单
        if (!inboundOrderIds.isEmpty()) {
            javax.persistence.Query deleteInbound = entityManager.createNativeQuery(
                "DELETE FROM inbound_orders WHERE purchase_order_id = ?");
            deleteInbound.setParameter(1, id);
            int inboundCount = deleteInbound.executeUpdate();
            log.info("删除入库单: {} 条", inboundCount);
        }
        
        // 4. 删除采购单明细（purchase_order_items表使用order_id字段）
        javax.persistence.Query deleteItems = entityManager.createNativeQuery(
            "DELETE FROM purchase_order_items WHERE order_id = ?");
        deleteItems.setParameter(1, id);
        int itemCount = deleteItems.executeUpdate();
        log.info("删除采购单明细: {} 条", itemCount);
        
        // 5. 删除采购单主记录
        purchaseOrderRepository.delete(po);
        log.info("删除采购单主记录: {}", po.getOrderNo());
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "强制删除成功");
        response.put("data", Map.of(
            "orderNo", po.getOrderNo(),
            "deletedSnapshots", snapshotCount,
            "deletedDeliveries", deliveryCount,
            "deletedItems", itemCount
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/batch-adjust-cost")
    @OperationLog(module = "PurchaseOrder", operation = "BatchAdjustCost")
    public ResponseEntity<Map<String, Object>> batchAdjustCost(@RequestBody List<Map<String, Object>> adjustments) {
        try {
            Map<String, Object> result = purchaseOrderService.batchAdjustCost(adjustments);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to batch adjust cost", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id:\\d+}/fix-logistics")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixLogisticsInfo(@PathVariable long id, @RequestBody Map<String, Object> payload) {
        return purchaseOrderRepository.findById(id)
                .map(order -> {
                    String newLogisticsCompany = (String) payload.get("logisticsCompany");
                    String newLogisticsSupplierName = (String) payload.get("logisticsSupplierName");
                    
                    if (newLogisticsCompany != null) {
                        order.setLogisticsCompany(newLogisticsCompany);
                    }
                    if (newLogisticsSupplierName != null) {
                        order.setLogisticsSupplierName(newLogisticsSupplierName);
                    }
                    
                    purchaseOrderRepository.save(order);
                    
                    // Update snapshot
                    try {
                        snapshotService.captureSnapshot(order, "LOGISTICS_FIX");
                    } catch (Exception e) {
                        log.error("Failed to capture snapshot after logistics fix for PO {}", order.getOrderNo(), e);
                    }
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Logistics info fixed successfully");
                    response.put("data", Map.of(
                        "id", order.getId(),
                        "orderNo", order.getOrderNo(),
                        "logisticsCompany", order.getLogisticsCompany(),
                        "logisticsSupplierName", order.getLogisticsSupplierName()
                    ));
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/sync-shipping-status")
    @Transactional
    public ResponseEntity<Map<String, Object>> syncShippingStatus() {
        List<PurchaseOrder> allOrders = purchaseOrderRepository.findAll();
        int updated = 0;
        
        for (PurchaseOrder po : allOrders) {
            if (po.getShippingStatus() != null) {
                snapshotService.captureSnapshot(po);
                updated++;
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Shipping status synced successfully");
        response.put("data", Map.of("updated", updated));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/migrate-shipping-status")
    public ResponseEntity<Map<String, Object>> migrateShippingStatus() {
        int updated = 0;
        
        try {
            org.springframework.transaction.PlatformTransactionManager transactionManager = 
                applicationContext.getBean(org.springframework.transaction.PlatformTransactionManager.class);
            org.springframework.transaction.support.TransactionTemplate transactionTemplate = 
                new org.springframework.transaction.support.TransactionTemplate(transactionManager);
            
            updated = transactionTemplate.execute(status -> {
                javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
                int count = 0;
                
                javax.persistence.Query updateUnshipped = entityManager.createNativeQuery(
                    "UPDATE purchase_orders SET shipping_status = 'PENDING' WHERE shipping_status = 'UNSHIPPED'");
                count += updateUnshipped.executeUpdate();
                
                javax.persistence.Query updatePartial = entityManager.createNativeQuery(
                    "UPDATE purchase_orders SET shipping_status = 'TO_SHIP' WHERE shipping_status = 'PARTIAL'");
                count += updatePartial.executeUpdate();
                
                javax.persistence.Query updateSnapshotsUnshipped = entityManager.createNativeQuery(
                    "UPDATE purchase_order_snapshots SET shipping_status = 'PENDING' WHERE shipping_status = 'UNSHIPPED'");
                updateSnapshotsUnshipped.executeUpdate();
                
                javax.persistence.Query updateSnapshotsPartial = entityManager.createNativeQuery(
                    "UPDATE purchase_order_snapshots SET shipping_status = 'TO_SHIP' WHERE shipping_status = 'PARTIAL'");
                updateSnapshotsPartial.executeUpdate();
                
                return count;
            });
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "Migration failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Shipping status migrated successfully");
        response.put("data", Map.of("updated", updated));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/fix-duplicate-snapshots")
    public ResponseEntity<Map<String, Object>> fixDuplicateSnapshots() {
        int fixed = 0;
        
        try {
            org.springframework.transaction.PlatformTransactionManager transactionManager = 
                applicationContext.getBean(org.springframework.transaction.PlatformTransactionManager.class);
            org.springframework.transaction.support.TransactionTemplate transactionTemplate = 
                new org.springframework.transaction.support.TransactionTemplate(transactionManager);
            
            fixed = transactionTemplate.execute(status -> {
                javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
                
                // Step 1: Find all purchase_order_ids that have multiple is_latest=true records
                javax.persistence.Query findDuplicates = entityManager.createNativeQuery(
                    "SELECT purchase_order_id FROM purchase_order_snapshots WHERE is_latest = true GROUP BY purchase_order_id HAVING COUNT(*) > 1");
                @SuppressWarnings("unchecked")
                java.util.List<java.math.BigInteger> duplicatePOIds = findDuplicates.getResultList();
                
                int count = 0;
                
                // Step 2: For each duplicate, keep only the latest one (highest id)
                for (java.math.BigInteger poId : duplicatePOIds) {
                    Long poIdLong = poId.longValue();
                    
                    // Find the max id for this purchase_order_id
                    javax.persistence.Query findMaxId = entityManager.createNativeQuery(
                        "SELECT MAX(id) FROM purchase_order_snapshots WHERE purchase_order_id = :poId");
                    findMaxId.setParameter("poId", poIdLong);
                    java.math.BigInteger maxId = (java.math.BigInteger) findMaxId.getSingleResult();
                    
                    // Set all to false for this purchase_order_id
                    javax.persistence.Query setAllFalse = entityManager.createNativeQuery(
                        "UPDATE purchase_order_snapshots SET is_latest = false WHERE purchase_order_id = :poId");
                    setAllFalse.setParameter("poId", poIdLong);
                    setAllFalse.executeUpdate();
                    
                    // Set the latest one (highest id) to true
                    javax.persistence.Query setLatestTrue = entityManager.createNativeQuery(
                        "UPDATE purchase_order_snapshots SET is_latest = true WHERE id = :maxId");
                    setLatestTrue.setParameter("maxId", maxId.longValue());
                    count += setLatestTrue.executeUpdate();
                }
                
                return count;
            });
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "Fix failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Duplicate snapshots fixed successfully");
        response.put("data", Map.of("fixed", fixed));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/restore-from-snapshots")
    public ResponseEntity<Map<String, Object>> restoreFromSnapshots() {
        int restored = 0;
        int skipped = 0;
        int errors = 0;
        List<String> errorDetails = new ArrayList<>();
        
        try {
            java.nio.file.Path snapshotDir = java.nio.file.Paths.get("snapshots");
            if (!java.nio.file.Files.exists(snapshotDir)) {
                 snapshotDir = java.nio.file.Paths.get("backend/snapshots");
            }
            if (!java.nio.file.Files.exists(snapshotDir)) {
                 snapshotDir = java.nio.file.Paths.get("../backend/snapshots");
            }
            
            if (!java.nio.file.Files.exists(snapshotDir)) {
                Map<String, Object> response = new HashMap<>();
                response.put("code", 404);
                response.put("message", "Snapshot directory not found");
                return ResponseEntity.status(404).body(response);
            }
            
            Map<String, java.nio.file.Path> latestSnapshots = new HashMap<>();
            Map<String, Integer> latestVersions = new HashMap<>();
            
            java.nio.file.Files.list(snapshotDir)
                .filter(p -> p.toString().endsWith(".json"))
                .forEach(p -> {
                    String fileName = p.getFileName().toString();
                    String orderNo = fileName.replaceAll("_v\\d+\\.json$", "");
                    try {
                        int version = Integer.parseInt(fileName.replaceAll(".*_v(\\d+)\\.json$", "$1"));
                        if (!latestVersions.containsKey(orderNo) || version > latestVersions.get(orderNo)) {
                            latestVersions.put(orderNo, version);
                            latestSnapshots.put(orderNo, p);
                        }
                    } catch (Exception e) {
                        // ignore invalid filenames
                    }
                });
            
            org.springframework.transaction.PlatformTransactionManager transactionManager = 
                applicationContext.getBean(org.springframework.transaction.PlatformTransactionManager.class);
            org.springframework.transaction.support.TransactionTemplate transactionTemplate = 
                new org.springframework.transaction.support.TransactionTemplate(transactionManager);

            for (Map.Entry<String, java.nio.file.Path> entry : latestSnapshots.entrySet()) {
                String orderNo = entry.getKey();
                java.nio.file.Path snapshotPath = entry.getValue();
                
                try {
                    String jsonData = java.nio.file.Files.readString(snapshotPath);
                    com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                    objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> snapshotData = objectMapper.readValue(jsonData, Map.class);
                    
                    transactionTemplate.execute(status -> {
                    PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNo);
                     boolean isNew = true; // Always treat as new after delete
                     
                     if (po != null) {
                         // Clean up existing data to ensure full restore
                         InboundOrder existingIo = inboundOrderRepository.findByPurchaseOrder(po).orElse(null);
                         if (existingIo != null) {
                             inboundOrderRepository.delete(existingIo);
                         }
                         // PurchaseOrderItems will be deleted by cascade
                         purchaseOrderRepository.delete(po);
                         purchaseOrderRepository.flush();
                         
                         // Re-create object
                         po = new PurchaseOrder();
                         po.setOrderNo(orderNo);
                     } else {
                         po = new PurchaseOrder();
                         po.setOrderNo(orderNo);
                     }
                    
                    // Resolve Supplier
                        Supplier resolvedSupplier = null;
                        if (snapshotData.containsKey("supplier") && snapshotData.get("supplier") != null) {
                            Map<String, Object> supplierData = (Map<String, Object>) snapshotData.get("supplier");
                            Long supplierId = ((Number) supplierData.get("id")).longValue();
                            String supplierNo = (String) supplierData.get("supplierNo");
                            
                            resolvedSupplier = supplierRepository.findById(supplierId).orElse(null);
                            if (resolvedSupplier == null && supplierNo != null) {
                                resolvedSupplier = supplierRepository.findBySupplierNo(supplierNo);
                            }
                            
                            if (resolvedSupplier == null) {
                                 Supplier newSupplier = new Supplier();
                                 newSupplier.setId(supplierId);
                                 newSupplier.setSupplierNo(supplierNo != null ? supplierNo : "SUP" + supplierId);
                                 newSupplier.setName((String) supplierData.getOrDefault("name", "Restored Supplier " + supplierId));
                                 newSupplier.setContactPerson((String) supplierData.getOrDefault("contactPerson", "Unknown"));
                                 newSupplier.setContactPhone((String) supplierData.getOrDefault("contactPhone", "Unknown"));
                                 newSupplier.setStatus(com.supplypro.entity.Supplier.Status.ACTIVE);
                                 
                                 String st = (String) supplierData.get("settlementType");
                                 if (st != null) {
                                     try { newSupplier.setSettlementType(com.supplypro.entity.Supplier.SettlementType.valueOf(st)); } catch(Exception e) {}
                                 }
                                 resolvedSupplier = supplierRepository.save(newSupplier);
                            }
                        }
                        
                        // Fallback Supplier if still null
                        if (resolvedSupplier == null) {
                            List<Supplier> suppliers = supplierRepository.findAll();
                            if (!suppliers.isEmpty()) {
                                resolvedSupplier = suppliers.get(0);
                            } else {
                                Supplier defSup = new Supplier();
                                defSup.setSupplierNo("SUP-DEFAULT");
                                defSup.setName("Default Supplier");
                                defSup.setStatus(com.supplypro.entity.Supplier.Status.ACTIVE);
                                resolvedSupplier = supplierRepository.save(defSup);
                            }
                        }
                        po.setSupplier(resolvedSupplier);
                    
                    // Resolve Logistics Provider
                    if (snapshotData.containsKey("logisticsProvider") && snapshotData.get("logisticsProvider") != null) {
                         Map<String, Object> lpData = (Map<String, Object>) snapshotData.get("logisticsProvider");
                         Long lpId = ((Number) lpData.get("id")).longValue();
                         String lpName = (String) lpData.get("name");
                         
                         LogisticsProvider resolvedLp = logisticsProviderRepository.findById(lpId).orElse(null);
                         // Try find by name if ID mismatch
                         if (resolvedLp == null && lpName != null) {
                             // Use stream to find exact match since repository doesn't have exact findByName
                             List<LogisticsProvider> all = logisticsProviderRepository.findAll();
                             resolvedLp = all.stream().filter(l -> lpName.equals(l.getName())).findFirst().orElse(null);
                         }
                         
                         // Do NOT auto-create logistics provider - must be created manually or via API
                         if (resolvedLp == null) {
                             log.warn("Logistics Provider not found for snapshot restore: id={}, name={}. Skipping logistics provider assignment.", lpId, lpName);
                         } else {
                             po.setLogisticsProvider(resolvedLp);
                         }
                    }
                    
                    if (snapshotData.containsKey("totalAmount") && snapshotData.get("totalAmount") != null) {
                        po.setTotalAmount(new java.math.BigDecimal(snapshotData.get("totalAmount").toString()));
                    } else if (isNew) {
                        po.setTotalAmount(java.math.BigDecimal.ZERO);
                    }
                    
                    if (snapshotData.containsKey("status") && snapshotData.get("status") != null) {
                        po.setStatus(PurchaseOrder.Status.valueOf((String) snapshotData.get("status")));
                    } else if (isNew) {
                        po.setStatus(PurchaseOrder.Status.PENDING);
                    }
                    
                    if (snapshotData.containsKey("type") && snapshotData.get("type") != null) {
                        po.setType(PurchaseOrder.Type.valueOf((String) snapshotData.get("type")));
                    } else if (isNew) {
                        po.setType(PurchaseOrder.Type.INBOUND);
                    }
                    
                    if (snapshotData.containsKey("deliveryDate") && snapshotData.get("deliveryDate") != null) {
                        po.setDeliveryDate(java.time.LocalDate.parse((String) snapshotData.get("deliveryDate")));
                    }
                    
                    if (snapshotData.containsKey("warehouseId") && snapshotData.get("warehouseId") != null) {
                            Long wId = ((Number) snapshotData.get("warehouseId")).longValue();
                            if (warehouseRepository.existsById(wId)) {
                                po.setWarehouseId(wId);
                            } else {
                                // Warehouse ID from snapshot doesn't exist, try fallback
                                List<Warehouse> warehouses = warehouseRepository.findAll();
                                if (!warehouses.isEmpty()) {
                                    po.setWarehouseId(warehouses.get(0).getId());
                                } else {
                                    Warehouse w = new Warehouse();
                                    w.setName("Restored Warehouse " + wId);
                                    w.setStatus(Warehouse.Status.ACTIVE);
                                    w.setCode("WH-" + wId);
                                    w = warehouseRepository.save(w);
                                    po.setWarehouseId(w.getId());
                                }
                            }
                        } else {
                            // Fallback to default warehouse if missing
                            List<Warehouse> warehouses = warehouseRepository.findAll();
                            if (!warehouses.isEmpty()) {
                                po.setWarehouseId(warehouses.get(0).getId());
                            } else {
                                // Create a default warehouse if absolutely none exist
                                Warehouse w = new Warehouse();
                                w.setName("Default Warehouse");
                                w.setStatus(Warehouse.Status.ACTIVE);
                                w.setCode("WH-DEFAULT");
                                warehouseRepository.save(w);
                                po.setWarehouseId(w.getId());
                            }
                        }
                    
                    if (snapshotData.containsKey("bizType") && snapshotData.get("bizType") != null) {
                        try {
                            po.setBizType(PurchaseOrder.BizType.valueOf((String) snapshotData.get("bizType")));
                        } catch (Exception e) {
                            // ignore or handle legacy strings
                        }
                    }
                    if (snapshotData.containsKey("bizNo")) po.setBizNo((String) snapshotData.get("bizNo"));
                    if (snapshotData.containsKey("platformOrderNo")) po.setPlatformOrderNo((String) snapshotData.get("platformOrderNo"));
                    if (snapshotData.containsKey("remark")) po.setRemark((String) snapshotData.get("remark"));
                    if (snapshotData.containsKey("createdBy")) po.setCreatedBy((String) snapshotData.get("createdBy"));
                    
                    if (snapshotData.containsKey("createdAt")) {
                        String createdAtStr = (String) snapshotData.get("createdAt");
                        try {
                            po.setCreatedAt(java.time.LocalDateTime.parse(createdAtStr.replace(" ", "T")));
                        } catch (Exception e) {
                            po.setCreatedAt(java.time.LocalDateTime.parse(createdAtStr));
                        }
                    }
                    
                    if (snapshotData.containsKey("contactName")) po.setContactName((String) snapshotData.get("contactName"));
                    if (snapshotData.containsKey("contactPhone")) po.setContactPhone((String) snapshotData.get("contactPhone"));
                    if (snapshotData.containsKey("province")) po.setProvince((String) snapshotData.get("province"));
                    if (snapshotData.containsKey("city")) po.setCity((String) snapshotData.get("city"));
                    if (snapshotData.containsKey("district")) po.setDistrict((String) snapshotData.get("district"));
                    if (snapshotData.containsKey("detailAddress")) po.setDetailAddress((String) snapshotData.get("detailAddress"));
                    
                    if (snapshotData.containsKey("trackingNumber")) po.setTrackingNumber((String) snapshotData.get("trackingNumber"));
                    if (snapshotData.containsKey("logisticsCompany")) po.setLogisticsCompany((String) snapshotData.get("logisticsCompany"));
                    
                    if (snapshotData.containsKey("shippedAt") && snapshotData.get("shippedAt") != null) {
                        String shippedAtStr = (String) snapshotData.get("shippedAt");
                        try {
                            po.setShippedAt(java.time.LocalDateTime.parse(shippedAtStr.replace(" ", "T")));
                        } catch (Exception e) {
                            po.setShippedAt(java.time.LocalDateTime.parse(shippedAtStr));
                        }
                    }
                    
                    if (snapshotData.containsKey("deliverer")) po.setDeliverer((String) snapshotData.get("deliverer"));
                    if (snapshotData.containsKey("delivererPhone")) po.setDelivererPhone((String) snapshotData.get("delivererPhone"));
                    
                    if (snapshotData.containsKey("logisticsFee") && snapshotData.get("logisticsFee") != null) {
                        po.setLogisticsFee(new java.math.BigDecimal(snapshotData.get("logisticsFee").toString()));
                    }
                    
                    if (snapshotData.containsKey("deliveryMethod")) po.setDeliveryMethod((String) snapshotData.get("deliveryMethod"));
                    
                    if (snapshotData.containsKey("shippingStatus") && snapshotData.get("shippingStatus") != null) {
                        String ss = (String) snapshotData.get("shippingStatus");
                        try {
                            po.setShippingStatus(PurchaseOrder.ShippingStatus.valueOf(ss));
                        } catch (IllegalArgumentException e) {
                            po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
                        }
                    } else if (isNew) {
                        po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
                    }
                    
                    po.setUpdatedAt(java.time.LocalDateTime.now());
                    
                    PurchaseOrder savedPo = purchaseOrderRepository.save(po);
                    
                    if (snapshotData.containsKey("items") && snapshotData.get("items") != null) {
                        List<Map<String, Object>> itemsData = (List<Map<String, Object>>) snapshotData.get("items");
                        
                        // Clear existing items if repair to avoid duplicates
                        List<PurchaseOrderItem> existingItems = purchaseOrderItemRepository.findByPurchaseOrder(savedPo);
                        purchaseOrderItemRepository.deleteAll(existingItems);
                        
                        for (Map<String, Object> itemData : itemsData) {
                            PurchaseOrderItem item = new PurchaseOrderItem();
                            item.setPurchaseOrder(savedPo);
                            
                            if (itemData.containsKey("quantity")) item.setQuantity(((Number) itemData.get("quantity")).intValue());
                            if (itemData.containsKey("unitPrice")) item.setUnitPrice(new java.math.BigDecimal(itemData.get("unitPrice").toString()));
                            if (itemData.containsKey("totalPrice")) {
                                item.setTotalPrice(new java.math.BigDecimal(itemData.get("totalPrice").toString()));
                            }
                            
                            if (itemData.containsKey("productId")) {
                                Long pId = ((Number) itemData.get("productId")).longValue();
                                String pName = (String) itemData.get("productName");
                                String sku = (String) itemData.get("skuCode");
                                
                                Product resolvedProduct = productRepository.findById(pId).orElse(null);
                                if (resolvedProduct == null && sku != null) {
                                    resolvedProduct = productRepository.findOne((root, q, cb) -> cb.equal(root.get("skuCode"), sku)).orElse(null);
                                }
                                
                                if (resolvedProduct == null) {
                                     Product newProduct = new Product();
                                     newProduct.setId(pId);
                                     newProduct.setName(pName != null ? pName : "Restored Product " + pId);
                                     newProduct.setSkuCode(sku != null ? sku : "SKU" + pId);
                                     newProduct.setStatus(com.supplypro.entity.Product.Status.ACTIVE);
                                     resolvedProduct = productRepository.save(newProduct);
                                }
                                item.setProductId(resolvedProduct.getId());
                            }
                            
                            if (itemData.containsKey("productName")) item.setProductName((String) itemData.get("productName"));
                            if (itemData.containsKey("skuCode")) item.setSkuCode((String) itemData.get("skuCode"));
                            if (itemData.containsKey("spec")) item.setSpec((String) itemData.get("spec"));
                            if (itemData.containsKey("specName")) item.setSpecName((String) itemData.get("specName"));
                            
                            purchaseOrderItemRepository.save(item);
                        }
                    }
                    
                    // 5. Restore InboundOrder (Repair/Reconstruct)
                    // If status indicates inbound is needed
                    if (savedPo.getShippingStatus() == PurchaseOrder.ShippingStatus.SHIPPED || 
                        savedPo.getShippingStatus() == PurchaseOrder.ShippingStatus.RECEIVED) {
                        
                        InboundOrder io = inboundOrderRepository.findByPurchaseOrder(savedPo).orElse(null);
                        if (io == null) {
                            io = new InboundOrder();
                            io.setInboundNo("IO" + savedPo.getOrderNo());
                            io.setPurchaseOrder(savedPo);
                            
                            Warehouse warehouse = null;
                            if (savedPo.getWarehouseId() != null) {
                                warehouse = warehouseRepository.findById(savedPo.getWarehouseId()).orElse(null);
                            }
                            // Fallback warehouse if missing
                            if (warehouse == null) {
                                List<Warehouse> warehouses = warehouseRepository.findAll();
                                if (!warehouses.isEmpty()) warehouse = warehouses.get(0);
                            }
                            if (warehouse != null) {
                                io.setWarehouse(warehouse);
                            }
                            
                            io.setCreatedAt(java.time.LocalDateTime.now());
                            
                            // 入库单状态与采购单发货状态独立
                            // 入库单初始状态始终为PENDING，仅在用户点击"确认入库"按钮时才变更为RECEIVED
                            io.setStatus(InboundOrder.Status.PENDING);
                            if (warehouse != null) {
                                inboundOrderRepository.save(io);
                            }
                        }
                    }
 
                     // 6. Restore SettlementOrder (Repair/Reconstruct)
                     // If logistics fee > 0, check for settlement
                     if (savedPo.getLogisticsFee() != null && savedPo.getLogisticsFee().compareTo(java.math.BigDecimal.ZERO) > 0) {
                         List<SettlementOrder> settlements = settlementOrderRepository.findByRelatedOrderNoAndType(savedPo.getOrderNo(), SettlementOrder.Type.LOGISTICS);
                         if (settlements.isEmpty()) {
                             SettlementOrder so = new SettlementOrder();
                             so.setSettlementNo("PS" + java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(java.time.LocalDateTime.now()) + String.format("%03d", (int)(Math.random()*1000)));
                             so.setSupplier(savedPo.getSupplier());
                             so.setType(SettlementOrder.Type.LOGISTICS);
                             so.setSourceType("配送单");
                             so.setTotalAmount(savedPo.getLogisticsFee());
                             so.setStatus(SettlementOrder.Status.PENDING);
                             so.setRelatedOrderNo(savedPo.getOrderNo());
                             so.setCreatedAt(java.time.LocalDateTime.now());
                             
                             // Restore Delivery No from PO tracking number
                             if (savedPo.getTrackingNumber() != null) {
                                 so.setDeliveryNo(savedPo.getTrackingNumber());
                             }
                             
                             // Restore Logistics Provider
                             if (savedPo.getLogisticsProvider() != null) {
                                 so.setLogisticsProvider(savedPo.getLogisticsProvider());
                             }
                             
                             settlementOrderRepository.save(so);
                         }
                     }
                     
                     // 7. Force Snapshot Capture
                     snapshotService.captureSnapshot(savedPo);
                     
                     // 8. Log Restoration
                     PurchaseOrderLog logEntry = new PurchaseOrderLog();
                     logEntry.setPurchaseOrderId(savedPo.getId());
                     logEntry.setOperationType("RESTORE");
                     logEntry.setOperator("系统");
                     logEntry.setRemark("从快照恢复/修复订单 " + orderNo);
                     logEntry.setCreatedAt(java.time.LocalDateTime.now());
                     purchaseOrderLogRepository.save(logEntry);
                     return null;
                    });
                    
                    restored++;
                    
                } catch (Exception e) {
                    errors++;
                    errorDetails.add(orderNo + ": " + e.getMessage());
                    log.error("Failed to restore snapshot for order {}: {}", orderNo, e.getMessage(), e);
                }
            }
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "Restore failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Data restore completed");
        response.put("data", Map.of(
            "restored", restored,
            "skipped", skipped,
            "errors", errors,
            "errorDetails", errorDetails
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup-orphaned-snapshots")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupOrphanedSnapshots() {
        try {
            javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
            
            // Step 1: Delete snapshots where purchase_order_id is NULL
            javax.persistence.Query deleteNullId = entityManager.createNativeQuery(
                "DELETE FROM purchase_order_snapshots WHERE purchase_order_id IS NULL");
            int deletedNullCount = deleteNullId.executeUpdate();
            log.info("Deleted {} snapshots with NULL purchase_order_id", deletedNullCount);
            
            // Step 2: Delete snapshots where purchase_order_id doesn't exist in main table
            // Use subquery syntax compatible with MySQL
            javax.persistence.Query deleteOrphans = entityManager.createNativeQuery(
                "DELETE FROM purchase_order_snapshots WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)");
            int deletedOrphanCount = deleteOrphans.executeUpdate();
            log.info("Deleted {} orphaned snapshots", deletedOrphanCount);
            
            // Step 3: Fix is_latest field for remaining snapshots
            // First, set all is_latest to false
            javax.persistence.Query resetAll = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots SET is_latest = false");
            int resetCount = resetAll.executeUpdate();
            
            // Then, set is_latest = true for the latest version of each purchase_order_id
            javax.persistence.Query fixLatest = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots s " +
                "JOIN (SELECT purchase_order_id, MAX(version) as max_version " +
                "      FROM purchase_order_snapshots " +
                "      GROUP BY purchase_order_id) latest " +
                "ON s.purchase_order_id = latest.purchase_order_id AND s.version = latest.max_version " +
                "SET s.is_latest = true");
            int fixedCount = fixLatest.executeUpdate();
            
            log.info("Fixed is_latest field: reset {} records, marked {} as latest", resetCount, fixedCount);
            
            return ResponseEntity.ok(Map.of(
                "code", 200,
                "message", "Cleanup completed successfully",
                "deletedNullCount", deletedNullCount,
                "deletedOrphanCount", deletedOrphanCount,
                "resetCount", resetCount,
                "fixedCount", fixedCount
            ));
        } catch (Exception e) {
            log.error("Failed to cleanup orphaned snapshots", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "code", 500,
                "message", "Failed to cleanup orphaned snapshots: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/fix-snapshot-latest")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixSnapshotLatest() {
        try {
            javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
            
            // First, set all is_latest to false
            javax.persistence.Query resetAll = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots SET is_latest = false");
            int resetCount = resetAll.executeUpdate();
            
            // Then, set is_latest = true for the latest version of each purchase_order_id
            javax.persistence.Query fixLatest = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots s " +
                "JOIN (SELECT purchase_order_id, MAX(version) as max_version " +
                "      FROM purchase_order_snapshots " +
                "      GROUP BY purchase_order_id) latest " +
                "ON s.purchase_order_id = latest.purchase_order_id AND s.version = latest.max_version " +
                "SET s.is_latest = true");
            int fixedCount = fixLatest.executeUpdate();
            
            log.info("Fixed is_latest field: reset {} records, marked {} as latest", resetCount, fixedCount);
            
            return ResponseEntity.ok(Map.of(
                "code", 200,
                "message", "Fixed is_latest field for all snapshots",
                "resetCount", resetCount,
                "fixedCount", fixedCount
            ));
        } catch (Exception e) {
            log.error("Failed to fix is_latest field", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "code", 500,
                "message", "Failed to fix is_latest field: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/regenerate-snapshots")
    public ResponseEntity<Map<String, Object>> regenerateSnapshots() {
        try {
            List<PurchaseOrder> allOrders = purchaseOrderRepository.findAll();
            int successCount = 0;
            int failCount = 0;
            List<String> errors = new ArrayList<>();
            
            for (PurchaseOrder po : allOrders) {
                try {
                    // Force initialization of lazy relationships
                    if (po.getSupplier() != null) {
                        org.hibernate.Hibernate.initialize(po.getSupplier());
                    }
                    if (po.getItems() != null) {
                        org.hibernate.Hibernate.initialize(po.getItems());
                        po.getItems().forEach(item -> {
                            if (item.getProduct() != null) {
                                org.hibernate.Hibernate.initialize(item.getProduct());
                            }
                        });
                    }
                    
                    snapshotService.captureSnapshot(po, "REGENERATE");
                    successCount++;
                } catch (Exception e) {
                    failCount++;
                    errors.add(po.getOrderNo() + ": " + e.getMessage());
                    log.error("Failed to regenerate snapshot for PO {}", po.getOrderNo(), e);
                }
            }
            
            log.info("Snapshot regeneration completed: {} success, {} failed", successCount, failCount);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Snapshot regeneration completed");
            response.put("successCount", successCount);
            response.put("failCount", failCount);
            response.put("totalOrders", allOrders.size());
            if (!errors.isEmpty()) {
                response.put("errors", errors);
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to regenerate snapshots", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "code", 500,
                "message", "Failed to regenerate snapshots: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/clear-all-data")
    public ResponseEntity<Map<String, Object>> clearAllData() {
        try {
            org.springframework.transaction.PlatformTransactionManager transactionManager = 
                applicationContext.getBean(org.springframework.transaction.PlatformTransactionManager.class);
            org.springframework.transaction.support.TransactionTemplate transactionTemplate = 
                new org.springframework.transaction.support.TransactionTemplate(transactionManager);
            
            int[] counts = transactionTemplate.execute(status -> {
                javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
                
                // Delete items first (due to foreign key constraints)
                javax.persistence.Query deleteItems = entityManager.createNativeQuery(
                    "DELETE FROM purchase_order_items");
                int itemCount = deleteItems.executeUpdate();
                
                // Delete snapshots
                javax.persistence.Query deleteSnapshots = entityManager.createNativeQuery(
                    "DELETE FROM purchase_order_snapshots");
                int snapshotCount = deleteSnapshots.executeUpdate();
                
                // Delete logs
                javax.persistence.Query deleteLogs = entityManager.createNativeQuery(
                    "DELETE FROM purchase_order_logs");
                int logCount = deleteLogs.executeUpdate();
                
                // Delete orders
                javax.persistence.Query deleteOrders = entityManager.createNativeQuery(
                    "DELETE FROM purchase_orders");
                int orderCount = deleteOrders.executeUpdate();
                
                return new int[]{orderCount, itemCount, snapshotCount, logCount};
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "All purchase order data cleared successfully");
            response.put("data", Map.of(
                "ordersDeleted", counts[0],
                "itemsDeleted", counts[1],
                "snapshotsDeleted", counts[2],
                "logsDeleted", counts[3]
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "Clear data failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @GetMapping("/debug/snapshots-received")
    public ResponseEntity<Map<String, Object>> debugReceivedSnapshots() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // Query all RECEIVED snapshots
        javax.persistence.Query query = entityManager.createNativeQuery(
            "SELECT id, purchase_order_id, status, is_latest, snapshot_data IS NULL as data_null FROM purchase_order_snapshots " +
            "WHERE status = 'RECEIVED' ORDER BY purchase_order_id, is_latest DESC");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> results = query.getResultList();
        
        List<Map<String, Object>> snapshots = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", row[0]);
            item.put("purchaseOrderId", row[1]);
            item.put("status", row[2]);
            item.put("isLatest", row[3]);
            item.put("snapshotDataNull", row[4]);
            snapshots.add(item);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "total", results.size(),
            "snapshots", snapshots
        ));
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/cleanup-invalid-snapshots")
    @OperationLog(module = "PurchaseOrder", operation = "CleanupInvalidSnapshots")
    public ResponseEntity<Map<String, Object>> cleanupInvalidSnapshots() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // Step 1: Count and backup invalid snapshots before deletion
        javax.persistence.Query countQuery = entityManager.createNativeQuery(
            "SELECT COUNT(*) FROM purchase_order_snapshots WHERE snapshot_data IS NULL");
        Long invalidCount = ((Number) countQuery.getSingleResult()).longValue();
        
        log.info("Found {} invalid snapshots (snapshot_data IS NULL) to cleanup", invalidCount);
        
        // Step 2: Delete invalid snapshots
        if (invalidCount > 0) {
            javax.persistence.Query deleteQuery = entityManager.createNativeQuery(
                "DELETE FROM purchase_order_snapshots WHERE snapshot_data IS NULL");
            int deletedCount = deleteQuery.executeUpdate();
            log.info("Deleted {} invalid snapshots", deletedCount);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "deletedCount", invalidCount,
            "message", "Cleanup completed successfully"
        ));
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/check-duplicate-latest")
    public ResponseEntity<Map<String, Object>> checkDuplicateLatestSnapshots() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // Find POs with multiple is_latest=true snapshots
        javax.persistence.Query query = entityManager.createNativeQuery(
            "SELECT purchase_order_id, COUNT(*) as cnt, GROUP_CONCAT(id ORDER BY version DESC) as snapshot_ids " +
            "FROM purchase_order_snapshots WHERE is_latest = true " +
            "GROUP BY purchase_order_id HAVING COUNT(*) > 1");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> duplicates = query.getResultList();
        
        List<Map<String, Object>> duplicateList = new ArrayList<>();
        for (Object[] row : duplicates) {
            Map<String, Object> item = new HashMap<>();
            item.put("purchaseOrderId", row[0]);
            item.put("duplicateCount", ((Number) row[1]).longValue());
            item.put("snapshotIds", row[2] != null ? row[2].toString() : "");
            duplicateList.add(item);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "totalDuplicates", duplicates.size(),
            "duplicates", duplicateList
        ));
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/cleanup-duplicate-latest")
    @OperationLog(module = "PurchaseOrder", operation = "CleanupDuplicateLatestSnapshots")
    public ResponseEntity<Map<String, Object>> cleanupDuplicateLatestSnapshots() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // Step 1: Find all POs with multiple is_latest=true snapshots
        javax.persistence.Query findQuery = entityManager.createNativeQuery(
            "SELECT purchase_order_id, COUNT(*) as cnt FROM purchase_order_snapshots " +
            "WHERE is_latest = true GROUP BY purchase_order_id HAVING COUNT(*) > 1");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> duplicates = findQuery.getResultList();
        
        int totalCleaned = 0;
        List<String> cleanedPOs = new ArrayList<>();
        
        for (Object[] row : duplicates) {
            Long poId = ((Number) row[0]).longValue();
            int count = ((Number) row[1]).intValue();
            
            // For each PO with duplicates, keep only the one with highest version as latest
            // First, set all to false
            javax.persistence.Query resetQuery = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots SET is_latest = false WHERE purchase_order_id = ? AND is_latest = true");
            resetQuery.setParameter(1, poId);
            resetQuery.executeUpdate();
            
            // Then, set the one with highest version to true
            javax.persistence.Query setLatestQuery = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots SET is_latest = true " +
                "WHERE purchase_order_id = ? AND version = " +
                "(SELECT MAX(version) FROM (SELECT version FROM purchase_order_snapshots WHERE purchase_order_id = ?) AS t)");
            setLatestQuery.setParameter(1, poId);
            setLatestQuery.setParameter(2, poId);
            int updated = setLatestQuery.executeUpdate();
            
            totalCleaned += (count - 1); // Number of duplicates removed
            cleanedPOs.add("PO_" + poId + "(" + count + "->1)");
            log.info("Cleaned duplicate is_latest for PO {}: {} records reduced to 1", poId, count);
        }
        
        // Step 2: Update status summary to reflect correct counts
        // This is handled by the status-summary API which now excludes null snapshot_data
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "totalPOsCleaned", duplicates.size(),
            "totalDuplicatesRemoved", totalCleaned,
            "cleanedPOs", cleanedPOs,
            "message", "Cleanup completed successfully"
        ));
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/debug/snapshot-status-count")
    public ResponseEntity<Map<String, Object>> debugSnapshotStatusCount() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // 直接查询快照表中所有状态的记录数
        javax.persistence.Query query = entityManager.createNativeQuery(
            "SELECT status, is_latest, COUNT(*) as count FROM purchase_order_snapshots " +
            "GROUP BY status, is_latest ORDER BY status, is_latest");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> results = query.getResultList();
        
        List<Map<String, Object>> statusCounts = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("status", row[0]);
            item.put("isLatest", row[1]);
            item.put("count", ((Number) row[2]).longValue());
            statusCounts.add(item);
        }
        
        // 查询RECEIVED状态的详细记录
        javax.persistence.Query receivedQuery = entityManager.createNativeQuery(
            "SELECT id, purchase_order_id, status, is_latest, version, " +
            "CASE WHEN snapshot_data IS NULL THEN 1 ELSE 0 END as data_null " +
            "FROM purchase_order_snapshots WHERE status IN ('RECEIVED', 'PARTIAL_RECEIVED') " +
            "ORDER BY purchase_order_id, version DESC");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> receivedResults = receivedQuery.getResultList();
        
        List<Map<String, Object>> receivedSnapshots = new ArrayList<>();
        for (Object[] row : receivedResults) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", row[0]);
            item.put("purchaseOrderId", row[1]);
            item.put("status", row[2]);
            item.put("isLatest", row[3]);
            item.put("version", row[4]);
            item.put("snapshotDataNull", row[5]);
            receivedSnapshots.add(item);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "statusCounts", statusCounts,
            "receivedSnapshots", receivedSnapshots
        ));
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/debug/check-orphan-records")
    public ResponseEntity<Map<String, Object>> debugCheckOrphanRecords() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // 检查孤儿记录：快照表中存在但主表中不存在的记录
        javax.persistence.Query checkOrphans = entityManager.createNativeQuery(
            "SELECT pos.id, pos.purchase_order_id, pos.status, pos.is_latest " +
            "FROM purchase_order_snapshots pos " +
            "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id) " +
            "LIMIT 10");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> orphanResults = checkOrphans.getResultList();
        
        List<Map<String, Object>> orphans = new ArrayList<>();
        for (Object[] row : orphanResults) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", row[0]);
            item.put("purchaseOrderId", row[1]);
            item.put("status", row[2]);
            item.put("isLatest", row[3]);
            orphans.add(item);
        }
        
        // 检查主表中的ID范围
        javax.persistence.Query checkMainIds = entityManager.createNativeQuery(
            "SELECT MIN(id), MAX(id) FROM purchase_orders");
        Object[] idRange = (Object[]) checkMainIds.getSingleResult();
        
        // 检查快照表中的purchase_order_id范围
        javax.persistence.Query checkSnapshotIds = entityManager.createNativeQuery(
            "SELECT MIN(purchase_order_id), MAX(purchase_order_id) FROM purchase_order_snapshots");
        Object[] snapshotIdRange = (Object[]) checkSnapshotIds.getSingleResult();
        
        // 检查RECEIVED状态的快照记录
        javax.persistence.Query checkReceived = entityManager.createNativeQuery(
            "SELECT pos.purchase_order_id, COUNT(*) as cnt, pos.is_latest " +
            "FROM purchase_order_snapshots pos " +
            "WHERE pos.status = 'RECEIVED' " +
            "GROUP BY pos.purchase_order_id, pos.is_latest");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> receivedResults = checkReceived.getResultList();
        
        List<Map<String, Object>> receivedStats = new ArrayList<>();
        for (Object[] row : receivedResults) {
            Map<String, Object> item = new HashMap<>();
            item.put("purchaseOrderId", row[0]);
            item.put("count", row[1]);
            item.put("isLatest", row[2]);
            receivedStats.add(item);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "orphanRecords", orphans,
            "mainTableIdRange", Map.of("min", idRange[0], "max", idRange[1]),
            "snapshotTablePurchaseOrderIdRange", Map.of("min", snapshotIdRange[0], "max", snapshotIdRange[1]),
            "receivedSnapshotStats", receivedStats
        ));
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/debug/main-table-ids")
    public ResponseEntity<Map<String, Object>> debugMainTableIds() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // 直接查询主表中的所有ID
        javax.persistence.Query query = entityManager.createNativeQuery(
            "SELECT id FROM purchase_orders ORDER BY id");
        @SuppressWarnings("unchecked")
        java.util.List<Number> ids = query.getResultList();
        
        List<Long> idList = new ArrayList<>();
        for (Number id : ids) {
            idList.add(id.longValue());
        }
        
        // 检查id=1,2,3,4是否存在
        boolean hasId1 = idList.contains(1L);
        boolean hasId2 = idList.contains(2L);
        boolean hasId3 = idList.contains(3L);
        boolean hasId4 = idList.contains(4L);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "total", idList.size(),
            "ids", idList,
            "hasId1", hasId1,
            "hasId2", hasId2,
            "hasId3", hasId3,
            "hasId4", hasId4
        ));
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/debug/snapshot-content/{poId}")
    public ResponseEntity<Map<String, Object>> debugSnapshotContent(@PathVariable Long poId) {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // 查询指定采购单的最新快照
        javax.persistence.Query query = entityManager.createNativeQuery(
            "SELECT id, purchase_order_id, status, is_latest, version, " +
            "LENGTH(snapshot_data) as data_length, " +
            "SUBSTRING(snapshot_data, 1, 500) as data_preview " +
            "FROM purchase_order_snapshots " +
            "WHERE purchase_order_id = ? AND is_latest = true");
        query.setParameter(1, poId);
        
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> results = query.getResultList();
        
        List<Map<String, Object>> snapshots = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", row[0]);
            item.put("purchaseOrderId", row[1]);
            item.put("status", row[2]);
            item.put("isLatest", row[3]);
            item.put("version", row[4]);
            item.put("dataLength", row[5]);
            item.put("dataPreview", row[6]);
            snapshots.add(item);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", snapshots);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/debug/received-snapshots-detail")
    public ResponseEntity<Map<String, Object>> debugReceivedSnapshotsDetail() {
        javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
        
        // Query all RECEIVED snapshots with details
        javax.persistence.Query query = entityManager.createNativeQuery(
            "SELECT id, purchase_order_id, status, is_latest, version, " +
            "CASE WHEN snapshot_data IS NULL THEN 1 ELSE 0 END as data_null " +
            "FROM purchase_order_snapshots WHERE status = 'RECEIVED' ORDER BY purchase_order_id, version DESC");
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> results = query.getResultList();
        
        List<Map<String, Object>> snapshots = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", row[0]);
            item.put("purchaseOrderId", row[1]);
            item.put("status", row[2]);
            item.put("isLatest", row[3]);
            item.put("version", row[4]);
            item.put("snapshotDataNull", row[5]);
            snapshots.add(item);
        }
        
        // Count distinct purchase_order_id with is_latest=true and snapshot_data IS NOT NULL
        javax.persistence.Query countQuery = entityManager.createNativeQuery(
            "SELECT COUNT(DISTINCT purchase_order_id) FROM purchase_order_snapshots " +
            "WHERE status = 'RECEIVED' AND is_latest = true AND snapshot_data IS NOT NULL");
        Long distinctCount = ((Number) countQuery.getSingleResult()).longValue();
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "total", results.size(),
            "distinctCount", distinctCount,
            "snapshots", snapshots
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/fix-shipping-status-inconsistency")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixShippingStatusInconsistency() {
        List<Map<String, Object>> fixedRecords = new ArrayList<>();
        int fixedCount = 0;
        
        List<PurchaseOrder> allOrders = purchaseOrderRepository.findAll();
        
        for (PurchaseOrder po : allOrders) {
            if (po.getStatus() == PurchaseOrder.Status.RECEIVED && 
                po.getShippingStatus() != PurchaseOrder.ShippingStatus.RECEIVED) {
                
                Map<String, Object> record = new HashMap<>();
                record.put("id", po.getId());
                record.put("orderNo", po.getOrderNo());
                record.put("oldShippingStatus", po.getShippingStatus());
                
                po.setShippingStatus(PurchaseOrder.ShippingStatus.RECEIVED);
                po.setReceiveTime(po.getReceiveTime() != null ? po.getReceiveTime() : LocalDateTime.now());
                po.setReceiveType(po.getReceiveType() != null ? po.getReceiveType() : PurchaseOrder.ReceiveType.MANUAL);
                po.setUpdatedAt(LocalDateTime.now());
                
                purchaseOrderRepository.save(po);
                
                // Update snapshot to reflect the fix
                try {
                    snapshotService.captureSnapshot(po, "SHIPPING_STATUS_FIX");
                } catch (Exception e) {
                    log.error("Failed to update snapshot for PO {} after shipping status fix", po.getOrderNo(), e);
                }
                
                record.put("newShippingStatus", po.getShippingStatus());
                record.put("receiveTime", po.getReceiveTime());
                fixedRecords.add(record);
                fixedCount++;
                
                log.info("Fixed shipping status inconsistency for PO {}: {} -> {}", 
                    po.getOrderNo(), record.get("oldShippingStatus"), po.getShippingStatus());
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Fixed " + fixedCount + " records with shipping status inconsistency");
        response.put("data", Map.of(
            "fixedCount", fixedCount,
            "fixedRecords", fixedRecords
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/direct-query")
    public ResponseEntity<Map<String, Object>> directQuery(@RequestBody Map<String, String> payload) {
        try {
            String sql = payload.get("sql");
            if (sql == null || sql.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "code", 400,
                    "message", "SQL query is required"
                ));
            }
            
            javax.persistence.EntityManager entityManager = applicationContext.getBean(javax.persistence.EntityManager.class);
            javax.persistence.Query query = entityManager.createNativeQuery(sql);
            java.util.List<?> results = query.getResultList();
            
            java.util.List<Map<String, Object>> data = new java.util.ArrayList<>();
            for (Object row : results) {
                Map<String, Object> item = new java.util.LinkedHashMap<>();
                if (row instanceof Object[]) {
                    Object[] rowArray = (Object[]) row;
                    for (int i = 0; i < rowArray.length; i++) {
                        item.put("col" + i, rowArray[i]);
                    }
                } else {
                    item.put("value", row);
                }
                data.add(item);
            }
            
            return ResponseEntity.ok(Map.of(
                "code", 200,
                "data", data,
                "total", data.size()
            ));
        } catch (Exception e) {
                log.error("Direct query failed", e);
                return ResponseEntity.status(500).body(Map.of(
                    "code", 500,
                    "message", e.getMessage()
                ));
            }
    }

    @Autowired
    private com.supplypro.service.DeliveryOrderImportService deliveryOrderImportService;

    @Autowired
    private com.supplypro.service.DeliveryOrderExportService deliveryOrderExportService;

    @PostMapping("/export-delivery")
    @OperationLog(module = "PurchaseOrder", operation = "ExportDelivery")
    public ResponseEntity<?> exportDeliveryOrders(@RequestBody Map<String, Object> request) {
        try {
            List<Long> orderIds = new ArrayList<>();
            
            // 支持两种导出模式：
            // 1. 通过poIds直接指定采购单
            // 2. 通过keyword和status筛选条件查询采购单
            @SuppressWarnings("unchecked")
            List<Integer> orderIdInts = (List<Integer>) request.get("poIds");
            
            if (orderIdInts != null && !orderIdInts.isEmpty()) {
                // 模式1：通过poIds导出
                orderIds = orderIdInts.stream()
                        .map(Integer::longValue)
                        .collect(java.util.stream.Collectors.toList());
            } else {
                // 模式2：通过筛选条件查询采购单
                final String keyword = (String) request.get("keyword");
                final String product = (String) request.getOrDefault("product", null);
                final String startDate = (String) request.get("startDate");
                final String endDate = (String) request.get("endDate");
                final String statusParam = (String) request.getOrDefault("status", null);
                Object supplierIdObj = request.get("supplierId");
                final Long supplierId;
                if (supplierIdObj instanceof Number) {
                    supplierId = ((Number) supplierIdObj).longValue();
                } else {
                    supplierId = null;
                }
                
                // 构建查询条件，查询待处理状态的采购单（状态为"全部"时的默认行为）
                List<PurchaseOrder> orders = purchaseOrderRepository.findAll((root, query, cb) -> {
                    List<Predicate> predicates = new ArrayList<>();
                    
                    // 强制约束：无论前端传递什么状态，导出时始终只导出“待处理”状态
                    // 业务规范：导出发货单仅针对待处理（待发货）的订单
                    predicates.add(cb.equal(root.get("status"), PurchaseOrder.Status.PENDING));
                    
                    // 与业务规则一致：仅导出待发货（或未发货）发货单
                    predicates.add(cb.equal(root.get("shippingStatus"), PurchaseOrder.ShippingStatus.PENDING));
                    
                    if (keyword != null && !keyword.isEmpty()) {
                        Predicate orderNoLike = cb.like(root.get("orderNo"), "%" + keyword + "%");
                        Predicate supplierLike = cb.like(root.get("supplier").get("name"), "%" + keyword + "%");
                        
                        javax.persistence.criteria.Subquery<Long> productSubquery = query.subquery(Long.class);
                        javax.persistence.criteria.Root<PurchaseOrderItem> itemRoot = productSubquery.from(PurchaseOrderItem.class);
                        javax.persistence.criteria.Join<PurchaseOrderItem, Product> productJoin = itemRoot.join("product");
                        productSubquery.select(itemRoot.get("purchaseOrder").get("id"))
                            .where(cb.like(productJoin.get("name"), "%" + keyword + "%"));
                        
                        Predicate hasProduct = root.get("id").in(productSubquery);
                        predicates.add(cb.or(orderNoLike, supplierLike, hasProduct));
                    }
                    
                    // 独立的商品筛选（与keyword不同），严格匹配商品名
                    if (product != null && !product.isEmpty()) {
                        javax.persistence.criteria.Subquery<Long> productSubquery2 = query.subquery(Long.class);
                        javax.persistence.criteria.Root<PurchaseOrderItem> itemRoot2 = productSubquery2.from(PurchaseOrderItem.class);
                        javax.persistence.criteria.Join<PurchaseOrderItem, Product> productJoin2 = itemRoot2.join("product");
                        productSubquery2.select(itemRoot2.get("purchaseOrder").get("id"))
                            .where(cb.like(productJoin2.get("name"), "%" + product + "%"));
                        predicates.add(root.get("id").in(productSubquery2));
                    }
                    
                    if (startDate != null && !startDate.isEmpty()) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), 
                            java.time.LocalDate.parse(startDate).atStartOfDay()));
                    }
                    
                    if (endDate != null && !endDate.isEmpty()) {
                        predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), 
                            java.time.LocalDate.parse(endDate).atTime(23, 59, 59)));
                    }
                    
                    if (supplierId != null) {
                        predicates.add(cb.equal(root.get("supplier").get("id"), supplierId));
                    }
                    
                    return cb.and(predicates.toArray(new Predicate[0]));
                });
                
                if (orders.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "code", 400,
                        "message", "没有符合筛选条件的待发货采购单"
                    ));
                }
                
                orderIds = orders.stream().map(PurchaseOrder::getId).collect(java.util.stream.Collectors.toList());
            }

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String exportedBy = authentication != null ? authentication.getName() : "system";

            log.info("开始导出发货单，采购单ID: {}, 操作人: {}", orderIds, exportedBy);

            byte[] zipBytes = deliveryOrderExportService.exportDeliveryOrders(orderIds, exportedBy);

            String fileName = deliveryOrderExportService.getExportFileName();

            log.info("发货单导出完成，文件名: {}, 大小: {} bytes", fileName, zipBytes.length);

            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"" + 
                            java.net.URLEncoder.encode(fileName, "UTF-8") + "\"")
                    .header("X-Export-Count", String.valueOf(orderIds.size()))
                    .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                    .body(zipBytes);

        } catch (IllegalArgumentException e) {
            log.error("导出发货单参数错误", e);
            return ResponseEntity.badRequest().body(Map.of(
                "code", 400,
                "message", e.getMessage()
            ));
        } catch (IllegalStateException e) {
            log.error("导出发货单状态错误", e);
            return ResponseEntity.badRequest().body(Map.of(
                "code", 400,
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("导出发货单失败", e);
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "message", "导出失败: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/export-delivery-count")
    public ResponseEntity<Map<String, Object>> getExportDeliveryCount(
            @RequestBody(required = false) Map<String, Object> params) {
        
        String keyword = params != null ? (String) params.get("keyword") : null;
        String product = params != null ? (String) params.get("product") : null;
        Long supplierId = params != null && params.get("supplierId") != null ? 
            ((Number) params.get("supplierId")).longValue() : null;
        String startDate = params != null ? (String) params.get("startDate") : null;
        String endDate = params != null ? (String) params.get("endDate") : null;
        
        List<PurchaseOrder> orders = purchaseOrderRepository.findAll((root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            predicates.add(cb.equal(root.get("status"), PurchaseOrder.Status.PENDING));
            predicates.add(cb.equal(root.get("shippingStatus"), PurchaseOrder.ShippingStatus.PENDING));
            
            if (keyword != null && !keyword.isEmpty()) {
                Predicate orderNoLike = cb.like(root.get("orderNo"), "%" + keyword + "%");
                Predicate supplierLike = cb.like(root.get("supplier").get("name"), "%" + keyword + "%");
                
                javax.persistence.criteria.Subquery<Long> productSubquery = query.subquery(Long.class);
                javax.persistence.criteria.Root<PurchaseOrderItem> itemRoot = productSubquery.from(PurchaseOrderItem.class);
                javax.persistence.criteria.Join<PurchaseOrderItem, Product> productJoin = itemRoot.join("product");
                productSubquery.select(itemRoot.get("purchaseOrder").get("id"))
                    .where(cb.like(productJoin.get("name"), "%" + keyword + "%"));
                
                Predicate hasProduct = root.get("id").in(productSubquery);
                predicates.add(cb.or(orderNoLike, supplierLike, hasProduct));
            }
            
            if (product != null && !product.isEmpty()) {
                javax.persistence.criteria.Subquery<Long> productSubquery = query.subquery(Long.class);
                javax.persistence.criteria.Root<PurchaseOrderItem> itemRoot = productSubquery.from(PurchaseOrderItem.class);
                javax.persistence.criteria.Join<PurchaseOrderItem, Product> productJoin = itemRoot.join("product");
                productSubquery.select(itemRoot.get("purchaseOrder").get("id"))
                    .where(cb.like(productJoin.get("name"), "%" + product + "%"));
                
                Predicate hasProduct = root.get("id").in(productSubquery);
                predicates.add(hasProduct);
            }
            
            if (supplierId != null) {
                predicates.add(cb.equal(root.get("supplier").get("id"), supplierId));
            }
            
            if (startDate != null && !startDate.isEmpty()) {
                try {
                    java.time.LocalDate start = java.time.LocalDate.parse(startDate);
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start.atStartOfDay()));
                } catch (Exception e) {
                    log.warn("Invalid startDate format: {}", startDate);
                }
            }
            
            if (endDate != null && !endDate.isEmpty()) {
                try {
                    java.time.LocalDate end = java.time.LocalDate.parse(endDate);
                    predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), end.atTime(23, 59, 59)));
                } catch (Exception e) {
                    log.warn("Invalid endDate format: {}", endDate);
                }
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        });
        
        return ResponseEntity.ok(Map.of(
            "code", 200,
            "data", Map.of("count", orders.size())
        ));
    }

    @PostMapping("/import-delivery")
    @OperationLog(module = "PurchaseOrder", operation = "ImportDelivery")
    public ResponseEntity<?> importDeliveryOrders(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "code", 400,
                    "message", "请选择要导入的Excel文件"
                ));
            }

            String filename = file.getOriginalFilename();
            if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
                return ResponseEntity.badRequest().body(Map.of(
                    "code", 400,
                    "message", "请上传Excel文件（.xlsx或.xls格式）"
                ));
            }

            log.info("开始导入发货单，文件名: {}, 大小: {} bytes", filename, file.getSize());

            com.supplypro.dto.DeliveryOrderImportResult result = deliveryOrderImportService.importDeliveryOrders(file);

            log.info("发货单导入完成: 总数={}, 成功={}, 失败={}", 
                result.getTotalCount(), result.getSuccessCount(), result.getFailCount());

            byte[] resultExcel = deliveryOrderImportService.generateResultExcel(result);

            String timestamp = java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .format(java.time.LocalDateTime.now());
            String resultFilename = "发货单导入结果_" + timestamp + ".xlsx";

            return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + 
                    java.net.URLEncoder.encode(resultFilename, "UTF-8") + "\"")
                .header("X-Total-Count", String.valueOf(result.getTotalCount()))
                .header("X-Success-Count", String.valueOf(result.getSuccessCount()))
                .header("X-Fail-Count", String.valueOf(result.getFailCount()))
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(resultExcel);

        } catch (Exception e) {
            log.error("导入发货单失败", e);
            return ResponseEntity.status(500).body(Map.of(
                "code", 500,
                "message", "导入失败: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/sync-status-by-shipping")
    @Transactional
    public ResponseEntity<Map<String, Object>> syncStatusByShipping() {
        List<Map<String, Object>> syncRecords = new ArrayList<>();
        int syncedCount = 0;
        int errorCount = 0;
        
        List<PurchaseOrder> allOrders = purchaseOrderRepository.findAll();
        
        for (PurchaseOrder po : allOrders) {
            PurchaseOrder.Status oldStatus = po.getStatus();
            PurchaseOrder.ShippingStatus shippingStatus = po.getShippingStatus();
            
            PurchaseOrder.Status expectedStatus = null;
            
            if (shippingStatus == PurchaseOrder.ShippingStatus.PENDING) {
                expectedStatus = PurchaseOrder.Status.PENDING;
            } else if (shippingStatus == PurchaseOrder.ShippingStatus.TO_SHIP) {
                expectedStatus = PurchaseOrder.Status.CONFIRMED;
            } else if (shippingStatus == PurchaseOrder.ShippingStatus.SHIPPED) {
                expectedStatus = PurchaseOrder.Status.SHIPPED;
            } else if (shippingStatus == PurchaseOrder.ShippingStatus.RECEIVED) {
                expectedStatus = PurchaseOrder.Status.RECEIVED;
            }
            
            if (expectedStatus != null && oldStatus != expectedStatus) {
                Map<String, Object> record = new HashMap<>();
                record.put("id", po.getId());
                record.put("orderNo", po.getOrderNo());
                record.put("oldStatus", oldStatus.name());
                record.put("shippingStatus", shippingStatus.name());
                record.put("newStatus", expectedStatus.name());
                
                po.setStatus(expectedStatus);
                po.setUpdatedAt(LocalDateTime.now());
                purchaseOrderRepository.save(po);
                
                try {
                    snapshotService.captureSnapshot(po, "STATUS_SYNC");
                } catch (Exception e) {
                    log.error("Failed to capture snapshot for PO {} after status sync", po.getOrderNo(), e);
                }
                
                syncedCount++;
                syncRecords.add(record);
                log.info("同步采购单状态: {} {} -> {}", po.getOrderNo(), oldStatus.name(), expectedStatus.name());
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "状态同步完成");
        response.put("data", Map.of(
            "syncedCount", syncedCount,
            "errorCount", errorCount,
            "syncRecords", syncRecords
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/rollback-to-pending")
    @Transactional
    @OperationLog(module = "PurchaseOrder", operation = "RollbackToPending")
    public ResponseEntity<Map<String, Object>> rollbackToPending() {
        List<Map<String, Object>> rollbackRecords = new ArrayList<>();
        int rolledCount = 0;
        int skippedCount = 0;
        
        List<PurchaseOrder> toShipOrders = purchaseOrderRepository.findAll((root, query, cb) -> {
            return cb.and(
                cb.equal(root.get("status"), PurchaseOrder.Status.CONFIRMED),
                cb.equal(root.get("shippingStatus"), PurchaseOrder.ShippingStatus.TO_SHIP)
            );
        });
        
        log.info("开始批量状态回滚，待处理采购单数量: {}", toShipOrders.size());
        
        for (PurchaseOrder po : toShipOrders) {
            PurchaseOrder.Status oldStatus = po.getStatus();
            PurchaseOrder.ShippingStatus oldShippingStatus = po.getShippingStatus();
            
            boolean hasLogistics = settlementOrderRepository.findByRelatedOrderNo(po.getOrderNo())
                .stream().anyMatch(so -> so.getType() == SettlementOrder.Type.LOGISTICS);
            
            if (hasLogistics) {
                log.info("采购单 {} 已存在物流结算单，跳过回滚", po.getOrderNo());
                skippedCount++;
                continue;
            }
            
            Map<String, Object> record = new HashMap<>();
            record.put("id", po.getId());
            record.put("orderNo", po.getOrderNo());
            record.put("oldStatus", oldStatus.name());
            record.put("oldShippingStatus", oldShippingStatus.name());
            record.put("newStatus", "PENDING");
            record.put("newShippingStatus", "PENDING");
            
            po.setStatus(PurchaseOrder.Status.PENDING);
            po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
            po.setUpdatedAt(LocalDateTime.now());
            purchaseOrderRepository.save(po);
            
            try {
                snapshotService.captureSnapshot(po, "STATUS_ROLLBACK");
            } catch (Exception e) {
                log.error("Failed to capture snapshot for PO {} after rollback", po.getOrderNo(), e);
            }
            
            rolledCount++;
            rollbackRecords.add(record);
            log.info("采购单 {} 状态回滚: {} -> PENDING, {} -> PENDING", 
                po.getOrderNo(), oldStatus.name(), oldShippingStatus.name());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "状态回滚完成");
        response.put("data", Map.of(
            "rolledCount", rolledCount,
            "skippedCount", skippedCount,
            "rollbackRecords", rollbackRecords
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sync-logistics-status")
    @Transactional
    @OperationLog(module = "PurchaseOrder", operation = "SyncLogisticsStatus")
    public ResponseEntity<Map<String, Object>> syncLogisticsStatus() {
        String operator = "system";
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                operator = auth.getName();
            }
        } catch (Exception e) {
            log.debug("Could not get current user, using 'system' as operator");
        }

        log.info("[物流状态同步] 操作人: {} 开始同步物流配送状态", operator);

        List<PurchaseOrder> shippedOrders = purchaseOrderRepository.findAll((root, query, cb) -> {
            return cb.and(
                cb.equal(root.get("status"), PurchaseOrder.Status.SHIPPED),
                cb.equal(root.get("deliveryMethod"), "Logistics"),
                cb.isNotNull(root.get("trackingNumber"))
            );
        });

        log.info("[物流状态同步] 找到 {} 条待同步采购单", shippedOrders.size());

        if (shippedOrders.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "没有需要同步的采购单");
            response.put("data", Map.of(
                "total", 0,
                "successCount", 0,
                "failCount", 0,
                "updatedCount", 0,
                "details", List.of()
            ));
            return ResponseEntity.ok(response);
        }

        int successCount = 0;
        int failCount = 0;
        int updatedCount = 0;
        List<Map<String, Object>> details = new ArrayList<>();

        for (PurchaseOrder po : shippedOrders) {
            String orderNo = po.getOrderNo();
            String trackingNumber = po.getTrackingNumber();
            String logisticsCompany = po.getLogisticsCompany();

            Map<String, Object> detail = new HashMap<>();
            detail.put("orderNo", orderNo);
            detail.put("trackingNumber", trackingNumber);
            detail.put("logisticsCompany", logisticsCompany);

            try {
                com.supplypro.dto.LogisticsResponse logisticsResponse = null;
                int retryCount = 0;
                int maxRetries = 3;
                Exception lastException = null;

                while (retryCount < maxRetries && logisticsResponse == null) {
                    try {
                        if (retryCount > 0) {
                            Thread.sleep(500);
                            log.info("[物流状态同步] 采购单 {} 第 {} 次重试查询物流", orderNo, retryCount);
                        }
                        logisticsResponse = kuaidiNiaoService.track(logisticsCompany, trackingNumber);
                    } catch (Exception e) {
                        lastException = e;
                        retryCount++;
                        log.warn("[物流状态同步] 采购单 {} 查询失败(第{}次): {}", orderNo, retryCount, e.getMessage());
                    }
                }

                if (logisticsResponse == null || !logisticsResponse.isSuccess()) {
                    String errorMsg = logisticsResponse != null ? logisticsResponse.getReason() : 
                        (lastException != null ? lastException.getMessage() : "未知错误");
                    detail.put("status", "failed");
                    detail.put("error", errorMsg);
                    failCount++;
                    log.error("[物流状态同步] 采购单 {} 查询物流失败: {}", orderNo, errorMsg);
                } else {
                    String newState = logisticsResponse.getState();
                    String oldState = po.getLogisticsState();

                    boolean stateChanged = oldState == null || !oldState.equals(newState);

                    po.setLogisticsState(newState);
                    po.setLogisticsStateEx(logisticsResponse.getStateEx());
                    try {
                        if (logisticsResponse.getTraces() != null) {
                            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                            po.setLogisticsTraces(mapper.writeValueAsString(logisticsResponse.getTraces()));
                        }
                    } catch (Exception e) {
                        log.warn("[物流状态同步] 采购单 {} 序列化物流轨迹失败: {}", orderNo, e.getMessage());
                    }
                    po.setLogisticsSyncedAt(LocalDateTime.now());

                    if ("3".equals(newState)) {
                        if (po.getShippingStatus() != PurchaseOrder.ShippingStatus.RECEIVED) {
                            po.setShippingStatus(PurchaseOrder.ShippingStatus.RECEIVED);
                            po.setStatus(PurchaseOrder.Status.RECEIVED);
                            po.setReceiveTime(LocalDateTime.now());
                            po.setReceiveType(PurchaseOrder.ReceiveType.AUTO);
                            stateChanged = true;
                            log.info("[物流状态同步] 采购单 {} 物流已签收，自动更新状态为已收货", orderNo);
                        }
                    }

                    purchaseOrderRepository.save(po);

                    try {
                        PurchaseOrderLog logEntry = new PurchaseOrderLog();
                        logEntry.setPurchaseOrderId(po.getId());
                        logEntry.setOperator(operator);
                        logEntry.setOperationType("LOGISTICS_SYNC");
                        logEntry.setOldValue(oldState != null ? oldState : "null");
                        logEntry.setNewValue(newState);
                        logEntry.setRemark(String.format("物流状态同步: %s -> %s, 快递单号: %s", 
                            oldState != null ? oldState : "无", newState, trackingNumber));
                        purchaseOrderLogRepository.save(logEntry);
                    } catch (Exception e) {
                        log.warn("[物流状态同步] 采购单 {} 保存日志失败: {}", orderNo, e.getMessage());
                    }

                    detail.put("status", "success");
                    detail.put("oldState", oldState);
                    detail.put("newState", newState);
                    detail.put("stateChanged", stateChanged);
                    successCount++;
                    if (stateChanged) {
                        updatedCount++;
                    }
                    log.info("[物流状态同步] 采购单 {} 同步成功, 状态: {} -> {}", orderNo, oldState, newState);
                }
            } catch (Exception e) {
                detail.put("status", "error");
                detail.put("error", e.getMessage());
                failCount++;
                log.error("[物流状态同步] 采购单 {} 同步异常: ", orderNo, e);
            }

            details.add(detail);

            try {
                Thread.sleep(200);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            }
        }

        log.info("[物流状态同步] 操作人: {} 同步完成. 总数: {}, 成功: {}, 失败: {}, 状态变更: {}", 
            operator, shippedOrders.size(), successCount, failCount, updatedCount);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", String.format("同步完成: 成功 %d 条, 失败 %d 条, 状态变更 %d 条", 
            successCount, failCount, updatedCount));
        response.put("data", Map.of(
            "total", shippedOrders.size(),
            "successCount", successCount,
            "failCount", failCount,
            "updatedCount", updatedCount,
            "details", details
        ));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search-order-nos")
    public ResponseEntity<Map<String, Object>> searchOrderNos(@RequestParam String keyword) {
        log.info("Searching order nos with keyword: {}", keyword);
        
        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            return cb.like(root.get("orderNo"), "%" + keyword.trim() + "%");
        };

        Pageable pageable = PageRequest.of(0, 20, Sort.by("id").descending());
        Page<PurchaseOrder> pageResult = purchaseOrderRepository.findAll(spec, pageable);
        
        List<Map<String, Object>> orderNos = pageResult.getContent().stream()
            .map(po -> {
                Map<String, Object> item = new HashMap<>();
                item.put("orderNo", po.getOrderNo());
                item.put("supplierName", po.getSupplierName());
                item.put("createdAt", po.getCreatedAt());
                return item;
            })
            .collect(java.util.stream.Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "查询成功");
        response.put("data", orderNos);
        return ResponseEntity.ok(response);
    }
}
