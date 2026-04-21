package com.supplypro.service.impl;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.Warehouse;
import com.supplypro.entity.InboundOrderItem;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.CostAdjustmentSheet;
import com.supplypro.entity.CostAdjustmentItem;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.CostAdjustmentSheetRepository;
import com.supplypro.repository.CostAdjustmentItemRepository;
import com.supplypro.entity.SettlementOrder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.service.NotificationService;
import com.supplypro.service.PurchaseOrderService;
import com.supplypro.repository.ProductRepository;
import com.supplypro.entity.Product;
import com.supplypro.entity.Sku;
import com.supplypro.entity.LogisticsTrack;
import com.supplypro.repository.LogisticsTrackRepository;
import com.supplypro.util.PurchaseOrderShippingValidator;
import com.supplypro.utils.StatusTranslator;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.hibernate.Hibernate;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.PageImpl;
import java.util.Collections;
import java.util.List;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.entity.PurchaseOrderLog;
import org.springframework.context.ApplicationEventPublisher;
import com.supplypro.event.PurchaseOrderInboundEvent;
import com.supplypro.event.PurchaseReceivedEvent;
import com.supplypro.repository.UserRepository;
import com.supplypro.entity.User;

import com.supplypro.service.SettlementService;
import com.supplypro.service.PurchaseOrderSnapshotService;

import com.supplypro.entity.CostAdjustmentSheet;
import com.supplypro.repository.CostAdjustmentSheetRepository;
import java.math.BigDecimal;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Service
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseOrderServiceImpl.class);

    @Autowired
    private CostAdjustmentSheetRepository costAdjustmentSheetRepository;

    @Autowired
    private CostAdjustmentItemRepository costAdjustmentItemRepository;

    @Autowired
    private PurchaseOrderSnapshotService snapshotService;

    @Autowired
    private SettlementService settlementService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;
    
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private LogisticsTrackRepository logisticsTrackRepository;

    @Autowired
    private com.supplypro.repository.LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private com.supplypro.repository.SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.supplypro.repository.SupplierRepository supplierRepository;

    @Autowired
    private NotificationService notificationService;

    @Override
    @CircuitBreaker(name = "purchaseOrderList", fallbackMethod = "getPurchaseOrdersFallback")
    @Retry(name = "purchaseOrderList")
    public Page<PurchaseOrder> getPurchaseOrders(Specification<PurchaseOrder> spec, Pageable pageable) {
        // Ensure default sort by createdAt desc if not sorted
        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), 
                org.springframework.data.domain.Sort.by("createdAt").descending().and(org.springframework.data.domain.Sort.by("id").descending()));
        }
        Page<PurchaseOrder> result = purchaseOrderRepository.findAll(spec, pageable);
        
        // Populate InboundOrderNo and Amounts
        result.getContent().forEach(po -> {
             // This might cause N+1 problem but preserving existing logic for now
             // Resilience note: If this fails, the whole method fails and triggers fallback
             try {
                 inboundOrderRepository.findByPurchaseOrder(po).ifPresent(io -> {
                     po.setInboundOrderNo(io.getInboundNo());
                     po.setInboundOrderId(io.getId());
                     po.setInboundOrderStatus(io.getStatus().name());
                 });
             } catch (Exception e) {
                 logger.error("Error fetching Inbound Order for PO {}: {}", po.getOrderNo(), e.getMessage());
                 // Continue without Inbound info instead of crashing
             }

             // Calculate Payable and Settled Amounts
             // 商品应结金额 = 采购单成本（不含运费），运费单独结算
             try {
                 java.math.BigDecimal total = po.getTotalAmount() != null ? po.getTotalAmount() : java.math.BigDecimal.ZERO;
                 po.setPayableAmount(total);
    
                 if (po.getSettlementStatus() == PurchaseOrder.SettlementStatus.SETTLED) {
                     po.setSettledAmount(po.getPayableAmount());
                 } else {
                     po.setSettledAmount(java.math.BigDecimal.ZERO);
                 }
             } catch (Exception e) {
                 logger.error("Error calculating amounts for PO {}: {}", po.getOrderNo(), e.getMessage());
                 po.setPayableAmount(java.math.BigDecimal.ZERO);
                 po.setSettledAmount(java.math.BigDecimal.ZERO);
             }
        });

        // Cache the first page of results (simulating "Recent 500" update on read)
        // In a real scenario, this should be done on write (create/update), but for this diagnosis fix,
        // we ensure cache is populated on reads too.
        if (pageable.getPageNumber() == 0 && !result.isEmpty()) {
            try {
                String cacheKey = "purchase_orders:recent";
                // Fix: Overwrite cache to prevent duplicates and ensure correct order
                redisTemplate.delete(cacheKey);
                redisTemplate.opsForList().rightPushAll(cacheKey, result.getContent().toArray());
                redisTemplate.expire(cacheKey, 1, TimeUnit.HOURS);
            } catch (Exception e) {
                logger.warn("Failed to update Purchase Order cache: {}", e.getMessage());
            }
        }
        return result;
    }

    public Page<PurchaseOrder> getPurchaseOrdersFallback(Specification<PurchaseOrder> spec, Pageable pageable, Throwable t) {
        logger.error("Database unavailable, entering fallback. Error: {}", t.getMessage());
        
        try {
            String cacheKey = "purchase_orders:recent";
            List<Object> cachedObjects = redisTemplate.opsForList().range(cacheKey, 0, -1);
            
            if (cachedObjects == null || cachedObjects.isEmpty()) {
                 return new PageImpl<>(Collections.emptyList(), pageable, 0);
            }

            List<PurchaseOrder> cachedPOs = cachedObjects.stream()
                .filter(obj -> obj instanceof PurchaseOrder)
                .map(obj -> (PurchaseOrder) obj)
                .collect(Collectors.toList());
            
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), cachedPOs.size());
            
            if (start >= cachedPOs.size()) {
                 return new PageImpl<>(Collections.emptyList(), pageable, cachedPOs.size());
            }
            
            List<PurchaseOrder> pageContent = cachedPOs.subList(start, end);
            return new PageImpl<>(pageContent, pageable, cachedPOs.size());
        } catch (Exception e) {
            logger.error("Fallback failed: {}", e.getMessage());
            return new PageImpl<>(Collections.emptyList(), pageable, 0);
        }
    }

    @Override
    @Transactional
    public PurchaseOrder createFromPlatformConfirm(com.supplypro.dto.PlatformConfirmRequest request) {
        logger.info("Creating Purchase Order from Platform Confirm: {}", request.getOrderNo());
        
        PurchaseOrder order = new PurchaseOrder();
        
        // 1. 设置基本信息
        order.setOrderNo(generatePurchaseOrderNumber());
        order.setPlatformOrderNo(request.getOrderNo());
        order.setBizNo(request.getBizNo());
        order.setPlatformName(request.getPlatformName());
        order.setThirdPartyNo(request.getThirdPartyNo());
        order.setProjectName(request.getProjectName());
        
        // 采购类型和业务类型
        order.setType(PurchaseOrder.Type.STANDARD);
        if ("Replenishment".equals(request.getBusinessType())) {
            order.setBizType(PurchaseOrder.BizType.REPLENISHMENT);
        } else {
            order.setBizType(PurchaseOrder.BizType.PLATFORM);
        }
        
        // 生成的采购单初始状态应该是待处理
        order.setStatus(PurchaseOrder.Status.PENDING);
        order.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
        
        if (request.getExpectedReceiveTime() != null && !request.getExpectedReceiveTime().isEmpty()) {
            try {
                String timeStr = request.getExpectedReceiveTime();
                if (timeStr.length() > 10) {
                    timeStr = timeStr.substring(0, 10);
                }
                order.setDeliveryDate(java.time.LocalDate.parse(timeStr));
            } catch (Exception e) {
                logger.warn("Failed to parse expectedReceiveTime: {}", request.getExpectedReceiveTime());
            }
        }
        order.setRemark(request.getRemark());
        
        if (request.getReceiver() != null) {
            String[] parts = request.getReceiver().split(" / ");
            if (parts.length > 0) order.setContactName(parts[0].trim());
            if (parts.length > 1) order.setContactPhone(parts[1].trim());
        }
        order.setDetailAddress(request.getAddress());
        
        // 2. 设置供应商
        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId()).orElse(null);
        }
        if (supplier == null && request.getSupplierName() != null) {
            org.springframework.data.domain.Page<Supplier> page = supplierRepository.findByNameContaining(request.getSupplierName(), org.springframework.data.domain.PageRequest.of(0, 1));
            if (page.hasContent()) {
                supplier = page.getContent().get(0);
            }
        }
        if (supplier == null) {
            // 兜底策略
            java.util.List<Supplier> allSuppliers = supplierRepository.findAll();
            if (!allSuppliers.isEmpty()) {
                supplier = allSuppliers.get(0);
            } else {
                throw new RuntimeException("No valid supplier found for platform confirmation");
            }
        }
        order.setSupplier(supplier);
        order.setSupplierId(supplier.getId());
        
        // 兜底设置仓库：只有非“平台单”和“补货单”才强制校验或兜底仓库
        if (order.getBizType() != PurchaseOrder.BizType.PLATFORM && order.getBizType() != PurchaseOrder.BizType.REPLENISHMENT) {
            java.util.List<com.supplypro.entity.Warehouse> warehouses = warehouseRepository.findAll();
            if (!warehouses.isEmpty()) {
                order.setWarehouseId(warehouses.get(0).getId());
            } else {
                order.setWarehouseId(1L);
            }
        }
        
        // 3. 设置明细
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setPurchaseOrder(order);
        item.setProductId(request.getProductId());
        
        Product product = productRepository.findById(request.getProductId())
            .orElseThrow(() -> new RuntimeException("Product not found: " + request.getProductId()));
        item.setProduct(product);
        item.setSpec(request.getSpecName());
        
        item.setQuantity(request.getQuantity());
        item.setUnitPrice(request.getCost());
        
        java.math.BigDecimal totalAmount = request.getCost().multiply(new java.math.BigDecimal(request.getQuantity()));
        item.setTotalPrice(totalAmount);
        
        java.util.List<PurchaseOrderItem> items = new java.util.ArrayList<>();
        items.add(item);
        order.setItems(items);
        order.setTotalAmount(totalAmount);
        
        // 4. 处理成本承担方及结算状态
        // 默认 PLATFORM，如果 request.getCostType() 是 Supplier，则映射为 SUPPLIER
        if ("Supplier".equalsIgnoreCase(request.getCostType()) || "供应商承担".equals(request.getCostType())) {
            order.setCostType("SUPPLIER");
            // 供应商承担时，应结金额为0，状态自动流转为已结算
            order.setPayableAmount(java.math.BigDecimal.ZERO);
            order.setSettledAmount(java.math.BigDecimal.ZERO);
            order.setSettlementStatus(PurchaseOrder.SettlementStatus.SETTLED);
        } else {
            order.setCostType("PLATFORM");
            order.setPayableAmount(totalAmount);
            order.setSettledAmount(java.math.BigDecimal.ZERO);
            order.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
        }
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            order.setCreatedBy(authentication.getName());
        } else {
            order.setCreatedBy("SYSTEM");
        }
        
        // 5. 保存
        PurchaseOrder saved = purchaseOrderRepository.saveAndFlush(order);
        snapshotService.captureSnapshot(saved);
        
        return saved;
    }

    @Override
    @Transactional
    public PurchaseOrder createGeneralPurchaseOrder(PurchaseOrder order) {
        logger.info("Creating General Purchase Order. DeliveryDate received: {}", order.getDeliveryDate());
        
        // Force initial status to PENDING for all other types
        order.setStatus(PurchaseOrder.Status.PENDING);

        // Ensure Order No is generated (C-prefix format)
        if (order.getOrderNo() == null || !order.getOrderNo().startsWith("C")) {
            order.setOrderNo(generatePurchaseOrderNumber());
        }

        if (order.getCreatedBy() == null) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
                order.setCreatedBy(authentication.getName());
            } else {
                order.setCreatedBy("SYSTEM");
            }
        }
        
        // Link items
        if (order.getItems() != null) {
            for (var item : order.getItems()) {
                if (item.getProductId() == null) {
                    throw new IllegalArgumentException("Product ID is required for all items");
                }
                logger.debug("Linking item {} to Order", item.getProductName());
                item.setPurchaseOrder(order);
            }
        }
        
        PurchaseOrder saved = purchaseOrderRepository.saveAndFlush(order);
        logger.info("Order saved successfully. ID: {}", saved.getId());
        
        // Capture Snapshot
        try {
            snapshotService.captureSnapshot(saved);
        } catch (Exception e) {
            logger.error("Failed to capture snapshot for PO {}", saved.getOrderNo(), e);
            // Non-fatal for general POs? Or should we rollback?
            // Existing controller logic logged error but didn't rollback.
            // But strict rules say "Purchase Order Snapshot Rule: All POs... must generate an immutable snapshot."
            // So we should probably throw exception to rollback.
            // But let's stick to existing behavior for now or improve it.
            // For Inbound, we throw. For General, let's also throw to be safe.
             throw new RuntimeException("Purchase Order created but Snapshot generation failed. Transaction rolled back. Reason: " + e.getMessage());
        }
        
        return saved;
    }

    @Override
    @Transactional
    public PurchaseOrder generateInboundPurchaseOrder(PurchaseOrder poData) {
        logger.info("Generating Inbound Purchase Order. WarehouseID: {}, Items: {}, DeliveryDate: {}, Attachments: {}", 
                poData.getWarehouseId(), 
                poData.getItems() != null ? poData.getItems().size() : 0,
                poData.getDeliveryDate(),
                poData.getAttachments());

        if (poData.getItems() == null || poData.getItems().isEmpty()) {
            throw new IllegalArgumentException("Purchase Order must contain at least one product item.");
        }

        // Idempotency Check
        // Key based on Warehouse + SKU Code (unique per item) + timestamp to prevent false positives
        // Each purchase order item has a unique SKU code, so we use that for idempotency
        String skuCode = (poData.getItems() != null && !poData.getItems().isEmpty() && poData.getItems().get(0).getSkuCode() != null) 
                ? poData.getItems().get(0).getSkuCode() 
                : String.valueOf(poData.getItems().get(0).getProductId());
        String idempotencyKey = "po_submit:" + poData.getWarehouseId() + ":" + skuCode;
        
        // Use setIfAbsent for atomic operation (prevents race condition)
        Boolean wasSet = redisTemplate.opsForValue().setIfAbsent(idempotencyKey, "1", 5, TimeUnit.SECONDS);
        if (Boolean.FALSE.equals(wasSet)) {
             throw new RuntimeException("请勿重复提交");
        }

        // Set Status
        poData.setStatus(PurchaseOrder.Status.CONFIRMED);
        poData.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
        
        // Ensure Type
        if (poData.getType() == null) {
            // [RULE 1] Purchase Type must be fixed to 'INBOUND' for Inbound Orders.
            // Requirement: 采购类型字段必须固定显示为“入库采购”，不可随其他条件变化
            // Source: Hardcoded in backend logic for Inbound path.
            poData.setType(PurchaseOrder.Type.INBOUND);
        }

        // Generate Order No if missing or if it doesn't match New format (C...)
        // [RULE] Purchase Order Number must follow C + YYYYMMDDHHMM + 3-digit sequence
        // Requirement: 采购单号编码规则修改为固定格式：以字母"C"开头...
        if (poData.getOrderNo() == null || !poData.getOrderNo().startsWith("C")) {
            poData.setOrderNo(generatePurchaseOrderNumber());
        }

        // We will validate and set bizType based on the requirements later.

        // Ensure Supplier is properly linked (fix for supplier association)
        if (poData.getSupplierId() != null && poData.getSupplier() == null) {
            Supplier supplier = supplierRepository.findById(poData.getSupplierId()).orElse(null);
            if (supplier != null) {
                poData.setSupplier(supplier);
                logger.info("Linked supplier {} to PO", supplier.getName());
            } else {
                logger.warn("Supplier not found for ID: {}", poData.getSupplierId());
            }
        }

        // [RULE 4] Delivery Date (Expected Arrival) is taken directly from User Input.
        // Requirement: 期望收货时间字段必须直接读取并显示用户在填写“新增入库采购单”时所录入的“预计到货时间”
        // Source: poData.getDeliveryDate() passed from frontend, no timezone conversion applied.
        
        // Ensure createdBy is set (prevent DataIntegrityViolationException)
        if (poData.getCreatedBy() == null) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
                poData.setCreatedBy(authentication.getName());
            } else {
                poData.setCreatedBy("SYSTEM");
            }
        }
        
        // Mark as from Stock In for Inbound Orders created via this method
        if (poData.getType() == PurchaseOrder.Type.INBOUND) {
            poData.setIsFromStockIn(true);
        }
        
        // Link items to PO (Fix for "order_id cannot be null") and Calculate Total Amount
        java.math.BigDecimal calculatedTotal = java.math.BigDecimal.ZERO;
        
        if (poData.getItems() != null) {
            for (int i = 0; i < poData.getItems().size(); i++) {
                PurchaseOrderItem item = poData.getItems().get(i);
                logger.info("DEBUG: Checking Item index {}: {}", i, item);
                if (item.getProductId() == null) {
                    logger.error("Pre-save Validation failed: Product ID is null for item at index {}. Item content: {}", i, item);
                    throw new IllegalArgumentException("Product ID cannot be null for item at index " + i + ". Item data: " + item);
                }
                
                // Ensure Unit Price is set
                if (item.getUnitPrice() == null) {
                     // Try to fetch from Product's first SKU if available (heuristic)
                     Product product = productRepository.findById(item.getProductId()).orElse(null);
                     boolean priceFound = false;
                     if (product != null) {
                         // Note: accessing skus might trigger lazy loading if session is open, or fail if closed
                         // Since we are in @Transactional, it should work
                         try {
                             if (product.getSkus() != null && !product.getSkus().isEmpty()) {
                                 java.math.BigDecimal cost = product.getSkus().get(0).getCostPrice();
                                 if (cost != null) {
                                     item.setUnitPrice(cost);
                                     priceFound = true;
                                 }
                             }
                         } catch (Exception e) {
                             logger.warn("Failed to fetch SKU price for product {}: {}", item.getProductId(), e.getMessage());
                         }
                     }
                     
                     if (!priceFound) {
                         item.setUnitPrice(java.math.BigDecimal.ZERO);
                     }
                }
                
                // Ensure Total Price is set
                if (item.getTotalPrice() == null) {
                    item.setTotalPrice(item.getUnitPrice().multiply(new java.math.BigDecimal(item.getQuantity())));
                }
                
                calculatedTotal = calculatedTotal.add(item.getTotalPrice());
                item.setPurchaseOrder(poData);
            }
        }
        
        // Set Total Amount if missing
        if (poData.getTotalAmount() == null) {
            poData.setTotalAmount(calculatedTotal);
        }
        
        // Save PO
        PurchaseOrder savedPo = purchaseOrderRepository.save(poData);
        
        // Automatically trigger Inbound Order creation Synchronously to ensure real-time visibility
        if (savedPo.getType() == PurchaseOrder.Type.INBOUND) {
            try {
                InboundOrder inboundOrder = null;
                if (savedPo.getBizType() == PurchaseOrder.BizType.INBOUND && savedPo.getBizNo() != null) {
                    inboundOrder = inboundOrderRepository.findByInboundNo(savedPo.getBizNo()).orElse(null);
                    if (inboundOrder != null) {
                        inboundOrder.setPurchaseOrder(savedPo);
                        inboundOrderRepository.save(inboundOrder);
                        savedPo.setPlatformOrderNo("入库采购-" + inboundOrder.getInboundNo());
                        savedPo = purchaseOrderRepository.saveAndFlush(savedPo);
                        entityManager.refresh(savedPo);
                        logger.info("Synchronously linked existing Inbound Order: {} for PO: {}", inboundOrder.getInboundNo(), savedPo.getOrderNo());
                    }
                }
                
                if (inboundOrder == null) {
                    // Create Inbound Order immediately in the same transaction context
                    // Note: calling this.createInboundOrder via 'this' ignores @Transactional(REQUIRES_NEW) 
                    // which is exactly what we want (same transaction)
                    inboundOrder = createInboundOrder(savedPo);
                    
                    // Update PO with Inbound No reference
                    savedPo.setPlatformOrderNo("入库采购-" + inboundOrder.getInboundNo());
                    if (savedPo.getBizNo() == null || savedPo.getBizNo().isEmpty()) {
                        savedPo.setBizNo(inboundOrder.getInboundNo());
                    }
                    // Set BizType to INBOUND for inbound purchase orders
                    savedPo.setBizType(PurchaseOrder.BizType.INBOUND);
                    // No need to call save again if entity is managed, but to be safe:
                    savedPo = purchaseOrderRepository.saveAndFlush(savedPo);
                    
                    // Refresh entity to populate all relationship fields (like Supplier name, Warehouse name)
                    // This prevents "data loss" appearance in frontend when using the returned object
                    entityManager.refresh(savedPo);
                    logger.info("DEBUG: Post-refresh DeliveryDate: {}", savedPo.getDeliveryDate());
                }
                
                // Explicitly initialize Lazy-loaded collections to ensure they are available for serialization
                // This fixes "Empty Data" / "Product Mismatch" issues in frontend
                Hibernate.initialize(savedPo.getItems());
                if (savedPo.getSupplier() != null) {
                    Hibernate.initialize(savedPo.getSupplier());
                }
                
                // Re-populate Transient fields lost during refresh
                savedPo.setInboundOrderNo(inboundOrder.getInboundNo());
                savedPo.setInboundOrderId(inboundOrder.getId());
                
                // Update Status to PENDING (per business rule: newly generated inbound PO starts as PENDING)
                savedPo.setStatus(PurchaseOrder.Status.PENDING);
                savedPo = purchaseOrderRepository.save(savedPo);

                // Log the status initialization
                PurchaseOrderLog log = new PurchaseOrderLog();
                log.setPurchaseOrderId(savedPo.getId());
                log.setOperator(SecurityContextHolder.getContext().getAuthentication() != null ? 
                        SecurityContextHolder.getContext().getAuthentication().getName() : "系统");
                log.setOperationType("STATUS_CHANGE");
                log.setOldValue(null);
                log.setNewValue(PurchaseOrder.Status.PENDING.name());
                log.setRemark("初始化入库单，状态：待处理");
                purchaseOrderLogRepository.save(log);

                logger.info("Synchronously created Inbound Order: {} for PO: {}", inboundOrder.getInboundNo(), savedPo.getOrderNo());
                
                // Publish Inbound Created Event
                try {
                    eventPublisher.publishEvent(new PurchaseOrderInboundEvent(this, savedPo));
                    logger.info("Published PurchaseOrderInboundEvent for PO: {}", savedPo.getOrderNo());
                } catch (Exception evtEx) {
                    logger.error("Failed to publish PurchaseOrderInboundEvent: {}", evtEx.getMessage());
                }

            } catch (Exception e) {
                logger.error("Failed to create Inbound Order synchronously", e);
                throw new RuntimeException("Failed to create associated Inbound Order: " + e.getMessage());
            }
        } else if (savedPo.getType() == PurchaseOrder.Type.DROPSHIP) {
            // Future logic for dropship
        }
        
        // Capture Snapshot
        try {
            snapshotService.captureSnapshot(savedPo);
        } catch (Exception e) {
            logger.error("Snapshot generation failed for PO: {}", savedPo.getOrderNo(), e);
            throw new RuntimeException("Purchase Order created but Snapshot generation failed. Transaction rolled back. Reason: " + e.getMessage());
        }
        
        return savedPo;
    }

    @Override
    @Transactional
    public InboundOrder createInboundOrder(PurchaseOrder savedPo) {
        // Source Validation: Only allow INBOUND type POs
        if (savedPo.getType() != PurchaseOrder.Type.INBOUND) {
            throw new IllegalArgumentException("Invalid operation: Inbound Order can only be generated from INBOUND type Purchase Orders.");
        }

        InboundOrder inboundOrder = new InboundOrder();
        
        // Generate Inbound No
        // If PO Number already follows Inbound format (starts with IN), use it (Requirement 3)
        // Otherwise generate a new one (Legacy fallback)
        String inboundNo;
        if (savedPo.getOrderNo() != null && savedPo.getOrderNo().startsWith("IN")) {
            inboundNo = savedPo.getOrderNo();
        } else {
            inboundNo = generateInboundOrderNumber();
        }
        
        inboundOrder.setInboundNo(inboundNo);
        inboundOrder.setPurchaseOrder(savedPo);
        inboundOrder.setStatus(InboundOrder.Status.PENDING);
        inboundOrder.setCreatedAt(savedPo.getCreatedAt() != null ? savedPo.getCreatedAt() : java.time.LocalDateTime.now());
        
        // Link Warehouse
        if (savedPo.getWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(savedPo.getWarehouseId())
                    .orElseThrow(() -> new RuntimeException("Warehouse not found"));
            inboundOrder.setWarehouse(warehouse);
            inboundOrder.setWarehouseCode(warehouse.getCode()); // Always set warehouse code
            
            // Auto-fill delivery info
            // Priority: Purchase Order (User Input from Frontend) > Warehouse (System Record)
            
            // 1. Address Info
            boolean hasPoAddress = savedPo.getDetailAddress() != null && !savedPo.getDetailAddress().trim().isEmpty();
            
            if (hasPoAddress) {
                inboundOrder.setProvince(savedPo.getProvince());
                inboundOrder.setCity(savedPo.getCity());
                inboundOrder.setDistrict(savedPo.getDistrict());
                inboundOrder.setDetailAddress(savedPo.getDetailAddress());
                
                // Construct legacy full address string
                StringBuilder addr = new StringBuilder();
                if (savedPo.getProvince() != null) addr.append(savedPo.getProvince());
                if (savedPo.getCity() != null) addr.append(savedPo.getCity());
                if (savedPo.getDistrict() != null) addr.append(savedPo.getDistrict());
                addr.append(" ").append(savedPo.getDetailAddress());
                inboundOrder.setDeliveryAddress(addr.toString());
            } else {
                inboundOrder.setProvince(warehouse.getProvince());
                inboundOrder.setCity(warehouse.getCity());
                inboundOrder.setDistrict(warehouse.getDistrict());
                inboundOrder.setDetailAddress(warehouse.getAddress());
                
                // Construct legacy full address string
                StringBuilder addr = new StringBuilder();
                if (warehouse.getProvince() != null) addr.append(warehouse.getProvince());
                if (warehouse.getCity() != null) addr.append(warehouse.getCity());
                if (warehouse.getDistrict() != null) addr.append(warehouse.getDistrict());
                addr.append(" ").append(warehouse.getAddress());
                inboundOrder.setDeliveryAddress(addr.toString());
            }

            // 2. Contact Info
            boolean hasPoContact = savedPo.getContactName() != null && !savedPo.getContactName().trim().isEmpty();
            
            if (hasPoContact) {
                inboundOrder.setContactName(savedPo.getContactName());
                inboundOrder.setContactPhone(savedPo.getContactPhone());
                // PO doesn't have email usually, so leave null or try fetch
            } else {
                 if (warehouse.getManagers() != null && !warehouse.getManagers().isEmpty()) {
                     com.supplypro.entity.User manager = warehouse.getManagers().iterator().next();
                     inboundOrder.setContactName(manager.getUsername()); // Or nickname if available
                     inboundOrder.setContactPhone(manager.getPhone());
                     inboundOrder.setContactEmail(manager.getEmail());
                 } else if (warehouse.getAdmins() != null && !warehouse.getAdmins().isEmpty()) {
                     inboundOrder.setContactName(warehouse.getAdmins());
                     // Legacy admin string doesn't have phone/email easily
                 }
            }

        }
        
        // Map Items
        if (savedPo.getItems() != null) {
            inboundOrder.setItems(savedPo.getItems().stream().map(poItem -> {
                InboundOrderItem item = new InboundOrderItem();
                item.setInboundOrder(inboundOrder); 
                
                // Fetch Product
                if (poItem.getProductId() == null) {
                    logger.error("Validation failed: Product ID is null for item: {}", poItem.getProductName());
                    throw new IllegalArgumentException("Product ID cannot be null for item: " + poItem.getProductName());
                }
                
                Product product = productRepository.findById(poItem.getProductId())
                        .orElseThrow(() -> {
                            logger.error("Product not found for ID: {}", poItem.getProductId());
                            return new RuntimeException("Product not found");
                        });
                item.setProduct(product);
                
                item.setQuantity(poItem.getQuantity());
                item.setUnitCost(poItem.getUnitPrice());
                item.setTotalCost(poItem.getTotalPrice());
                item.setSpec(poItem.getSpec());
                return item;
            }).collect(Collectors.toList()));
        }
        
        return inboundOrderRepository.saveAndFlush(inboundOrder);
    }

    private synchronized String generatePurchaseOrderNumber() {
        // Generate Purchase Order No: C + yyyyMMddHHmm + 001-999
        LocalDateTime now = LocalDateTime.now();
        String timeStr = now.format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
        String key = "po_seq:" + timeStr;
        
        // Retry loop to ensure uniqueness against DB
        for (int i = 0; i < 50; i++) {
            Long seq = redisTemplate.opsForValue().increment(key);
            
            if (seq != null && seq == 1) {
                redisTemplate.expire(key, 10, TimeUnit.MINUTES);
            }
            
            if (seq != null && seq > 999) {
                 // In unlikely event of >999 per minute, wait a bit or throw
                 // We can just sleep 1s and retry (will get new minute) or throw
                 throw new RuntimeException("Purchase Order sequence limit (999) exceeded for current minute. Please try again shortly.");
            }
            
            String seqStr = String.format("%03d", seq != null ? seq : 1);
            String candidateNo = "C" + timeStr + seqStr;
            
            // Check DB for uniqueness
            if (purchaseOrderRepository.findByOrderNo(candidateNo) == null) {
                return candidateNo;
            }
        }
         throw new RuntimeException("Failed to generate unique Purchase Order Number after 50 retries.");
    }

    private String generateInboundOrderNumber() {
        // Generate Inbound No: IN + yyyyMMdd + HHmm (10m interval) + 001-999
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        String dateStr = java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd").format(now);
        
        int minute = now.getMinute();
        int bucket = (minute / 10) * 10;
        String timeStr = String.format("%02d%02d", now.getHour(), bucket);
        
        String key = "inbound_seq:" + dateStr + timeStr;
        
        // Retry loop to ensure uniqueness against DB (in case of Redis data loss)
        for (int i = 0; i < 50; i++) {
            Long seq = redisTemplate.opsForValue().increment(key);
            
            if (seq != null && seq == 1) {
                redisTemplate.expire(key, 1, TimeUnit.HOURS);
            }
            
            if (seq != null && seq > 999) {
                throw new RuntimeException("Inbound Order sequence limit (999) exceeded for current time slot. Please try again in 10 minutes.");
            }
            
            String seqStr = String.format("%03d", seq != null ? seq : 1);
            String candidateNo = "IN" + dateStr + timeStr + seqStr;
            
            // Check DB for uniqueness
            if (inboundOrderRepository.findByInboundNo(candidateNo).isEmpty()) {
                return candidateNo;
            }
            // If exists, loop will continue and increment Redis again
        }
        
        throw new RuntimeException("Failed to generate unique Inbound Order Number after 50 retries.");
    }

    @Override
    @Transactional
    public void shipPurchaseOrder(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        PurchaseOrderShippingValidator.validateFirstShip(po);

        PurchaseOrder.ShippingStatus oldStatus = po.getShippingStatus();
        PurchaseOrder.Status oldMainStatus = po.getStatus();
        
        logger.info("=== 首次发货操作开始 === 采购单: {}, 原状态: {}", po.getOrderNo(), oldStatus);
        
        po.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
        if (po.getStatus() == PurchaseOrder.Status.CONFIRMED || po.getStatus() == PurchaseOrder.Status.PENDING) {
            po.setStatus(PurchaseOrder.Status.SHIPPED);
        }
        po.setShippedAt(java.time.LocalDateTime.now());
        
        purchaseOrderRepository.save(po);
        
        // 创建商品结算单（当状态变更为已发货时）
        createPurchaseSettlementIfNeeded(po, oldMainStatus, "SHIPPED");
        
        inboundOrderRepository.findByPurchaseOrder(po).ifPresent(io -> {
            io.setShippedAt(po.getShippedAt());
            inboundOrderRepository.save(io);
        });
        
        try {
            PurchaseOrderLog log = new PurchaseOrderLog();
            log.setPurchaseOrderId(po.getId());
            log.setOperationType("FIRST_SHIP");
            log.setOldValue(oldStatus != null ? oldStatus.name() : "NULL");
            log.setNewValue(PurchaseOrder.ShippingStatus.SHIPPED.name());
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String operator = (auth != null && auth.isAuthenticated()) ? auth.getName() : "系统";
            log.setOperator(operator);
            
            String oldStatusText = StatusTranslator.translateShippingStatus(oldStatus != null ? oldStatus.name() : "NULL");
            log.setRemark("首次发货：采购单从" + oldStatusText + "状态转为已发货");
            purchaseOrderLogRepository.save(log);
            
            logger.info("首次发货日志已记录: 采购单={}, 操作员={}", po.getOrderNo(), operator);
        } catch (Exception e) {
            logger.warn("Failed to save shipping log: {}", e.getMessage());
        }
        
        try {
            snapshotService.captureSnapshot(po);
        } catch (Exception e) {
            logger.error("Failed to capture snapshot for PO {}", po.getOrderNo(), e);
        }

        logger.info("=== 首次发货操作完成 === 采购单: {}, 新状态: {}", po.getOrderNo(), po.getShippingStatus());
    }

    @Override
    @Transactional
    public void shipWithLogisticsInfo(Long id, String company, String trackingNo, java.time.LocalDateTime shippedAt, java.time.LocalDateTime expectedArrival, String deliverer, String delivererPhone, String plateNumber, java.math.BigDecimal logisticsFee, Long logisticsProviderId, String deliveryMethod) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithLock(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        PurchaseOrderShippingValidator.validateFirstShip(po);

        logger.info("=== 首次发货操作开始 === 采购单: {}, 当前状态: {}", po.getOrderNo(), po.getShippingStatus());

        PurchaseOrder.ShippingStatus oldStatus = po.getShippingStatus();
        PurchaseOrder.Status oldMainStatus = po.getStatus();
        
        po.setLogisticsCompany(company);
        po.setTrackingNumber(trackingNo);
        po.setDeliverer(deliverer);
        po.setDelivererPhone(delivererPhone);
        po.setPlateNumber(plateNumber);
        po.setLogisticsFee(logisticsFee != null ? logisticsFee : java.math.BigDecimal.ZERO);
        po.setDeliveryMethod(deliveryMethod);
        
        if (shippedAt != null) {
            po.setShippedAt(shippedAt);
        } else {
            po.setShippedAt(java.time.LocalDateTime.now());
        }
        
        if (expectedArrival != null) {
            po.setExpectedArrival(expectedArrival);
        }
        
        if (logisticsProviderId != null) {
            com.supplypro.entity.LogisticsProvider provider = logisticsProviderRepository.findById(logisticsProviderId).orElse(null);
            if (provider != null) {
                po.setLogisticsProvider(provider);
                po.setLogisticsSupplierName(provider.getName());
            }
        } else {
            po.setLogisticsProvider(null);
            if (po.getSupplier() != null) {
                po.setLogisticsSupplierName(po.getSupplier().getName());
            }
        }
        
        po.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
        if (po.getStatus() == PurchaseOrder.Status.CONFIRMED || po.getStatus() == PurchaseOrder.Status.PENDING) {
            po.setStatus(PurchaseOrder.Status.SHIPPED);
        }
        po.setUpdatedAt(LocalDateTime.now());
        
        purchaseOrderRepository.saveAndFlush(po);
        
        // 创建商品结算单（当状态变更为已发货时）
        createPurchaseSettlementIfNeeded(po, oldMainStatus, "SHIPPED");
        
        inboundOrderRepository.findByPurchaseOrder(po).ifPresent(io -> {
            io.setShippedAt(po.getShippedAt());
            inboundOrderRepository.save(io);
        });
        
        try {
            PurchaseOrderLog log = new PurchaseOrderLog();
            log.setPurchaseOrderId(po.getId());
            log.setOperationType("FIRST_SHIP");
            log.setOldValue(oldStatus != null ? oldStatus.name() : "NULL");
            log.setNewValue(PurchaseOrder.ShippingStatus.SHIPPED.name());
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String operator = (auth != null && auth.isAuthenticated()) ? auth.getName() : "系统";
            log.setOperator(operator);
            
            // 构建包含配送类型、运单号和运费的完整备注信息
            StringBuilder remarkBuilder = new StringBuilder();
            remarkBuilder.append("首次发货");
            remarkBuilder.append("，配送类型: ").append(com.supplypro.utils.StatusTranslator.translateDeliveryMethod(deliveryMethod));
            remarkBuilder.append("，运单号: ").append(trackingNo != null ? trackingNo : "-");
            remarkBuilder.append("，运费: ").append(logisticsFee != null ? logisticsFee : "0");
            log.setRemark(remarkBuilder.toString());
            purchaseOrderLogRepository.save(log);
            
            logger.info("首次发货日志已记录: 采购单={}, 操作员={}", po.getOrderNo(), operator);
        } catch (Exception e) {
            logger.warn("保存发货日志失败: {}", e.getMessage());
        }
        
        try {
            snapshotService.captureSnapshot(po);
        } catch (Exception e) {
            logger.error("Failed to capture snapshot for PO {}", po.getOrderNo(), e);
        }

        // [FIX 2026-03-17] 创建待结算配送单（而非结算单）
        // 当物流费用 > 0 时，创建类型为LOGISTICS、状态为PENDING的待结算配送单
        // 结算单需手动从待结算配送单发起创建
        if (logisticsFee != null && logisticsFee.compareTo(java.math.BigDecimal.ZERO) > 0) {
            createPendingDeliverySettlement(po, logisticsFee, deliveryMethod, company);
        }

        logger.info("=== 首次发货操作完成 === 采购单: {}, 新状态: {}", po.getOrderNo(), po.getShippingStatus());
    }

    @Override
    @Transactional
    public void updateLogisticsInfo(Long id, String company, String trackingNo, java.time.LocalDateTime shippedAt, java.time.LocalDateTime expectedArrival, String deliverer, String delivererPhone, String plateNumber, java.math.BigDecimal logisticsFee, Long logisticsProviderId, String deliveryMethod) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithLock(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        PurchaseOrderShippingValidator.validateModifyLogistics(po);

        logger.info("=== 修改物流信息操作开始 === 采购单: {}, 当前状态: {}", po.getOrderNo(), po.getShippingStatus());

        // Fetch Existing Logistics Settlement Order (if any)
        List<SettlementOrder> settlements = settlementOrderRepository.findByRelatedOrderNoAndType(po.getOrderNo(), SettlementOrder.Type.LOGISTICS);
        SettlementOrder existingSettlement = null;
        if (settlements != null && !settlements.isEmpty()) {
            existingSettlement = settlements.get(0);
        }

        // Check Rule 4: If existing settlement is initiated, block update
        if (existingSettlement != null && existingSettlement.getStatus() != SettlementOrder.Status.PENDING) {
            throw new RuntimeException("运费已发起结算，不支持物流信息更新");
        }

        // Capture Old Values for Event
        java.math.BigDecimal oldFee = po.getLogisticsFee() != null ? po.getLogisticsFee() : java.math.BigDecimal.ZERO;
        String oldDeliveryMethod = po.getDeliveryMethod();

        // 1. Logistics History Association Check (New Logic)
        java.math.BigDecimal resolvedFee = logisticsFee != null ? logisticsFee : java.math.BigDecimal.ZERO;
        String resolvedCompany = company;
        String logisticsSupplierName = null;
        java.time.LocalDateTime resolvedShippedAt = shippedAt;
        java.time.LocalDateTime resolvedExpectedArrival = expectedArrival;
        String resolvedDeliverer = deliverer;
        String resolvedDelivererPhone = delivererPhone;
        String resolvedPlateNumber = plateNumber;
        Long resolvedProviderId = logisticsProviderId;
        String resolvedDeliveryMethod = deliveryMethod;

        if (trackingNo != null && !trackingNo.isEmpty()) {
            List<PurchaseOrder> duplicates = purchaseOrderRepository.findByTrackingNumber(trackingNo);
            if (duplicates != null && !duplicates.isEmpty()) {
                // Filter out current PO
                PurchaseOrder duplicate = duplicates.stream()
                    .filter(p -> !p.getId().equals(id))
                    .findFirst()
                    .orElse(null);
                
                if (duplicate != null) {
                    java.math.BigDecimal histFee = duplicate.getLogisticsFee() != null ? duplicate.getLogisticsFee() : java.math.BigDecimal.ZERO;
                    
                    if (histFee.compareTo(java.math.BigDecimal.ZERO) > 0) {
                        // Rule 1b: Historical Fee > 0 -> Force Copy & Zero Fee
                        resolvedFee = java.math.BigDecimal.ZERO;
                        
                        resolvedCompany = duplicate.getLogisticsCompany();
                        resolvedShippedAt = duplicate.getShippedAt();
                        resolvedExpectedArrival = duplicate.getExpectedArrival();
                        resolvedDeliverer = duplicate.getDeliverer();
                        resolvedDelivererPhone = duplicate.getDelivererPhone();
                        resolvedPlateNumber = duplicate.getPlateNumber();
                        resolvedDeliveryMethod = duplicate.getDeliveryMethod();
                        
                        if (duplicate.getLogisticsProvider() != null) {
                            resolvedProviderId = duplicate.getLogisticsProvider().getId();
                        } else {
                            resolvedProviderId = null;
                        }
                        
                        // We do NOT modify the duplicate PO's settlement or relation.
                        // We assume "Slave" mode for current PO.
                    } else {
                        // Rule 1c: Historical Fee == 0 -> Allow Edit, Check Input Fee
                        // Input fee is used (resolvedFee = logisticsFee)
                        // Info is used from input (resolvedCompany = company)
                        // If user input Fee > 0, we create new settlement (handled below in Settlement Logic)
                    }
                }
            }
        }
        
        // Resolve Provider Name
        if (resolvedProviderId != null) {
            com.supplypro.entity.LogisticsProvider provider = logisticsProviderRepository.findById(resolvedProviderId).orElse(null);
            if (provider != null) {
                po.setLogisticsProvider(provider);
                logisticsSupplierName = provider.getName();
            }
        } else {
            po.setLogisticsProvider(null);
            // For zero-fee or dropship cases, use supplier name as logistics supplier
            if (po.getSupplier() != null) {
                logisticsSupplierName = po.getSupplier().getName();
            }
        }

        po.setLogisticsCompany(resolvedCompany);
        po.setLogisticsSupplierName(logisticsSupplierName);
        po.setTrackingNumber(trackingNo);
        po.setDeliverer(resolvedDeliverer);
        po.setDelivererPhone(resolvedDelivererPhone);
        po.setPlateNumber(resolvedPlateNumber);
        po.setLogisticsFee(resolvedFee);
        po.setDeliveryMethod(resolvedDeliveryMethod);
        
        if (resolvedShippedAt != null) {
            po.setShippedAt(resolvedShippedAt);
        } else if (po.getShippedAt() == null) {
            po.setShippedAt(java.time.LocalDateTime.now());
        }
        
        if (resolvedExpectedArrival != null) {
            po.setExpectedArrival(resolvedExpectedArrival);
        }
        
        po.setUpdatedAt(LocalDateTime.now());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String operator = (auth != null && auth.isAuthenticated()) ? auth.getName() : "System";

        // 3.5 Status Reset (If RECEIVED -> SHIPPED)
        if (po.getShippingStatus() == PurchaseOrder.ShippingStatus.RECEIVED) {
            po.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
            po.setStatus(PurchaseOrder.Status.SHIPPED); // Sync main status
            
            PurchaseOrderLog statusLog = new PurchaseOrderLog();
            statusLog.setPurchaseOrderId(po.getId());
            statusLog.setOperationType("STATUS_CHANGE");
            statusLog.setOldValue(PurchaseOrder.ShippingStatus.RECEIVED.name());
            statusLog.setNewValue(PurchaseOrder.ShippingStatus.SHIPPED.name());
            statusLog.setOperator(operator);
            statusLog.setRemark("修改物流信息触发状态重置");
            purchaseOrderLogRepository.save(statusLog);
        }

        try {
            purchaseOrderRepository.saveAndFlush(po); // Flush to trigger optimistic lock check if any
        } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
            throw new RuntimeException("LOGISTICS_UPDATE_FAILED: Data has been modified by another user");
        }

        // 3.4 Settlement Order Handling
        // [FIX 2026-03-10] 业务规则说明：
        // - 待结算配送单（PS开头）：系统自动生成，记录待结算的运费信息
        // - 结算单（JS开头）：手动操作发起，完成结算流程
        // 当运费大于0时，自动创建或更新待结算配送单
        
        if (existingSettlement == null) {
            // 没有待结算配送单，创建新的
            if (resolvedFee.compareTo(java.math.BigDecimal.ZERO) > 0) {
                createPendingDeliverySettlement(po, resolvedFee, resolvedDeliveryMethod, resolvedCompany);
                logSettlementChange(po.getId(), "创建", "创建待结算配送单，金额：" + resolvedFee, operator);
            }
        } else {
            // 已有待结算配送单，更新金额
            if (resolvedFee.compareTo(java.math.BigDecimal.ZERO) > 0) {
                existingSettlement.setTotalAmount(resolvedFee);
                java.math.BigDecimal netAmount = resolvedFee.divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
                java.math.BigDecimal taxAmount = resolvedFee.subtract(netAmount);
                existingSettlement.setNetAmount(netAmount);
                existingSettlement.setTaxAmount(taxAmount);
                existingSettlement.setDeliveryMethod(resolvedDeliveryMethod);
                
                if (resolvedProviderId != null) {
                     com.supplypro.entity.LogisticsProvider provider = logisticsProviderRepository.findById(resolvedProviderId).orElse(null);
                     existingSettlement.setLogisticsProvider(provider);
                     existingSettlement.setSupplier(null);
                } else {
                     existingSettlement.setLogisticsProvider(null);
                     existingSettlement.setSupplier(po.getSupplier());
                }
                existingSettlement.setUpdatedAt(LocalDateTime.now());
                settlementOrderRepository.save(existingSettlement);
                
                logSettlementChange(po.getId(), "更新", "更新待结算配送单费用为：" + resolvedFee, operator);
            } else {
                // 运费变为0，删除待结算配送单
                settlementOrderRepository.delete(existingSettlement);
                logSettlementChange(po.getId(), "删除", "删除待结算配送单 " + existingSettlement.getSettlementNo() + " 因金额变为0", operator);
            }
        }

        // Sync Inbound Order Status
        inboundOrderRepository.findByPurchaseOrder(po).ifPresent(io -> {
             io.setLogisticsCompany(po.getLogisticsCompany());
             io.setTrackingNo(po.getTrackingNumber());
             io.setShippedAt(po.getShippedAt());
             if (po.getExpectedArrival() != null) {
                 io.setExpectedArrival(po.getExpectedArrival());
             }
             io.setDeliverer(po.getDeliverer());
             io.setDelivererPhone(po.getDelivererPhone());
             io.setPlateNumber(po.getPlateNumber());
             io.setLogisticsFee(po.getLogisticsFee());
             inboundOrderRepository.save(io);
        });

        // Add Logistics Track
        try {
            LogisticsTrack track = new LogisticsTrack();
            track.setBizType(LogisticsTrack.BizType.PURCHASE);
            track.setBizNo(po.getOrderNo());
            track.setLogisticsProvider(po.getLogisticsCompany());
            track.setTrackingNo(po.getTrackingNumber());
            track.setStatus("UPDATED");
            track.setDescription("物流信息更新");
            track.setEventTime(LocalDateTime.now());
            logisticsTrackRepository.save(track);
        } catch (Exception e) {
            logger.warn("Failed to save logistics track: {}", e.getMessage());
        }

        // Log Operation
        try {
            PurchaseOrderLog log = new PurchaseOrderLog();
            log.setPurchaseOrderId(po.getId());
            log.setOperationType("LOGISTICS_UPDATE");
            log.setNewValue(po.getLogisticsCompany() + " / " + po.getTrackingNumber());
            log.setOperator(operator);
            // 构建包含配送类型、运单号和运费的完整备注信息
            StringBuilder remarkBuilder = new StringBuilder();
            remarkBuilder.append("修改物流信息");
            remarkBuilder.append("，配送类型: ").append(com.supplypro.utils.StatusTranslator.translateDeliveryMethod(resolvedDeliveryMethod));
            remarkBuilder.append("，运单号: ").append(po.getTrackingNumber() != null ? po.getTrackingNumber() : "-");
            remarkBuilder.append("，运费: ").append(oldFee).append(" -> ").append(resolvedFee);
            log.setRemark(remarkBuilder.toString());
            purchaseOrderLogRepository.save(log);
        } catch (Exception e) {
            logger.warn("Failed to save log: {}", e.getMessage());
        }
        
        try {
            snapshotService.captureSnapshot(po);
        } catch (Exception e) {
            logger.error("Failed to capture snapshot for PO {}", po.getOrderNo(), e);
        }

        try {
            com.supplypro.event.PurchaseLogisticsUpdatedEvent event = new com.supplypro.event.PurchaseLogisticsUpdatedEvent(
                this, po, oldFee, resolvedFee, oldDeliveryMethod, resolvedDeliveryMethod
            );
            eventPublisher.publishEvent(event);
        } catch (Exception e) {
            logger.error("Failed to publish PurchaseLogisticsUpdatedEvent", e);
        }

        logger.info("Purchase Order {} logistics updated successfully", id);
    }
    
    private void logSettlementChange(Long poId, String action, String desc, String operator) {
        PurchaseOrderLog log = new PurchaseOrderLog();
        log.setPurchaseOrderId(poId);
        log.setOperationType("SETTLEMENT_CHANGE");
        log.setOperator(operator);
        log.setRemark("操作: " + action + ", " + desc);
        purchaseOrderLogRepository.save(log);
    }

    @Override
    public Map<String, Object> checkWaybill(String waybillNo, String deliveryType, String excludePurchaseNo) {
        Map<String, Object> result = new HashMap<>();
        result.put("hasDuplicate", false);

        if (waybillNo == null || waybillNo.isEmpty()) {
            return result;
        }

        // Systemic Fix: Ignore deliveryMethod for duplication check. 
        // A tracking number is unique across the whole system regardless of how it's delivered.
        List<PurchaseOrder> duplicates = purchaseOrderRepository.findByTrackingNumber(waybillNo);

        if (duplicates != null && !duplicates.isEmpty()) {
            // Filter out self (current PO)
            duplicates = duplicates.stream()
                .filter(p -> !p.getOrderNo().equals(excludePurchaseNo))
                .collect(Collectors.toList());
        }

        if (duplicates != null && !duplicates.isEmpty()) {
            PurchaseOrder duplicate = duplicates.get(0);
            
            // Check for fee duplication specifically
            if (duplicate.getLogisticsFee() != null && duplicate.getLogisticsFee().compareTo(java.math.BigDecimal.ZERO) > 0) {
                result.put("hasDuplicate", true);
                result.put("duplicatePurchaseNo", duplicate.getOrderNo());
                result.put("duplicateAmount", duplicate.getLogisticsFee());
            }
            
            // Always return driver info if available
            result.put("deliverer", duplicate.getDeliverer());
            result.put("contact", duplicate.getDelivererPhone());
            result.put("plateNo", duplicate.getPlateNumber());
            
            // Return Logistics Company if available (for Logistics delivery type)
            if (duplicate.getLogisticsCompany() != null && !duplicate.getLogisticsCompany().isEmpty()) {
                result.put("logisticsCompany", duplicate.getLogisticsCompany());
            }
            
            // Return Logistics Provider ID if available
            if (duplicate.getLogisticsProvider() != null) {
                result.put("logisticsProviderId", duplicate.getLogisticsProvider().getId());
            } else {
                result.put("logisticsProviderId", "DROPSHIP");
            }
        }

        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> batchAdjustCost(List<Map<String, Object>> adjustments) {
        Map<String, Object> result = new HashMap<>();
        int success = 0;
        int fail = 0;
        List<Map<String, Object>> errors = new ArrayList<>();

        String operator = "System";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            operator = auth.getName();
        }

        // 按供应商分组
        Map<Long, List<Map<String, Object>>> supplierGroups = new HashMap<>();
        Map<Long, String> supplierNames = new HashMap<>();
        Map<Long, PurchaseOrder> poMap = new HashMap<>();

        for (Map<String, Object> item : adjustments) {
            String poNo = (String) item.get("poNo");
            Object newCostObj = item.get("newCost");

            if (poNo == null || newCostObj == null) {
                fail++;
                Map<String, Object> err = new HashMap<>();
                err.put("poNo", poNo != null ? poNo : "UNKNOWN");
                err.put("msg", "缺少必填字段");
                errors.add(err);
                continue;
            }

            try {
                BigDecimal newCost = new BigDecimal(newCostObj.toString());
                PurchaseOrder po = purchaseOrderRepository.findByOrderNo(poNo);
                if (po == null) {
                    fail++;
                    Map<String, Object> err = new HashMap<>();
                    err.put("poNo", poNo);
                    err.put("msg", "采购单不存在");
                    errors.add(err);
                    continue;
                }

                Long supplierId = po.getSupplierId();
                supplierGroups.computeIfAbsent(supplierId, k -> new ArrayList<>()).add(item);
                supplierNames.put(supplierId, po.getSupplierName());
                poMap.put(po.getId(), po);

            } catch (Exception e) {
                fail++;
                Map<String, Object> err = new HashMap<>();
                err.put("poNo", poNo);
                err.put("msg", e.getMessage());
                errors.add(err);
                logger.error("调价处理失败: {}", poNo, e);
            }
        }

        // 按供应商创建调价单
        for (Map.Entry<Long, List<Map<String, Object>>> entry : supplierGroups.entrySet()) {
            Long supplierId = entry.getKey();
            List<Map<String, Object>> items = entry.getValue();
            String supplierName = supplierNames.get(supplierId);

            try {
                String sheetNo = "TJ" + java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd").format(java.time.LocalDate.now()) 
                    + String.format("%04d", (int)(Math.random() * 10000));

                CostAdjustmentSheet sheet = new CostAdjustmentSheet();
                sheet.setSheetNo(sheetNo);
                sheet.setSupplierId(supplierId);
                sheet.setSupplierName(supplierName);
                sheet.setStatus(CostAdjustmentSheet.Status.APPROVED);
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
                    PurchaseOrderItem poItem = po.getItems().get(0);
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

                    // 更新采购单成本
                    poItem.setUnitPrice(newCost);
                    poItem.setTotalPrice(newCost.multiply(new BigDecimal(quantity)));
                    
                    BigDecimal total = BigDecimal.ZERO;
                    for (PurchaseOrderItem pi : po.getItems()) {
                        total = total.add(pi.getTotalPrice());
                    }
                    po.setTotalAmount(total);
                    po.setAdjustStatus("Approved");
                    purchaseOrderRepository.save(po);

                    // 创建调价明细
                    CostAdjustmentItem adjustItem = new CostAdjustmentItem();
                    adjustItem.setSheetId(sheet.getId());
                    adjustItem.setPurchaseOrderId(po.getId());
                    adjustItem.setPoNo(po.getOrderNo());
                    adjustItem.setProductId(poItem.getProductId());
                    adjustItem.setProductName(poItem.getProductName());
                    adjustItem.setSkuCode(skuCode != null ? skuCode : poItem.getSkuCode());
                    adjustItem.setSkuId(skuId);
                    adjustItem.setSpecName(poItem.getSpec());
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

                    // 快照
                    try {
                        snapshotService.captureSnapshot(po);
                    } catch (Exception e) {
                        logger.error("快照保存失败: {}", po.getOrderNo(), e);
                    }
                }

                sheet.setItemCount(itemCount);
                sheet.setTotalQuantity(totalQuantity);
                sheet.setTotalOldCost(totalOldCost);
                sheet.setTotalNewCost(totalNewCost);
                sheet.setTotalDiff(totalDiff);
                costAdjustmentSheetRepository.save(sheet);

            } catch (Exception e) {
                fail += items.size();
                for (Map<String, Object> item : items) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("poNo", item.get("poNo"));
                    err.put("msg", "创建调价单失败: " + e.getMessage());
                    errors.add(err);
                }
                logger.error("按供应商创建调价单失败: supplierId={}", supplierId, e);
            }
        }

        result.put("success", success);
        result.put("fail", fail);
        result.put("errors", errors);
        return result;
    }

    @Override
    @Async
    public void autoReceivePurchaseOrder(Long purchaseOrderId) {
        int maxRetries = 3;
        int attempt = 0;
        Exception lastException = null;

        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        while (attempt < maxRetries) {
            try {
                attempt++;
                transactionTemplate.execute(status -> {
                    doAutoReceivePurchaseOrder(purchaseOrderId);
                    return null;
                });
                return; // Success
            } catch (Exception e) {
                lastException = e;
                logger.warn("Auto-receive attempt {}/{} failed for PO {}: {}", attempt, maxRetries, purchaseOrderId, e.getMessage());
                try {
                    Thread.sleep(1000); // Wait 1s before retry
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
        
        logger.error("Failed to auto-receive PO {} after {} attempts", purchaseOrderId, maxRetries, lastException);
    }

    private void doAutoReceivePurchaseOrder(Long purchaseOrderId) {
        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId).orElse(null);
        if (po == null) {
            logger.warn("Auto-receive failed: PurchaseOrder not found for ID: {}", purchaseOrderId);
            return;
        }

        // Check if already received to avoid duplicate processing
        if (po.getShippingStatus() == PurchaseOrder.ShippingStatus.RECEIVED && po.getStatus() == PurchaseOrder.Status.RECEIVED) {
            return;
        }

        boolean statusChanged = false;
        String oldShippingStatus = po.getShippingStatus() != null ? po.getShippingStatus().name() : "NULL";

        // Update Shipping Status
        // Only if currently PENDING, TO_SHIP, or SHIPPED (not already RECEIVED)
        if (po.getShippingStatus() != PurchaseOrder.ShippingStatus.RECEIVED) {
            po.setShippingStatus(PurchaseOrder.ShippingStatus.RECEIVED);
            statusChanged = true;
        }

        // Update Main Status if applicable
        // Only allow if not already RECEIVED or CANCELLED or PENDING_SETTLEMENT
        String oldStatus = po.getStatus() != null ? po.getStatus().name() : "NULL";
        
        if (po.getStatus() != PurchaseOrder.Status.RECEIVED && 
            po.getStatus() != PurchaseOrder.Status.CANCELLED &&
            po.getStatus() != PurchaseOrder.Status.PENDING_SETTLEMENT) {
            
            po.setStatus(PurchaseOrder.Status.RECEIVED);
            po.setReceiveTime(LocalDateTime.now());
            po.setReceiveType(PurchaseOrder.ReceiveType.AUTO);
            statusChanged = true;

            // Publish Event
            eventPublisher.publishEvent(new PurchaseReceivedEvent(this, po));

            // Log Operation
            try {
                PurchaseOrderLog log = new PurchaseOrderLog();
                log.setPurchaseOrderId(po.getId());
                log.setOperator("系统自动");
                log.setOperationType("AUTO_RECEIVE");
                log.setOldValue(oldStatus);
                log.setNewValue(PurchaseOrder.Status.RECEIVED.name());
                log.setRemark("根据快递鸟状态自动签收");
                log.setCreatedAt(LocalDateTime.now());
                purchaseOrderLogRepository.save(log);
            } catch (Exception e) {
                logger.error("记录自动收货操作失败，采购单ID: {}", purchaseOrderId, e);
            }
            
            if (po.getCreatedBy() != null) {
                try {
                    notificationService.sendNotification(po.getCreatedBy(), "采购单 " + po.getOrderNo() + " 已自动签收。");
                } catch (Exception e) {
                    logger.warn("发送采购单 {} 通知失败", po.getOrderNo());
                }
            }
        }

        if (statusChanged) {
            po.setUpdatedAt(LocalDateTime.now());
            purchaseOrderRepository.save(po);

            // 入库单状态与采购单发货状态独立，不应在此处同步
            // 入库单状态仅在用户点击"确认入库"按钮时才变更为RECEIVED
            
            // Capture Snapshot
            try {
                snapshotService.captureSnapshot(po);
            } catch (Exception e) {
                logger.error("Failed to capture snapshot for PO {}", po.getOrderNo(), e);
            }
        }
    }

    @Override
    @Transactional
    public void receivePurchaseOrder(Long id, String operator) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found: " + id));

        // Validation: PENDING, CONFIRMED, SHIPPED
        if (po.getStatus() != PurchaseOrder.Status.PENDING && 
            po.getStatus() != PurchaseOrder.Status.CONFIRMED && 
            po.getStatus() != PurchaseOrder.Status.SHIPPED) {
            throw new RuntimeException("Current status does not allow receiving. Status: " + po.getStatus());
        }

        PurchaseOrder.Status oldStatus = po.getStatus();
        
        // 创建商品结算单（当状态变更为已收货时）
        createPurchaseSettlementIfNeeded(po, oldStatus, "RECEIVED");
        
        // 1. Update PO Status
        po.setStatus(PurchaseOrder.Status.RECEIVED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.RECEIVED); // Requirement 1
        po.setReceiveTime(LocalDateTime.now());
        po.setReceiveType(PurchaseOrder.ReceiveType.MANUAL);
        
        // Resolve User ID
        try {
            User user = userRepository.findByUsername(operator).orElse(null);
            if (user != null) {
                po.setReceiveUserId(user.getId());
            }
        } catch (Exception e) {
            logger.warn("Failed to resolve user ID for operator: {}", operator);
        }
        
        po.setUpdatedAt(LocalDateTime.now());
        purchaseOrderRepository.save(po);

        // 2. Sync Update Settlement Orders (Requirement 2)
        try {
            List<SettlementOrder> settlements = settlementOrderRepository.findByRelatedOrderNo(po.getOrderNo());
            if (settlements != null) {
                List<SettlementOrder> targets = settlements.stream()
                    .filter(s -> s.getType() == SettlementOrder.Type.LOGISTICS) // Logistics Fee related
                    .filter(s -> s.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) > 0) // Fee > 0
                    .filter(s -> s.getStatus() == SettlementOrder.Status.PENDING || s.getStatus() == SettlementOrder.Status.SETTLED) // Pending or Settled
                    .collect(Collectors.toList());
                
                for (SettlementOrder s : targets) {
                    s.setShippingStatus("RECEIVED");
                    s.setUpdatedAt(LocalDateTime.now());
                    settlementOrderRepository.save(s);
                    logger.info("Synchronously updated SettlementOrder {} shipping status to RECEIVED", s.getSettlementNo());
                }
            }
        } catch (Exception e) {
            logger.error("Failed to sync settlement order status for PO {}", po.getOrderNo(), e);
            throw new RuntimeException("Failed to sync settlement status: " + e.getMessage()); // Ensure atomicity
        }

        // Update Snapshot to ensure List View is up-to-date
        try {
            snapshotService.captureSnapshot(po);
        } catch (Exception e) {
            logger.error("Failed to create snapshot for PO {} during receive", po.getId(), e);
            throw new RuntimeException("Failed to create snapshot: " + e.getMessage());
        }

        // Publish Event
        eventPublisher.publishEvent(new PurchaseReceivedEvent(this, po));

        // Log operation
        PurchaseOrderLog log = new PurchaseOrderLog();
        log.setPurchaseOrderId(po.getId());
        log.setOperator(operator);
        log.setOperationType("RECEIVE");
        log.setOldValue(oldStatus.name());
        log.setNewValue(PurchaseOrder.Status.RECEIVED.name());
        log.setRemark("确认收货 (关联配送单状态已同步)");
        log.setCreatedAt(LocalDateTime.now());
        purchaseOrderLogRepository.save(log);
        
        // 入库单状态与采购单发货状态独立，不应在此处同步
        // 入库单状态仅在用户点击"确认入库"按钮时才变更为RECEIVED
    }

    private void createPendingDeliverySettlement(PurchaseOrder po, java.math.BigDecimal logisticsFee, String deliveryMethod, String company) {
        String trackingNumber = po.getTrackingNumber();
        
        if (trackingNumber != null && !trackingNumber.isEmpty()) {
            List<SettlementOrder> existingSettlements = settlementOrderRepository.findAll().stream()
                .filter(s -> s.getTrackingNo() != null && s.getTrackingNo().equals(trackingNumber))
                .collect(java.util.stream.Collectors.toList());
            
            if (!existingSettlements.isEmpty()) {
                SettlementOrder existingSettlement = existingSettlements.get(0);
                String existingOrderNos = existingSettlement.getRelatedOrderNo();
                if (existingOrderNos == null || !existingOrderNos.contains(po.getOrderNo())) {
                    String newOrderNos = existingOrderNos != null ? existingOrderNos + "," + po.getOrderNo() : po.getOrderNo();
                    existingSettlement.setRelatedOrderNo(newOrderNos);
                    existingSettlement.setTotalAmount(existingSettlement.getTotalAmount().add(logisticsFee));
                    java.math.BigDecimal newNetAmount = existingSettlement.getTotalAmount().divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
                    existingSettlement.setNetAmount(newNetAmount);
                    existingSettlement.setTaxAmount(existingSettlement.getTotalAmount().subtract(newNetAmount));
                    settlementOrderRepository.save(existingSettlement);
                    logger.info("Merged PO {} into existing Delivery Settlement {} with tracking {}", 
                        po.getOrderNo(), existingSettlement.getDeliveryNo(), trackingNumber);
                    return;
                }
            }
        }
        
        SettlementOrder settlement = new SettlementOrder();
        
        // 核心修复点：优先使用明确选择的物流供应商，否则（一件代发/未选择）使用商品供应商
        if (po.getLogisticsProvider() != null) {
            settlement.setLogisticsProvider(po.getLogisticsProvider());
        } else if (po.getSupplier() != null) {
            settlement.setSupplier(po.getSupplier());
        }
        
        if ("SelfDelivery".equals(deliveryMethod)) {
            settlement.setSourceType("自配送");
        } else {
            settlement.setSourceType("物流配送");
        }
        
        settlement.setType(SettlementOrder.Type.LOGISTICS);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setTotalAmount(logisticsFee);
        
        java.math.BigDecimal netAmount = logisticsFee.divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
        java.math.BigDecimal taxAmount = logisticsFee.subtract(netAmount);
        settlement.setNetAmount(netAmount);
        settlement.setTaxAmount(taxAmount);
        
        settlement.setRelatedOrderNo(po.getOrderNo());
        settlement.setDeliveryMethod(deliveryMethod);
        settlement.setLogisticsCompany(company);
        settlement.setTrackingNo(trackingNumber);
        
        String deliveryNo = "PS" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + 
                           String.format("%03d", new java.util.Random().nextInt(1000));
        settlement.setDeliveryNo(deliveryNo);
        settlement.setSettlementNo(null);
        
        settlement.setCreatedAt(java.time.LocalDateTime.now());
        
        String operator = "SYSTEM";
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                operator = auth.getName();
            }
        } catch (Exception e) {
        }
        settlement.setCreatedBy(operator);
        
        settlementOrderRepository.save(settlement);
        logger.info("Created Pending Delivery Settlement {} for PO {} with fee {}, delivery method: {}", 
            deliveryNo, po.getOrderNo(), logisticsFee, deliveryMethod);
    }

    /**
     * 当采购单状态变更为待发货、已发货或已收货时，自动创建商品结算单
     * @param po 采购单
     * @param oldStatus 变更前的状态
     * @param newStatus 变更后的状态
     */
    private void createPurchaseSettlementIfNeeded(PurchaseOrder po, PurchaseOrder.Status oldStatus, String newStatus) {
        // 只有当状态从待处理变更为待发货、已发货或已收货时才创建商品结算单
        if (oldStatus != PurchaseOrder.Status.PENDING) {
            logger.debug("采购单 {} 状态从 {} 变更为 {}，不需要创建商品结算单", 
                po.getOrderNo(), oldStatus, newStatus);
            return;
        }
        
        // 检查是否已存在该采购单的商品结算单
        List<SettlementOrder> existingSettlements = settlementOrderRepository.findByRelatedOrderNoAndType(
            po.getOrderNo(), SettlementOrder.Type.PURCHASE);
        if (existingSettlements != null && !existingSettlements.isEmpty()) {
            logger.debug("采购单 {} 已存在商品结算单，跳过创建", po.getOrderNo());
            return;
        }
        
        // 只有当采购单有应付金额时才创建结算单
        java.math.BigDecimal payableAmount = po.getPayableAmount();
        if (payableAmount == null || payableAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            logger.debug("采购单 {} 应付金额为空或为零，跳过创建商品结算单", po.getOrderNo());
            return;
        }
        
        // 创建商品结算单
        SettlementOrder settlement = new SettlementOrder();
        settlement.setType(SettlementOrder.Type.PURCHASE);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setRelatedOrderNo(po.getOrderNo());
        settlement.setTotalAmount(payableAmount);
        settlement.setSupplier(po.getSupplier());
        settlement.setSourceType("采购单");
        
        // 计算净额和税额（假设税率为6%）
        java.math.BigDecimal netAmount = payableAmount.divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
        java.math.BigDecimal taxAmount = payableAmount.subtract(netAmount);
        settlement.setNetAmount(netAmount);
        settlement.setTaxAmount(taxAmount);
        
        // 生成配送单号
        String deliveryNo = "GS" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + 
                           String.format("%03d", new java.util.Random().nextInt(1000));
        settlement.setDeliveryNo(deliveryNo);
        
        // 设置结算周期
        if (po.getSupplier() != null && po.getSupplier().getSettlementPeriod() != null) {
            settlement.setSettlementPeriod(po.getSupplier().getSettlementPeriod());
        }
        
        settlement.setCreatedAt(java.time.LocalDateTime.now());
        
        // 获取操作员
        String operator = "SYSTEM";
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                operator = auth.getName();
            }
        } catch (Exception e) {
            // ignore
        }
        settlement.setCreatedBy(operator);
        
        settlementOrderRepository.save(settlement);
        
        // 更新采购单的结算状态
        po.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
        purchaseOrderRepository.save(po);
        
        // 记录审计日志
        try {
            PurchaseOrderLog log = new PurchaseOrderLog();
            log.setPurchaseOrderId(po.getId());
            log.setOperationType("CREATE_SETTLEMENT");
            log.setOldValue(oldStatus.name());
            log.setNewValue(newStatus);
            log.setOperator(operator);
            log.setRemark("状态变更为" + newStatus + "，自动创建商品结算单：" + deliveryNo);
            purchaseOrderLogRepository.save(log);
            
            logger.info("采购单 {} 状态变更为 {}，自动创建商品结算单 {}，金额 {}", 
                po.getOrderNo(), newStatus, deliveryNo, payableAmount);
        } catch (Exception e) {
            logger.warn("保存商品结算单审计日志失败: {}", e.getMessage());
        }
    }
}
