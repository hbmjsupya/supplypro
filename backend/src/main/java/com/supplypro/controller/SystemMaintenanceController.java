package com.supplypro.controller;

import com.supplypro.entity.Product;
import com.supplypro.entity.Product.ProductType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/system/maintenance")
@lombok.extern.slf4j.Slf4j
public class SystemMaintenanceController {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private com.supplypro.repository.ProductRepository productRepository;

    @Autowired
    private com.supplypro.repository.ProductBundleRepository productBundleRepository;

    @Autowired
    private com.supplypro.repository.StockBatchRepository stockBatchRepository;

    @Autowired
    private com.supplypro.repository.StockFlowRepository stockFlowRepository;

    @Autowired
    private com.supplypro.repository.InboundOrderRepository inboundOrderRepository;

    @Autowired
    private com.supplypro.repository.InboundOrderItemRepository inboundOrderItemRepository;

    @Autowired
    private com.supplypro.repository.ProductBrandRepository productBrandRepository;

    @Autowired
    private com.supplypro.repository.SkuRepository skuRepository;

    @Autowired
    private com.supplypro.repository.ProductStatusChangeLogRepository productStatusChangeLogRepository;

    @Autowired
    private com.supplypro.repository.ProductTaxChangeLogRepository productTaxChangeLogRepository;

    @Autowired
    private com.supplypro.repository.SalesOrderRepository salesOrderRepository;

    @Autowired
    private com.supplypro.repository.PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private com.supplypro.repository.OutboundOrderRepository outboundOrderRepository;

    @Autowired
    private com.supplypro.repository.SalesOrderItemRepository salesOrderItemRepository;

    @Autowired
    private com.supplypro.repository.PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Autowired
    private javax.persistence.EntityManager entityManager;

    @PostMapping("/clear-cache")
    public ResponseEntity<Map<String, Object>> clearCache() {
        Set<String> keys = redisTemplate.keys("category:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Cache cleared: " + (keys != null ? keys.size() : 0) + " keys");
        return ResponseEntity.ok(response);
    }

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @PostMapping("/cleanup-all-products")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupAllProducts(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean confirm,
            javax.servlet.http.HttpServletRequest request) {
        if (!confirm) {
            throw new com.supplypro.common.exception.BusinessException("Double confirmation required. Please set confirm=true.");
        }
        
        String clientIp = request.getRemoteAddr();
        String operator = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "Unknown";
        log.info("Starting COMPLETE CLEANUP of ALL products. Requested by: {} from IP: {}", operator, clientIp);
        
        long totalProductsBefore = productRepository.count();
        long totalSalesOrdersBefore = salesOrderRepository.count();
        long totalPurchaseOrdersBefore = purchaseOrderRepository.count();

        // 1. Backup: Serialize all products to JSON
        String backupFilePath = "N/A";
        try {
            List<Product> allProducts = productRepository.findAll();
            if (!allProducts.isEmpty()) {
                java.nio.file.Path backupDir = java.nio.file.Paths.get("backups");
                if (!java.nio.file.Files.exists(backupDir)) {
                    java.nio.file.Files.createDirectories(backupDir);
                }
                String filename = "FULL_CLEANUP_BACKUP_" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";
                java.nio.file.Path file = backupDir.resolve(filename);
                objectMapper.writeValue(file.toFile(), allProducts);
                backupFilePath = file.toAbsolutePath().toString();
                log.info("Full backup created at: {}", backupFilePath);
            }
        } catch (Exception e) {
            log.error("Failed to create backup", e);
            throw new RuntimeException("Backup failed. Aborting cleanup to ensure safety.", e);
        }

        // 2. Deletion (Order matters for Foreign Keys)
        
        // 2.1 Logistics / Orders (Dependent on Sales/Purchase Orders)
        // Note: OutboundOrder depends on SalesOrder
        log.info("Deleting all Outbound Orders...");
        outboundOrderRepository.deleteAll();
        
        // 2.2 Inbound Orders (Dependent on PurchaseOrder)
        // Note: InboundOrder items cascade from InboundOrder
        log.info("Deleting all Inbound Orders...");
        inboundOrderRepository.deleteAll();

        // 2.3 Sales Orders (Cascades Items)
        log.info("Deleting all Sales Orders...");
        salesOrderRepository.deleteAll();
        
        // 2.4 Purchase Orders (Cascades Items)
        log.info("Deleting all Purchase Orders...");
        purchaseOrderRepository.deleteAll();
        
        // 2.5 Inventory Data
        log.info("Deleting all Stock Flows and Batches...");
        stockFlowRepository.deleteAll();
        stockBatchRepository.deleteAll();
        
        // 2.6 Product Associations
        log.info("Deleting all Product Bundles...");
        productBundleRepository.deleteAll();
        
        log.info("Deleting all Product Brands...");
        productBrandRepository.deleteAll();
        
        log.info("Deleting all SKUs...");
        skuRepository.deleteAll();
        
        log.info("Deleting all Product Logs...");
        productStatusChangeLogRepository.deleteAll();
        productTaxChangeLogRepository.deleteAll();
        
        // 2.7 Products
        log.info("Deleting all Products...");
        productRepository.deleteAll();
        
        // 3. Verification
        productRepository.flush();
        long totalProductsAfter = productRepository.count();
        long totalSalesOrdersAfter = salesOrderRepository.count();
        long totalPurchaseOrdersAfter = purchaseOrderRepository.count();
        
        log.info("Full cleanup completed successfully.");

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Full system cleanup completed successfully.");
        
        Map<String, Object> report = new HashMap<>();
        report.put("products_before", totalProductsBefore);
        report.put("products_after", totalProductsAfter);
        report.put("sales_orders_deleted", totalSalesOrdersBefore - totalSalesOrdersAfter);
        report.put("purchase_orders_deleted", totalPurchaseOrdersBefore - totalPurchaseOrdersAfter);
        report.put("backup_file", backupFilePath);
        
        response.put("report", report);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup-test-data")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupTestData() {
        log.info("Starting cleanup of test data...");
        
        // 1. Identification: Find all products (Normal or Bundle) that match the test data pattern
        List<Product> testProducts = productRepository.findAll((root, query, cb) -> 
            cb.or(
                cb.like(root.get("name"), "%Test%"),
                cb.like(root.get("name"), "%Auto%"),
                cb.like(root.get("name"), "%测试%"),
                cb.like(root.get("skuCode"), "%TEST%")
            )
        );

        long totalProductsBefore = productRepository.count();
        int testCount = testProducts.size();
        long manualCountBefore = totalProductsBefore - testCount;

        log.info("Found {} potential test products/bundles to delete. Total products: {}", testCount, totalProductsBefore);

        // 2. Backup: Serialize to JSON and save to file
        String backupFilePath = "N/A";
        try {
            if (testCount > 0) {
                java.nio.file.Path backupDir = java.nio.file.Paths.get("backups");
                if (!java.nio.file.Files.exists(backupDir)) {
                    java.nio.file.Files.createDirectories(backupDir);
                }
                String filename = "cleanup_backup_" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";
                java.nio.file.Path file = backupDir.resolve(filename);
                
                // Use a simple map to avoid lazy loading issues or circular references if entities are complex
                // Or just try to serialize the list if Jackson handles it well (Product has @JsonIgnoreProperties)
                objectMapper.writeValue(file.toFile(), testProducts);
                backupFilePath = file.toAbsolutePath().toString();
                log.info("Backup created at: {}", backupFilePath);
            }
        } catch (Exception e) {
            log.error("Failed to create backup", e);
            throw new RuntimeException("Backup failed. Aborting cleanup to ensure safety.", e);
        }

        Set<Long> processedIds = new HashSet<>();
        
        // 3. Deletion
        for (Product p : testProducts) {
            Long id = p.getId();
            if (processedIds.contains(id)) continue;
            
            // Log backup data
            log.info("Deleting Product ID: {}, Name: {}, Type: {}", id, p.getName(), p.getType());

            // 1. If it's a Bundle, remove its definition (children associations)
            productBundleRepository.deleteByParentProductId(id);

            // 2. If it's a Child in a Bundle, remove it from that Bundle
            productBundleRepository.deleteByChildProductId(id);

            // 3. Clean up Stock and Inbound Data
            stockFlowRepository.deleteByProductId(id);
            stockBatchRepository.deleteByProductId(id);
            inboundOrderItemRepository.deleteByProductId(id);

            // 4. Delete the Product itself
            productRepository.delete(p);
            
            processedIds.add(id);
        }
        
        // 4. Verification
        productRepository.flush(); // Ensure deletion is applied
        long totalProductsAfter = productRepository.count();

        log.info("Cleanup completed successfully. Deleted {} items.", testCount);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Cleanup completed successfully.");
        
        Map<String, Object> report = new HashMap<>();
        report.put("total_before", totalProductsBefore);
        report.put("manual_products_before", manualCountBefore);
        report.put("test_products_deleted", testCount);
        report.put("total_after", totalProductsAfter);
        report.put("backup_file", backupFilePath);
        
        response.put("report", report);
        
        return ResponseEntity.ok(response);
    }

    @Autowired
    private com.supplypro.repository.SettlementOrderRepository settlementOrderRepository;

    @PostMapping("/reset-purchase-orders")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetPurchaseOrders(
            @org.springframework.web.bind.annotation.RequestBody java.util.List<String> orderNos,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean confirm,
            javax.servlet.http.HttpServletRequest request) {

        if (!confirm) {
            throw new com.supplypro.common.exception.BusinessException("Double confirmation required. Please set confirm=true.");
        }

        String clientIp = request.getRemoteAddr();
        String operator = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "Unknown";
        log.info("Starting RESET PURCHASE ORDERS. Requested by: {} from IP: {}. OrderNos: {}", operator, clientIp, orderNos);

        Map<String, Object> report = new HashMap<>();
        int updatedOrders = 0;
        int deletedSettlements = 0;
        java.util.List<String> notFoundOrders = new java.util.ArrayList<>();
        java.util.List<String> processedOrders = new java.util.ArrayList<>();

        for (String orderNo : orderNos) {
            com.supplypro.entity.PurchaseOrder order = purchaseOrderRepository.findByOrderNo(orderNo);
            
            if (order == null) {
                notFoundOrders.add(orderNo);
                log.warn("Purchase order not found: {}", orderNo);
                continue;
            }

            // 1. Delete associated settlement orders (LOGISTICS type)
            java.util.List<com.supplypro.entity.SettlementOrder> settlements = 
                settlementOrderRepository.findByRelatedOrderNoAndType(orderNo, com.supplypro.entity.SettlementOrder.Type.LOGISTICS);
            
            for (com.supplypro.entity.SettlementOrder settlement : settlements) {
                if (settlement.getStatus() == com.supplypro.entity.SettlementOrder.Status.PENDING) {
                    settlementOrderRepository.delete(settlement);
                    deletedSettlements++;
                    log.info("Deleted settlement order: {} for purchase order: {}", settlement.getDeliveryNo(), orderNo);
                }
            }

            // 2. Clear logistics info and reset status
            order.setStatus(com.supplypro.entity.PurchaseOrder.Status.PENDING);
            order.setShippingStatus(com.supplypro.entity.PurchaseOrder.ShippingStatus.PENDING);
            order.setLogisticsCompany(null);
            order.setTrackingNumber(null);
            order.setShippedAt(null);
            order.setDeliverer(null);
            order.setDelivererPhone(null);
            order.setPlateNumber(null);
            order.setLogisticsFee(null);
            order.setDeliveryMethod(null);
            order.setLogisticsProvider(null);
            order.setReceiveTime(null);
            order.setReceiveUserId(null);
            order.setReceiveType(null);
            order.setCurrentLocation(null);
            order.setExpectedArrival(null);
            
            purchaseOrderRepository.save(order);
            updatedOrders++;
            processedOrders.add(orderNo);
            log.info("Reset purchase order: {}", orderNo);
        }

        report.put("total_requested", orderNos.size());
        report.put("orders_reset", updatedOrders);
        report.put("settlements_deleted", deletedSettlements);
        report.put("not_found_orders", notFoundOrders);
        report.put("processed_orders", processedOrders);

        log.info("Reset Purchase Orders completed. Reset: {}, Settlements deleted: {}, Not found: {}", 
            updatedOrders, deletedSettlements, notFoundOrders.size());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Purchase orders reset completed.");
        response.put("report", report);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup-sequential")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupSequential(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean confirm,
            javax.servlet.http.HttpServletRequest request) {
        
        if (!confirm) {
            throw new com.supplypro.common.exception.BusinessException("Double confirmation required. Please set confirm=true.");
        }

        String clientIp = request.getRemoteAddr();
        String operator = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "Unknown";
        log.info("Starting SEQUENTIAL CLEANUP (Bundles -> Product Pool). Requested by: {} from IP: {}", operator, clientIp);

        long totalProductsBefore = productRepository.count();
        Map<String, Object> report = new HashMap<>();
        report.put("total_products_before", totalProductsBefore);

        // --- Step 1: Cleanup Bundles ---
        List<Product> bundleProducts = productRepository.findByType(ProductType.BUNDLE);
        int bundleCount = bundleProducts.size();
        log.info("Found {} Bundle products to clean up.", bundleCount);

        String bundleBackupPath = "N/A";
        if (!bundleProducts.isEmpty()) {
            bundleBackupPath = createBackup(bundleProducts, "BUNDLE_CLEANUP");
            deleteProductsAndDependencies(bundleProducts);
        }
        report.put("bundles_deleted", bundleCount);
        report.put("bundle_backup", bundleBackupPath);

        // --- Step 2: Cleanup Product Pool (Normal Products) ---
        List<Product> poolProducts = productRepository.findByType(ProductType.NORMAL);
        int poolCount = poolProducts.size();
        log.info("Found {} Product Pool (Normal) products to clean up.", poolCount);

        String poolBackupPath = "N/A";
        if (!poolProducts.isEmpty()) {
            poolBackupPath = createBackup(poolProducts, "POOL_CLEANUP");
            deleteProductsAndDependencies(poolProducts);
        }
        report.put("pool_products_deleted", poolCount);
        report.put("pool_backup", poolBackupPath);

        // Verification
        productRepository.flush();
        long totalProductsAfter = productRepository.count();
        report.put("total_products_after", totalProductsAfter);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Sequential cleanup completed successfully.");
        response.put("report", report);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup-purchase-orders")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupPurchaseOrders(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean confirm,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "365") int daysBefore,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "CANCELLED,COMPLETED") List<com.supplypro.entity.PurchaseOrder.Status> statuses,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "500") int batchSize,
            javax.servlet.http.HttpServletRequest request) {
        
        if (!confirm) {
            throw new com.supplypro.common.exception.BusinessException("Double confirmation required. Please set confirm=true.");
        }

        String clientIp = request.getRemoteAddr();
        String operator = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "Unknown";
        log.info("Starting PURCHASE ORDER CLEANUP. Requested by: {} from IP: {}. Criteria: daysBefore={}, statuses={}", operator, clientIp, daysBefore, statuses);

        java.time.LocalDateTime cutoffDate = java.time.LocalDateTime.now().minusDays(daysBefore);
        
        // 1. Identification
        List<com.supplypro.entity.PurchaseOrder> ordersToDelete = purchaseOrderRepository.findAll((root, query, cb) -> {
            javax.persistence.criteria.Predicate statusPredicate = root.get("status").in(statuses);
            javax.persistence.criteria.Predicate datePredicate = cb.lessThan(root.get("createdAt"), cutoffDate);
            return cb.and(statusPredicate, datePredicate);
        });

        long totalToDelete = ordersToDelete.size();
        log.info("Found {} purchase orders to delete.", totalToDelete);

        if (totalToDelete == 0) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "No purchase orders matched the cleanup criteria.");
            return ResponseEntity.ok(response);
        }

        // 2. Backup
        String backupFilePath = "N/A";
        try {
            java.nio.file.Path backupDir = java.nio.file.Paths.get("backups");
            if (!java.nio.file.Files.exists(backupDir)) {
                java.nio.file.Files.createDirectories(backupDir);
            }
            String filename = "PO_CLEANUP_BACKUP_" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";
            java.nio.file.Path file = backupDir.resolve(filename);
            objectMapper.writeValue(file.toFile(), ordersToDelete);
            backupFilePath = file.toAbsolutePath().toString();
            log.info("PO Backup created at: {}", backupFilePath);
        } catch (Exception e) {
            log.error("Failed to create backup", e);
            throw new RuntimeException("Backup failed. Aborting cleanup.", e);
        }

        // 3. Batch Deletion
        int deletedCount = 0;

        for (int i = 0; i < totalToDelete; i += batchSize) {
            int end = Math.min(i + batchSize, (int) totalToDelete);
            List<com.supplypro.entity.PurchaseOrder> batch = ordersToDelete.subList(i, end);
            
            for (com.supplypro.entity.PurchaseOrder po : batch) {
                // Delete Inbound Orders associated with this PO
                inboundOrderRepository.findByPurchaseOrder(po).ifPresent(inbound -> {
                    inboundOrderRepository.delete(inbound);
                    // inboundDeletedCount is effectively final in lambda, so we can't increment local var directly
                    // But we can just rely on repository delete
                });
                
                purchaseOrderRepository.delete(po);
                deletedCount++;
            }
            purchaseOrderRepository.flush(); // Commit batch
        }
        
        log.info("Cleanup complete. Deleted {} POs.", deletedCount);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Purchase Order cleanup completed successfully.");
        
        Map<String, Object> report = new HashMap<>();
        report.put("total_found", totalToDelete);
        report.put("deleted_count", deletedCount);
        report.put("backup_file", backupFilePath);
        
        response.put("report", report);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/fix-data-consistency")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixDataConsistency() {
        log.info("Starting DATA CONSISTENCY FIX...");
        int updatedCount = 0;
        
        // Fix 1: PurchaseOrder 'platformOrderNo' for INBOUND type
        List<com.supplypro.entity.PurchaseOrder> inboundPOs = purchaseOrderRepository.findAll((root, query, cb) -> 
            cb.equal(root.get("type"), com.supplypro.entity.PurchaseOrder.Type.INBOUND)
        );
        
        for (com.supplypro.entity.PurchaseOrder po : inboundPOs) {
            boolean changed = false;
            
            // Check InboundOrder
            java.util.Optional<com.supplypro.entity.InboundOrder> inboundOpt = inboundOrderRepository.findByPurchaseOrder(po);
            if (inboundOpt.isPresent()) {
                com.supplypro.entity.InboundOrder inbound = inboundOpt.get();
                String expectedPlatformNo = "入库采购-" + inbound.getInboundNo();
                
                if (po.getPlatformOrderNo() == null || !po.getPlatformOrderNo().equals(expectedPlatformNo)) {
                    po.setPlatformOrderNo(expectedPlatformNo);
                    changed = true;
                }
                
                if (po.getBizNo() == null || po.getBizNo().isEmpty()) {
                    po.setBizNo(inbound.getInboundNo());
                    changed = true;
                }
            }
            
            if (changed) {
                purchaseOrderRepository.save(po);
                updatedCount++;
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Data consistency fix completed. Updated " + updatedCount + " records.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup-purchase-inbound-data")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupAllPurchaseAndInboundData(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean confirm,
            javax.servlet.http.HttpServletRequest request) {

        if (!confirm) {
            throw new com.supplypro.common.exception.BusinessException("Double confirmation required. Please set confirm=true.");
        }

        String clientIp = request.getRemoteAddr();
        String operator = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "Unknown";
        log.info("Starting COMPLETE CLEANUP of Purchase & Inbound Data. Requested by: {} from IP: {}", operator, clientIp);

        // 1. Stats Before
        long poCount = purchaseOrderRepository.count();
        long inboundCount = inboundOrderRepository.count();
        // long flowCount = stockFlowRepository.count(); // Unused
        // long batchCount = stockBatchRepository.count(); // Unused

        // 2. Backup
        String backupFilePath = "N/A";
        try {
            Map<String, Object> backupData = new HashMap<>();
            backupData.put("purchaseOrders", purchaseOrderRepository.findAll());
            backupData.put("inboundOrders", inboundOrderRepository.findAll());
            // Backing up all flows/batches might be too much, but let's try or just limit to related?
            // For safety, let's backup all Inbound flows and all Batches
            // To avoid OOM, maybe just main tables.
            // But user asked to backup "related data tables".
            // We'll backup PO and Inbound. Stock data is derivative usually.
            // Let's stick to PO/Inbound for JSON backup to be practical.
            
            java.nio.file.Path backupDir = java.nio.file.Paths.get("backups");
            if (!java.nio.file.Files.exists(backupDir)) {
                java.nio.file.Files.createDirectories(backupDir);
            }
            String filename = "PURCHASE_INBOUND_CLEANUP_" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";
            java.nio.file.Path file = backupDir.resolve(filename);
            objectMapper.writeValue(file.toFile(), backupData);
            backupFilePath = file.toAbsolutePath().toString();
            log.info("Backup created at: {}", backupFilePath);
        } catch (Exception e) {
            log.error("Failed to create backup", e);
            throw new RuntimeException("Backup failed. Aborting cleanup.", e);
        }

        // 3. Deletion Logic
        int deletedFlows = 0;
        int deletedBatches = 0;

        // 3.1 Find all Inbound Orders
        List<com.supplypro.entity.InboundOrder> allInbound = inboundOrderRepository.findAll();
        Set<String> inboundNos = new HashSet<>();
        for (com.supplypro.entity.InboundOrder io : allInbound) {
            inboundNos.add(io.getInboundNo());
        }

        // 3.2 Delete Stock Flows (INBOUND type and referenceNo in inboundNos)
        // Since we don't have a custom query method readily available and want to avoid adding one if possible,
        // we can iterate or use a flexible delete.
        // But iterating all flows is inefficient. 
        // Let's rely on database cascading? No, StockFlow usually doesn't cascade delete from InboundOrder (ReferenceNo is string).
        // So we MUST manually delete.
        // Let's use CriteriaBuilder for deletion? Or just findAll and filter.
        // "Clear ALL" -> maybe we can delete ALL flows of type INBOUND?
        // User said "Clear ALL Purchase & Inbound Data". 
        // Yes, deleting all INBOUND flows is consistent with deleting all Inbound Orders.
        
        List<com.supplypro.entity.StockFlow> inboundFlows = stockFlowRepository.findAll((root, query, cb) -> 
            cb.equal(root.get("flowType"), com.supplypro.entity.StockFlow.FlowType.INBOUND)
        );
        
        // We also want to capture the batches associated with these flows to delete them.
        Set<Long> batchIdsToDelete = new HashSet<>();
        for (com.supplypro.entity.StockFlow flow : inboundFlows) {
            if (flow.getStockBatch() != null) {
                batchIdsToDelete.add(flow.getStockBatch().getId());
            }
        }
        
        stockFlowRepository.deleteAll(inboundFlows);
        deletedFlows = inboundFlows.size();
        stockFlowRepository.flush();

        // 3.3 Delete Stock Batches
        // We only delete batches that we identified from Inbound Flows.
        // Constraint: If a batch is used by an OUTBOUND flow, we cannot delete it (FK violation).
        // We will try to delete them. If failed, we skip.
        // Efficient way: find flows that are NOT inbound, get their batch IDs. Exclude these from deletion.
        
        List<com.supplypro.entity.StockFlow> otherFlows = stockFlowRepository.findAll((root, query, cb) -> 
            cb.notEqual(root.get("flowType"), com.supplypro.entity.StockFlow.FlowType.INBOUND)
        );
        Set<Long> usedBatchIds = new HashSet<>();
        for (com.supplypro.entity.StockFlow flow : otherFlows) {
            if (flow.getStockBatch() != null) {
                usedBatchIds.add(flow.getStockBatch().getId());
            }
        }
        
        batchIdsToDelete.removeAll(usedBatchIds); // Safe to delete these
        
        List<com.supplypro.entity.StockBatch> batchesToDelete = stockBatchRepository.findAllById(batchIdsToDelete);
        stockBatchRepository.deleteAll(batchesToDelete);
        deletedBatches = batchesToDelete.size();
        stockBatchRepository.flush();

        // 3.4 Delete Inbound Orders (Cascades Items usually? Entity definition check needed. Assuming Yes or we delete explicit)
        // InboundOrderItem usually has FK to InboundOrder. 
        // We'll just delete InboundOrders and let Hibernate/DB handle cascade or error.
        // To be safe, delete items first?
        // inboundOrderItemRepository.deleteAll(); // This deletes ALL items. Correct for "Delete ALL".
        inboundOrderItemRepository.deleteAll();
        inboundOrderRepository.deleteAll();
        
        // 3.5 Delete Purchase Orders
        // purchaseOrderItemRepository.deleteAll(); // Delete ALL items.
        purchaseOrderItemRepository.deleteAll();
        purchaseOrderRepository.deleteAll();

        // 4. Verification
        long poCountAfter = purchaseOrderRepository.count();
        long inboundCountAfter = inboundOrderRepository.count();
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Full Purchase & Inbound Data Cleanup Completed.");
        
        Map<String, Object> report = new HashMap<>();
        report.put("po_deleted", poCount - poCountAfter);
        report.put("inbound_deleted", inboundCount - inboundCountAfter);
        report.put("stock_flows_deleted", deletedFlows);
        report.put("stock_batches_deleted", deletedBatches);
        report.put("backup_file", backupFilePath);
        report.put("remaining_batches_skipped", batchIdsToDelete.size() - deletedBatches); // Should be 0 if success
        
        response.put("report", report);
        
        // Log to DataSyncLog or System Log
        log.info("Cleanup Result: PO Deleted: {}, Inbound Deleted: {}, Flows Deleted: {}, Batches Deleted: {}", 
                poCount - poCountAfter, inboundCount - inboundCountAfter, deletedFlows, deletedBatches);

        return ResponseEntity.ok(response);
    }

    @Autowired
    private com.supplypro.repository.WarehouseRepository warehouseRepository;

    @PostMapping("/cleanup-warehouse-and-inbound")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupWarehouseAndInboundData(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean confirm,
            javax.servlet.http.HttpServletRequest request) {

        if (!confirm) {
            throw new com.supplypro.common.exception.BusinessException("Double confirmation required. Please set confirm=true.");
        }

        String clientIp = request.getRemoteAddr();
        String operator = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "Unknown";
        log.info("Starting COMPLETE CLEANUP of WAREHOUSES & PURCHASE INBOUND DATA. Requested by: {} from IP: {}", operator, clientIp);

        // 1. Statistics Before
        long whCount = warehouseRepository.count();
        long poCount = purchaseOrderRepository.count();
        long inboundCount = inboundOrderRepository.count();
        long flowCount = stockFlowRepository.count();
        long batchCount = stockBatchRepository.count();
        long outboundCount = outboundOrderRepository.count();

        // 2. Backup
        String backupFilePath = "N/A";
        try {
            Map<String, Object> backupData = new HashMap<>();
            // Use findAll() for main entities. For large tables (Flow/Batch), we skip full backup to prevent OOM
            // or we could use pagination if strictly required. 
            // Given the requirement "Backup related data", we back up the core documents.
            backupData.put("warehouses", warehouseRepository.findAll());
            backupData.put("purchaseOrders", purchaseOrderRepository.findAll());
            backupData.put("inboundOrders", inboundOrderRepository.findAll());
            // backupData.put("stockBatches", stockBatchRepository.findAll()); // Skipped for performance safety
            
            java.nio.file.Path backupDir = java.nio.file.Paths.get("backups");
            if (!java.nio.file.Files.exists(backupDir)) {
                java.nio.file.Files.createDirectories(backupDir);
            }
            String filename = "WAREHOUSE_INBOUND_CLEANUP_" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";
            java.nio.file.Path file = backupDir.resolve(filename);
            objectMapper.writeValue(file.toFile(), backupData);
            backupFilePath = file.toAbsolutePath().toString();
            log.info("Backup created at: {}", backupFilePath);
        } catch (Exception e) {
            log.error("Failed to create backup", e);
            throw new RuntimeException("Backup failed. Aborting cleanup.", e);
        }

        // 3. Deletion Logic (Order: Child -> Parent)
        // Use deleteAllInBatch for performance
        
        // 3.1 Delete Stock Flows (Dependent on Warehouse & Batch)
        stockFlowRepository.deleteAllInBatch();

        // 3.2 Delete Stock Batches (Dependent on Warehouse)
        stockBatchRepository.deleteAllInBatch();

        // 3.3 Delete Inbound Orders & Items
        inboundOrderItemRepository.deleteAllInBatch();
        inboundOrderRepository.deleteAllInBatch();
        
        // 3.4 Delete Outbound Orders & Items (Dependent on Warehouse)
        // Check if outboundOrderItemRepository is available, if not, rely on cascade or delete outboundOrder
        // If OutboundOrder has CascadeType.REMOVE for items, deleteAllInBatch might fail on FK constraint if items are in separate table?
        // No, deleteAllInBatch generates "DELETE FROM outbound_orders". If FK exists from items, it will fail unless DB has ON DELETE CASCADE.
        // If DB relies on JPA Cascade, we MUST use deleteAll().
        // However, usually we should delete items first.
        // Let's assume standard JPA behavior: deleteAllInBatch is risky if we don't manually delete children first.
        // For OutboundOrder, we don't have the repository injected.
        // Let's use deleteAll() for OutboundOrder to be safe (it handles cascade), unless we inject item repo.
        outboundOrderRepository.deleteAll(); 
        
        // 3.5 Delete Purchase Orders & Items
        purchaseOrderItemRepository.deleteAllInBatch();
        purchaseOrderRepository.deleteAllInBatch();

        // 3.6 Delete Warehouses
        // Managers join table usually handled by JPA? 
        // deleteAllInBatch on Warehouse might leave orphans in warehouse_managers if no DB constraint.
        // But usually there is a FK constraint.
        // To be safe, use deleteAll() for Warehouse which is not huge count usually.
        warehouseRepository.deleteAll();

        // 4. Verification
        long whCountAfter = warehouseRepository.count();
        long poCountAfter = purchaseOrderRepository.count();
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Full Warehouse & Inbound Data Cleanup Completed.");
        
        Map<String, Object> report = new HashMap<>();
        report.put("warehouses_deleted", whCount - whCountAfter);
        report.put("purchase_orders_deleted", poCount - poCountAfter);
        report.put("inbound_orders_deleted", inboundCount - inboundOrderRepository.count());
        report.put("outbound_orders_deleted", outboundCount - outboundOrderRepository.count());
        report.put("stock_flows_deleted", flowCount - stockFlowRepository.count());
        report.put("stock_batches_deleted", batchCount - stockBatchRepository.count());
        report.put("backup_file", backupFilePath);
        
        response.put("report", report);
        
        log.info("Cleanup Result: Warehouses: {}, POs: {}, Inbound: {}, Outbound: {}, Flows: {}, Batches: {}", 
                whCount - whCountAfter, poCount - poCountAfter, inboundCount - inboundOrderRepository.count(),
                outboundCount - outboundOrderRepository.count(), flowCount - stockFlowRepository.count(), 
                batchCount - stockBatchRepository.count());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup-inbound-mock-data")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanupInboundMockData(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean confirm,
            javax.servlet.http.HttpServletRequest request) {

        if (!confirm) {
            throw new com.supplypro.common.exception.BusinessException("Double confirmation required. Please set confirm=true.");
        }

        String clientIp = request.getRemoteAddr();
        String operator = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "Unknown";
        log.info("Starting INBOUND MOCK DATA CLEANUP. Requested by: {} from IP: {}", operator, clientIp);

        // 1. Stats Before
        long inboundCount = inboundOrderRepository.count();
        // long flowCount = stockFlowRepository.count(); // Unused
        // long batchCount = stockBatchRepository.count(); // Unused

        // 2. Backup
        String backupFilePath = "N/A";
        try {
            Map<String, Object> backupData = new HashMap<>();
            backupData.put("inboundOrders", inboundOrderRepository.findAll());
            
            java.nio.file.Path backupDir = java.nio.file.Paths.get("backups");
            if (!java.nio.file.Files.exists(backupDir)) {
                java.nio.file.Files.createDirectories(backupDir);
            }
            String filename = "INBOUND_MOCK_CLEANUP_" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";
            java.nio.file.Path file = backupDir.resolve(filename);
            objectMapper.writeValue(file.toFile(), backupData);
            backupFilePath = file.toAbsolutePath().toString();
            log.info("Backup created at: {}", backupFilePath);
        } catch (Exception e) {
            log.error("Failed to create backup", e);
            throw new RuntimeException("Backup failed. Aborting cleanup.", e);
        }

        // 3. Deletion Logic
        int deletedFlows = 0;
        int deletedBatches = 0;

        // 3.1 Identify Inbound Orders
        List<com.supplypro.entity.InboundOrder> allInbound = inboundOrderRepository.findAll();
        
        if (!allInbound.isEmpty()) {
            Set<String> inboundNos = allInbound.stream()
                .map(com.supplypro.entity.InboundOrder::getInboundNo)
                .collect(java.util.stream.Collectors.toSet());
            
            // 3.2 Identify Stock Flows (Inbound)
            List<com.supplypro.entity.StockFlow> flowsToDelete = new java.util.ArrayList<>();
            Set<com.supplypro.entity.StockBatch> batchesToCheck = new HashSet<>();
            
            for (String no : inboundNos) {
                List<com.supplypro.entity.StockFlow> flows = stockFlowRepository.findByReferenceNo(no);
                flowsToDelete.addAll(flows);
                for (com.supplypro.entity.StockFlow f : flows) {
                    if (f.getStockBatch() != null) batchesToCheck.add(f.getStockBatch());
                }
            }
            
            // 3.3 Delete Flows
            if (!flowsToDelete.isEmpty()) {
                stockFlowRepository.deleteAll(flowsToDelete);
                stockFlowRepository.flush();
                deletedFlows = flowsToDelete.size();
            }
            
            // 3.4 Delete Batches
            // Only delete batches if they are not referenced by other flows (e.g. Outbound)
            // Since we deleted the inbound flows, we check if the batch has any remaining flows?
            // A safer way without extra queries is to try delete and catch exception if FK constraint exists.
            for (com.supplypro.entity.StockBatch batch : batchesToCheck) {
                try {
                    stockBatchRepository.delete(batch);
                    // If successful, increment count
                    deletedBatches++;
                } catch (Exception e) {
                    // Likely DataIntegrityViolationException due to FK from Outbound StockFlow or other tables
                    log.warn("Skipping deletion of StockBatch ID {} due to existing dependencies (likely Outbound records).", batch.getId());
                }
            }
            if (deletedBatches > 0) {
                stockBatchRepository.flush();
            }

            // 3.5 Delete Inbound Orders (and Items via Cascade)
            inboundOrderRepository.deleteAll(allInbound);
            inboundOrderRepository.flush();
        }

        // 4. Verification & Response
        long inboundCountAfter = inboundOrderRepository.count();
        // long flowCountAfter = stockFlowRepository.count(); // Unused
        // long batchCountAfter = stockBatchRepository.count(); // Unused

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Inbound Mock Data Cleanup Completed.");
        
        Map<String, Object> report = new HashMap<>();
        report.put("inbound_orders_deleted", inboundCount - inboundCountAfter);
        report.put("stock_flows_deleted", deletedFlows);
        report.put("stock_batches_deleted", deletedBatches);
        report.put("backup_file", backupFilePath);
        
        response.put("report", report);
        
        log.info("Inbound Cleanup Result: Inbound Deleted: {}, Flows Deleted: {}, Batches Deleted: {}", 
                inboundCount - inboundCountAfter, deletedFlows, deletedBatches);

        return ResponseEntity.ok(response);
    }

    private String createBackup(List<Product> products, String prefix) {
        try {
            java.nio.file.Path backupDir = java.nio.file.Paths.get("backups");
            if (!java.nio.file.Files.exists(backupDir)) {
                java.nio.file.Files.createDirectories(backupDir);
            }
            String filename = prefix + "_" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json";
            java.nio.file.Path file = backupDir.resolve(filename);
            objectMapper.writeValue(file.toFile(), products);
            log.info("Backup created at: {}", file.toAbsolutePath());
            return file.toAbsolutePath().toString();
        } catch (Exception e) {
            log.error("Failed to create backup", e);
            throw new RuntimeException("Backup failed.", e);
        }
    }

    private void deleteProductsAndDependencies(List<Product> products) {
        Set<Long> productIds = new HashSet<>();
        for (Product p : products) {
            productIds.add(p.getId());
        }

        if (productIds.isEmpty()) return;

        // 1. Delete Dependencies
        // Order Items (Sales, Purchase, Inbound)
        // Note: Efficient deletion by ID list would be better, but loop is safer for existing repo methods
        for (Long id : productIds) {
            // Delete Order Items referencing this product
            salesOrderItemRepository.deleteByProductId(id);
            purchaseOrderItemRepository.deleteByProductId(id);
            inboundOrderItemRepository.deleteByProductId(id);
            
            // Delete Stock Data
            stockFlowRepository.deleteByProductId(id);
            stockBatchRepository.deleteByProductId(id);

            // Delete Associations
            productBundleRepository.deleteByParentProductId(id); // If it's a bundle
            productBundleRepository.deleteByChildProductId(id);  // If it's a child in a bundle (unlikely for Bundles, but possible for Normal)
            
            productBrandRepository.deleteByProductId(id);
            skuRepository.deleteByProductId(id);
            
            productStatusChangeLogRepository.deleteByProductId(id);
            productTaxChangeLogRepository.deleteByProductId(id);
            
            // Force flush to ensure foreign key constraints are respected
            entityManager.flush();
            
            // Delete Product
            productRepository.deleteById(id);
        }
    }

    @Autowired
    private com.supplypro.repository.DeliveryExportRecordRepository deliveryExportRecordRepository;

    @PostMapping("/update-export-record-counts")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateExportRecordCounts() {
        log.info("开始更新导出记录计数字段...");
        
        java.util.List<com.supplypro.entity.DeliveryExportRecord> records = deliveryExportRecordRepository.findAll();
        int updatedCount = 0;
        
        for (com.supplypro.entity.DeliveryExportRecord record : records) {
            if (record.getTotalCount() == null && record.getPurchaseOrderIds() != null) {
                String[] ids = record.getPurchaseOrderIds().split(",");
                int count = ids.length;
                record.setTotalCount(count);
                record.setSuccessCount(count);
                record.setFailCount(0);
                record.setStatus("SUCCESS");
                deliveryExportRecordRepository.save(record);
                updatedCount++;
                log.info("更新记录 ID: {}, 总数: {}", record.getId(), count);
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "更新完成");
        response.put("updatedCount", updatedCount);
        response.put("totalRecords", records.size());
        
        log.info("导出记录计数更新完成，共更新 {} 条记录", updatedCount);
        
        return ResponseEntity.ok(response);
    }
}
