package com.supplypro.controller;

import com.supplypro.entity.*;
import com.supplypro.dto.InboundOrderUpdateRequest;
import com.supplypro.repository.*;
import com.supplypro.service.RegionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import com.supplypro.service.BatchNoGeneratorService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/inbound-orders")
@CrossOrigin(origins = "*")
public class InboundOrderController {

    private static final Logger logger = LoggerFactory.getLogger(InboundOrderController.class);

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private StockFlowRepository stockFlowRepository;
    
    @Autowired
    private CostAdjustmentItemRepository costAdjustmentItemRepository;
    
    @Autowired
    private CostAdjustmentSheetRepository costAdjustmentSheetRepository;
    
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private LogisticsTrackRepository logisticsTrackRepository;

    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Autowired
    private RegionService regionService;

    @Autowired
    private javax.persistence.EntityManager entityManager;

    @Autowired
    private BatchNoGeneratorService batchNoGeneratorService;

    @GetMapping("/status-summary")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getStatusSummary(
            @RequestParam(required = false) String inboundNo,
            @RequestParam(required = false) String poNo,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String shippingStatus,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd") java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd") java.time.LocalDate endDate
    ) {
        javax.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        javax.persistence.criteria.CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        javax.persistence.criteria.Root<InboundOrder> root = query.from(InboundOrder.class);
        
        List<javax.persistence.criteria.Predicate> predicates = new ArrayList<>();
        
        // Filter by inboundNo
        if (inboundNo != null && !inboundNo.isEmpty()) {
            predicates.add(cb.like(root.get("inboundNo"), "%" + inboundNo + "%"));
        }
        
        // Filter by warehouseId
        if (warehouseId != null) {
            predicates.add(cb.equal(root.get("warehouse").get("id"), warehouseId));
        }
        
        // Filter by poNo
        if (poNo != null && !poNo.isEmpty()) {
            predicates.add(cb.like(root.get("purchaseOrder").get("orderNo"), "%" + poNo + "%"));
        }
        
        // Filter by supplierId
        if (supplierId != null) {
            predicates.add(cb.equal(root.get("purchaseOrder").get("supplier").get("id"), supplierId));
        }
        
        // Filter by shippingStatus
        if (shippingStatus != null && !shippingStatus.isEmpty()) {
            try {
                PurchaseOrder.ShippingStatus shippingStatusEnum = PurchaseOrder.ShippingStatus.valueOf(shippingStatus);
                predicates.add(cb.equal(root.get("purchaseOrder").get("shippingStatus"), shippingStatusEnum));
            } catch (IllegalArgumentException e) {
                // Invalid status, ignore
            }
        }
        
        // Filter by product
        if (product != null && !product.isEmpty()) {
            javax.persistence.criteria.Subquery<Long> subquery = query.subquery(Long.class);
            javax.persistence.criteria.Root<InboundOrderItem> itemRoot = subquery.from(InboundOrderItem.class);
            subquery.select(itemRoot.get("inboundOrder").get("id"));
            javax.persistence.criteria.Predicate productPredicate = cb.or(
                cb.like(itemRoot.get("product").get("name"), "%" + product + "%"),
                cb.like(itemRoot.get("product").get("skuCode"), "%" + product + "%"),
                cb.like(itemRoot.get("product").get("barcode"), "%" + product + "%")
            );
            subquery.where(cb.and(
                cb.equal(itemRoot.get("inboundOrder"), root),
                productPredicate
            ));
            predicates.add(cb.exists(subquery));
        }
        
        // Filter by inbound date range
        if (startDate != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("inboundDate"), startDate.atStartOfDay()));
        }
        if (endDate != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("inboundDate"), endDate.atTime(23, 59, 59)));
        }

        // Group by status
        query.multiselect(root.get("status"), cb.count(root));
        query.where(predicates.toArray(new javax.persistence.criteria.Predicate[0]));
        query.groupBy(root.get("status"));
        
        List<Object[]> statusCounts = entityManager.createQuery(query).getResultList();
        
        // Build status map
        Map<String, Long> statusMap = new HashMap<>();
        long total = 0;
        
        for (Object[] row : statusCounts) {
            InboundOrder.Status status = (InboundOrder.Status) row[0];
            Long count = ((Number) row[1]).longValue();
            statusMap.put(status.name(), count);
            total += count;
        }
        
        // Status labels mapping
        Map<String, String> statusLabels = new java.util.LinkedHashMap<>();
        statusLabels.put("PENDING", "待入库");
        statusLabels.put("RECEIVED", "已入库");
        statusLabels.put("CANCELLED", "已取消");
        
        // Status colors mapping
        Map<String, String> statusColors = new java.util.HashMap<>();
        statusColors.put("PENDING", "#1890ff");
        statusColors.put("RECEIVED", "#52c41a");
        statusColors.put("CANCELLED", "#999999");
        
        // Build status list
        List<Map<String, Object>> statusList = new ArrayList<>();
        
        // Iterate through predefined order
        for (String statusKey : statusLabels.keySet()) {
            Map<String, Object> statusItem = new HashMap<>();
            statusItem.put("status", statusKey);
            statusItem.put("label", statusLabels.get(statusKey));
            statusItem.put("count", statusMap.getOrDefault(statusKey, 0L));
            statusItem.put("color", statusColors.get(statusKey));
            statusList.add(statusItem);
        }
        
        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "total", total,
            "statusList", statusList
        ));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String inboundNo,
            @RequestParam(required = false) String poNo,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String product,
            @RequestParam(required = false) String shippingStatus,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd") java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd") java.time.LocalDate endDate) {
        
        PageRequest pageable = PageRequest.of(page - 1, size, Sort.by("id").descending());
        
        // Build specification for filtering
        org.springframework.data.jpa.domain.Specification<InboundOrder> spec = (root, query, cb) -> {
            List<javax.persistence.criteria.Predicate> predicates = new ArrayList<>();
            
            // Filter by inboundNo (exact match or like)
            if (inboundNo != null && !inboundNo.isEmpty()) {
                predicates.add(cb.like(root.get("inboundNo"), "%" + inboundNo + "%"));
            }
            
            // Filter by warehouseId
            if (warehouseId != null) {
                predicates.add(cb.equal(root.get("warehouse").get("id"), warehouseId));
            }
            
            // Filter by status - handle legacy statuses
            if (status != null && !status.isEmpty()) {
                // Map new statuses to include legacy statuses
                if ("RECEIVED".equals(status)) {
                    // RECEIVED includes legacy SHIPPED and COMPLETED
                    // Use native SQL comparison for ENUM column
                    javax.persistence.criteria.Predicate receivedPredicate = cb.or(
                        cb.equal(root.get("status"), InboundOrder.Status.RECEIVED),
                        cb.equal(root.get("status").as(String.class), "SHIPPED"),
                        cb.equal(root.get("status").as(String.class), "COMPLETED")
                    );
                    predicates.add(receivedPredicate);
                } else if ("PENDING".equals(status)) {
                    predicates.add(cb.equal(root.get("status"), InboundOrder.Status.PENDING));
                } else if ("CANCELLED".equals(status)) {
                    predicates.add(cb.equal(root.get("status"), InboundOrder.Status.CANCELLED));
                }
            }
            
            // Filter by poNo (need to join with purchaseOrder)
            if (poNo != null && !poNo.isEmpty()) {
                predicates.add(cb.like(root.get("purchaseOrder").get("orderNo"), "%" + poNo + "%"));
            }
            
            // Filter by supplierId (need to join with purchaseOrder.supplier)
            if (supplierId != null) {
                predicates.add(cb.equal(root.get("purchaseOrder").get("supplier").get("id"), supplierId));
            }
            
            // Filter by shippingStatus (need to join with purchaseOrder)
            if (shippingStatus != null && !shippingStatus.isEmpty()) {
                try {
                    PurchaseOrder.ShippingStatus shippingStatusEnum = PurchaseOrder.ShippingStatus.valueOf(shippingStatus);
                    predicates.add(cb.equal(root.get("purchaseOrder").get("shippingStatus"), shippingStatusEnum));
                } catch (IllegalArgumentException e) {
                    // Invalid status, ignore
                }
            }
            
            // Filter by product (need to join with items.product)
            if (product != null && !product.isEmpty()) {
                // Subquery to find inbound orders with matching product
                javax.persistence.criteria.Subquery<Long> subquery = query.subquery(Long.class);
                javax.persistence.criteria.Root<InboundOrderItem> itemRoot = subquery.from(InboundOrderItem.class);
                subquery.select(itemRoot.get("inboundOrder").get("id"));
                
                javax.persistence.criteria.Predicate productPredicate = cb.or(
                    cb.like(itemRoot.get("product").get("name"), "%" + product + "%"),
                    cb.like(itemRoot.get("product").get("skuCode"), "%" + product + "%"),
                    cb.like(itemRoot.get("product").get("barcode"), "%" + product + "%")
                );
                subquery.where(cb.and(
                    cb.equal(itemRoot.get("inboundOrder"), root),
                    productPredicate
                ));
                
                predicates.add(cb.exists(subquery));
            }
            
            // Filter by inbound date range
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("inboundDate"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("inboundDate"), endDate.atTime(23, 59, 59)));
            }
            
            return cb.and(predicates.toArray(new javax.persistence.criteria.Predicate[0]));
        };
        
        Page<InboundOrder> pageResult = inboundOrderRepository.findAll(spec, pageable);
        
        List<Map<String, Object>> records = new ArrayList<>();
        for (InboundOrder order : pageResult.getContent()) {
            Map<String, Object> data = new HashMap<>();
            data.put("id", String.valueOf(order.getId()));
            data.put("inboundNo", order.getInboundNo());
            
            // Normalize status - map legacy statuses to new ones
            String orderStatus = order.getStatus() != null ? order.getStatus().name() : "PENDING";
            if ("SHIPPED".equals(orderStatus) || "COMPLETED".equals(orderStatus)) {
                orderStatus = "RECEIVED";
            }
            data.put("status", orderStatus);
            
            data.put("inboundDate", order.getInboundDate() != null ? order.getInboundDate().toString() : null);
            data.put("createdAt", order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
            
            if (order.getWarehouse() != null) {
                data.put("warehouseName", order.getWarehouse().getName());
                data.put("warehouseCode", order.getWarehouse().getCode()); // Added for frontend mapping
            }
            if (order.getPurchaseOrder() != null) {
                data.put("purchaseOrderNo", order.getPurchaseOrder().getOrderNo());
                data.put("purchaseOrderId", String.valueOf(order.getPurchaseOrder().getId()));
                // Fixed: Ensure shippingStatus is not null before converting to string
                if (order.getPurchaseOrder().getShippingStatus() != null) {
                    data.put("shippingStatus", order.getPurchaseOrder().getShippingStatus().name());
                } else {
                    data.put("shippingStatus", "PENDING"); // Default value
                }
                if (order.getPurchaseOrder().getSupplier() != null) {
                    data.put("supplierName", order.getPurchaseOrder().getSupplier().getName());
                }
            } else {
                data.put("shippingStatus", "PENDING");
            }

            // Items Summary & Totals
            List<Map<String, Object>> itemsList = new ArrayList<>();
            int totalQuantity = 0;
            BigDecimal totalAmount = BigDecimal.ZERO;
            
            if (order.getItems() != null) {
                for (InboundOrderItem item : order.getItems()) {
                    Map<String, Object> itemMap = new HashMap<>();
                    if (item.getProduct() != null) {
                        itemMap.put("productName", item.getProduct().getName());
                    } else {
                        itemMap.put("productName", "Unknown Product");
                    }
                    itemMap.put("specName", item.getSpec());
                    itemMap.put("quantity", item.getQuantity());
                    itemMap.put("unitCost", item.getUnitCost());
                    itemsList.add(itemMap);
                    
                    if (item.getQuantity() != null) totalQuantity += item.getQuantity();
                    if (item.getTotalCost() != null) totalAmount = totalAmount.add(item.getTotalCost());
                }
            }
            data.put("items", itemsList);
            data.put("totalQuantity", totalQuantity);
            data.put("totalAmount", totalAmount);

            records.add(data);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("records", records);
        data.put("total", pageResult.getTotalElements());
        data.put("current", pageResult.getNumber() + 1);
        data.put("size", pageResult.getSize());
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", data);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        return inboundOrderRepository.findById(id)
                .map(order -> {
                    Map<String, Object> data = new HashMap<>();
                    // Main Info
                    data.put("id", String.valueOf(order.getId()));
                    data.put("inboundNo", order.getInboundNo());
                    data.put("status", order.getStatus());
                    data.put("inboundDate", order.getInboundDate());
                    data.put("createdAt", order.getCreatedAt());
                    data.put("confirmedBy", order.getConfirmedBy());
                    
                    // Warehouse
                    if (order.getWarehouse() != null) {
                        Map<String, Object> whMap = new HashMap<>();
                        whMap.put("id", order.getWarehouse().getId());
                        whMap.put("name", order.getWarehouse().getName());
                        whMap.put("address", order.getWarehouse().getAddress());
                        
                        String contact = "";
                        if (order.getWarehouse().getManagers() != null && !order.getWarehouse().getManagers().isEmpty()) {
                            contact = order.getWarehouse().getManagers().stream()
                                .map(u -> u.getFullName() != null ? u.getFullName() : u.getUsername())
                                .findFirst().orElse("");
                        }
                        whMap.put("contact", contact);
                        data.put("warehouse", whMap);
                    }
                    
                    // Operation Logs
                    List<Map<String, Object>> logs = new ArrayList<>();
                    if (order.getCreatedAt() != null) {
                        Map<String, Object> log = new HashMap<>();
                        log.put("type", "创建入库单");
                        log.put("time", order.getCreatedAt());
                        log.put("operator", order.getPurchaseOrder() != null ? order.getPurchaseOrder().getCreatedBy() : "系统");
                        logs.add(log);
                    }
                    if (order.getStatus() == InboundOrder.Status.RECEIVED) {
                         if (order.getInboundDate() != null) {
                            Map<String, Object> log = new HashMap<>();
                            log.put("type", "确认入库");
                            log.put("time", order.getInboundDate());
                            log.put("operator", order.getConfirmedBy());
                            logs.add(log);
                        }
                    }
                    
                    // Note: Removed the logic that merges Purchase Order logs into Inbound Order logs.
                    // Now it strictly only shows logs related to the Inbound Order itself.
                    // Sort logs by time desc
                    logs.sort((a, b) -> ((LocalDateTime)b.get("time")).compareTo((LocalDateTime)a.get("time")));
                    data.put("operationLogs", logs);
                    
                    // Purchase Order & Supplier & Logistics
                    if (order.getPurchaseOrder() != null) {
                        PurchaseOrder po = order.getPurchaseOrder();
                        Map<String, Object> poMap = new HashMap<>();
                        poMap.put("id", po.getId());
                        poMap.put("orderNo", po.getOrderNo());
                        poMap.put("orderDate", po.getCreatedAt());
                        poMap.put("buyerName", po.getCreatedBy());
                        poMap.put("shippingStatus", po.getShippingStatus());
                        data.put("purchaseOrder", poMap);
                        
                        if (po.getSupplier() != null) {
                             data.put("supplierName", po.getSupplier().getName());
                             data.put("supplierContact", po.getSupplier().getContactPerson());
                        }

                        // Delivery Info (Address & Contact)
                        Map<String, Object> deliveryInfo = new HashMap<>();
                        // Prioritize Inbound Order fields, fall back to PO
                        deliveryInfo.put("contactName", order.getContactName() != null ? order.getContactName() : po.getContactName());
                        deliveryInfo.put("contactPhone", order.getContactPhone() != null ? order.getContactPhone() : po.getContactPhone());
                        deliveryInfo.put("contactEmail", order.getContactEmail());
                        
                        // Address Components
                        String provinceCode = order.getProvince() != null ? order.getProvince() : po.getProvince();
                        String cityCode = order.getCity() != null ? order.getCity() : po.getCity();
                        String districtCode = order.getDistrict() != null ? order.getDistrict() : po.getDistrict();
                        String detailAddress = order.getDetailAddress() != null ? order.getDetailAddress() : po.getDetailAddress();
                        
                        // Convert codes to names
                        String provinceName = regionService.getNameByCode(provinceCode);
                        String cityName = regionService.getNameByCode(cityCode);
                        String districtName = regionService.getNameByCode(districtCode);

                        deliveryInfo.put("province", provinceName);
                        deliveryInfo.put("city", cityName);
                        deliveryInfo.put("district", districtName);
                        deliveryInfo.put("detailAddress", detailAddress);
                        deliveryInfo.put("warehouseCode", order.getWarehouseCode());
                        
                        // Full Address for display (Legacy fallback, but frontend should use components)
                        String fullAddress = order.getDeliveryAddress();
                        if (fullAddress == null) {
                            StringBuilder sb = new StringBuilder();
                            if (provinceName != null) sb.append(provinceName);
                            if (cityName != null) sb.append(cityName);
                            if (districtName != null) sb.append(districtName);
                            if (detailAddress != null) sb.append(detailAddress);
                            fullAddress = sb.toString();
                        }
                        deliveryInfo.put("fullAddress", fullAddress);
                                
                        data.put("deliveryInfo", deliveryInfo);

                        // Logistics Info
                        Map<String, Object> logisticsInfo = new HashMap<>();
                        // Prefer Inbound Order logistics if available
                        String logCompany = order.getLogisticsCompany() != null ? order.getLogisticsCompany() : po.getLogisticsCompany();
                        String logTracking = order.getTrackingNo() != null ? order.getTrackingNo() : po.getTrackingNumber();
                        
                        logisticsInfo.put("company", logCompany);
                        logisticsInfo.put("trackingNo", logTracking);
                        logisticsInfo.put("shippedAt", order.getShippedAt() != null ? order.getShippedAt() : po.getShippedAt());
                        logisticsInfo.put("eta", order.getExpectedArrival());
                        logisticsInfo.put("actualArrival", order.getActualArrival());
                        logisticsInfo.put("status", po.getShippingStatus()); // Status usually follows PO until separate status added
                        
                        // Copy extra PO logistics info for frontend consistency
                        logisticsInfo.put("deliveryMethod", po.getDeliveryMethod());
                        // IMPORTANT FIX: Implement proper fallback for logisticsSupplierName
                        // If explicitly selected, use it. Otherwise (e.g. DROPSHIP), fallback to product supplier.
                        String logisticsSupplier = po.getLogisticsSupplierName();
                        if ((logisticsSupplier == null || logisticsSupplier.isEmpty()) && po.getLogisticsProvider() != null) {
                            logisticsSupplier = po.getLogisticsProvider().getName();
                        }
                        if (logisticsSupplier == null || logisticsSupplier.isEmpty()) {
                            logisticsSupplier = po.getSupplierName();
                        }
                        if ((logisticsSupplier == null || logisticsSupplier.isEmpty()) && po.getSupplier() != null) {
                            logisticsSupplier = po.getSupplier().getName();
                        }
                        logisticsInfo.put("logisticsSupplierName", logisticsSupplier);
                        
                        logisticsInfo.put("deliverer", po.getDeliverer());
                        logisticsInfo.put("delivererPhone", po.getDelivererPhone());
                        logisticsInfo.put("plateNo", po.getPlateNumber());
                        logisticsInfo.put("currentLocation", po.getCurrentLocation());
                        logisticsInfo.put("shipCompany", po.getLogisticsCompany());
                        logisticsInfo.put("shipNo", po.getTrackingNumber());
                        logisticsInfo.put("shipTime", po.getShippedAt());
                        logisticsInfo.put("shippingProof", po.getShippingProof());
                        
                        // Tracks - Fetch by Inbound No OR PO No
                        // If Inbound has its own tracking, use it. Otherwise fallback to PO.
                        List<LogisticsTrack> tracks;
                        if (order.getTrackingNo() != null && !order.getTrackingNo().isEmpty()) {
                             tracks = logisticsTrackRepository.findByBizNoOrderByEventTimeDesc(order.getInboundNo());
                             if (tracks.isEmpty()) {
                                 // Fallback to PO tracks if no inbound specific tracks found (common in simple flows)
                                 tracks = logisticsTrackRepository.findByBizNoOrderByEventTimeDesc(po.getOrderNo());
                             }
                        } else {
                             tracks = logisticsTrackRepository.findByBizNoOrderByEventTimeDesc(po.getOrderNo());
                        }

                        List<Map<String, Object>> trackList = new ArrayList<>();
                        for (LogisticsTrack t : tracks) {
                            Map<String, Object> tMap = new HashMap<>();
                            tMap.put("time", t.getEventTime());
                            tMap.put("status", t.getStatus());
                            tMap.put("description", t.getDescription());
                            tMap.put("location", t.getLocation());
                            trackList.add(tMap);
                        }
                        logisticsInfo.put("tracks", trackList);
                        data.put("logistics", logisticsInfo);
                    }
                    
                    // Items & Summary
                    List<Map<String, Object>> itemsList = new ArrayList<>();
                    int totalQuantity = 0;
                    BigDecimal totalAmount = BigDecimal.ZERO;
                    BigDecimal totalTax = BigDecimal.ZERO;
                    
                    if (order.getItems() != null) {
                        for (InboundOrderItem item : order.getItems()) {
                            Map<String, Object> itemMap = new HashMap<>();
                            itemMap.put("id", item.getId());
                            itemMap.put("productId", item.getProduct().getId());
                            itemMap.put("productName", item.getProduct().getName());
                            itemMap.put("sku", item.getProduct().getSkuCode());
                            itemMap.put("quantity", item.getQuantity());
                            itemMap.put("unitCost", item.getUnitCost());
                            itemMap.put("totalCost", item.getTotalCost());
                            itemMap.put("spec", item.getSpec());
                            
                            // Tax Calculation
                            BigDecimal taxRate = item.getProduct().getTaxRate();
                            if (taxRate == null) taxRate = BigDecimal.ZERO;
                            itemMap.put("taxRate", taxRate);
                            
                            BigDecimal tax = item.getTotalCost() != null ? 
                                item.getTotalCost().multiply(taxRate) : BigDecimal.ZERO;
                            itemMap.put("taxAmount", tax);
                            
                            itemsList.add(itemMap);
                            
                            // Aggregate
                            if (item.getQuantity() != null) totalQuantity += item.getQuantity();
                            if (item.getTotalCost() != null) totalAmount = totalAmount.add(item.getTotalCost());
                            totalTax = totalTax.add(tax);
                        }
                    }
                    
                    data.put("items", itemsList);
                    data.put("totalQuantity", totalQuantity);
                    data.put("totalAmount", totalAmount);
                    data.put("totalTax", totalTax);

                    // Standard Response
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Success");
                    response.put("data", data);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("code", 404);
                    error.put("message", "Inbound Order not found with ID: " + id);
                    logger.error("Inbound Order not found. ID: {}", id);
                    return ResponseEntity.status(404).body(error);
                });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Long> payload) {
        Long purchaseOrderId = payload.get("purchaseOrderId");
        Long warehouseId = payload.get("warehouseId");

        if (purchaseOrderId == null) {
            throw new RuntimeException("Purchase Order ID is required");
        }
        if (warehouseId == null) {
            throw new RuntimeException("Warehouse ID is required");
        }

        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        InboundOrder inboundOrder = new InboundOrder();
        inboundOrder.setInboundNo("IN-" + System.currentTimeMillis());
        inboundOrder.setPurchaseOrder(po);
        inboundOrder.setWarehouse(warehouse);
        inboundOrder.setStatus(InboundOrder.Status.PENDING);
        
        InboundOrder saved = inboundOrderRepository.save(inboundOrder);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/check-adjustment")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> checkAdjustment(@PathVariable Long id) {
        InboundOrder inboundOrder = inboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inbound Order not found"));

        PurchaseOrder po = inboundOrder.getPurchaseOrder();
        if (po == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("data", null);
            response.put("message", "No purchase order associated");
            return ResponseEntity.ok(response);
        }

        List<CostAdjustmentItem> adjustmentItems = costAdjustmentItemRepository.findByPurchaseOrderId(po.getId());
        List<Map<String, Object>> approvedAdjustments = new ArrayList<>();
        
        for (CostAdjustmentItem adjItem : adjustmentItems) {
            CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(adjItem.getSheetId()).orElse(null);
            if (sheet != null && sheet.getStatus() == CostAdjustmentSheet.Status.APPROVED) {
                Map<String, Object> adjInfo = new HashMap<>();
                adjInfo.put("sheetNo", sheet.getSheetNo());
                adjInfo.put("productId", adjItem.getProductId());
                adjInfo.put("productName", adjItem.getProductName());
                adjInfo.put("skuCode", adjItem.getSkuCode());
                adjInfo.put("specName", adjItem.getSpecName());
                adjInfo.put("quantity", adjItem.getQuantity());
                adjInfo.put("oldCost", adjItem.getOldCost());
                adjInfo.put("newCost", adjItem.getNewCost());
                adjInfo.put("unitDiff", adjItem.getUnitDiff());
                adjInfo.put("totalDiff", adjItem.getTotalDiff());
                adjInfo.put("approvedAt", sheet.getApprovedAt());
                adjInfo.put("approvedBy", sheet.getApprovedBy());
                approvedAdjustments.add(adjInfo);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        if (!approvedAdjustments.isEmpty()) {
            response.put("data", approvedAdjustments);
            response.put("message", "Found approved cost adjustments");
        } else {
            response.put("data", null);
            response.put("message", "No approved cost adjustments found");
        }
        // 返回采购单发货状态信息
        response.put("purchaseOrderShippingStatus", po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
        response.put("purchaseOrderStatus", po.getStatus() != null ? po.getStatus().name() : null);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable Long id, javax.servlet.http.HttpServletRequest request) {
        // 使用JOIN FETCH加载采购单信息，避免懒加载问题
        InboundOrder inboundOrder = inboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inbound Order not found"));

        if (inboundOrder.getStatus() != InboundOrder.Status.PENDING) {
            throw new RuntimeException("Inbound Order is not in PENDING status");
        }

        PurchaseOrder po = inboundOrder.getPurchaseOrder();
        if (po == null) {
             throw new RuntimeException("Associated Purchase Order not found");
        }
        
        String poSupplierName = null;
        if (po.getSupplier() != null) {
            poSupplierName = po.getSupplier().getName();
        } else if (po.getSupplierName() != null) {
            poSupplierName = po.getSupplierName();
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String operator = (authentication != null && authentication.isAuthenticated() && authentication.getName() != null) ? authentication.getName() : "系统";
        
        // 记录状态变更前的状态
        InboundOrder.Status oldStatus = inboundOrder.getStatus();
        logger.info("入库单状态变更: 入库单号={}, 旧状态={}, 新状态={}, 操作人={}, 时间={}", 
                inboundOrder.getInboundNo(), oldStatus, InboundOrder.Status.RECEIVED, operator, LocalDateTime.now());

        for (InboundOrderItem item : inboundOrder.getItems()) {
             Product product = item.getProduct();
             if (product == null) continue;

             // 查询是否有入库前通过的调价单
             List<CostAdjustmentItem> adjustmentItems = costAdjustmentItemRepository.findByPurchaseOrderId(po.getId());
             BigDecimal adjustedUnitCost = item.getUnitCost(); // 默认使用原始成本
             BigDecimal adjustedTotalCost = item.getTotalCost(); // 默认使用原始总成本
             CostAdjustmentItem matchedAdjustment = null;
             String matchedSheetNo = null;
             
             // 查找匹配的调价记录（入库前通过的调价）
             for (CostAdjustmentItem adjItem : adjustmentItems) {
                 // 通过sheetId查询调价单
                 CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(adjItem.getSheetId()).orElse(null);
                 if (sheet != null && 
                     sheet.getStatus() == CostAdjustmentSheet.Status.APPROVED &&
                     sheet.getApprovedAt() != null &&
                     sheet.getApprovedAt().isBefore(LocalDateTime.now())) {
                     
                     // 匹配商品和规格
                     boolean matches = false;
                     if (product.getId().equals(adjItem.getProductId())) {
                         if (item.getSpec() == null || item.getSpec().isEmpty()) {
                             matches = true;
                         } else if (item.getSpec().equals(adjItem.getSpecName())) {
                             matches = true;
                         }
                     }
                     
                     if (matches) {
                         matchedAdjustment = adjItem;
                         matchedSheetNo = sheet.getSheetNo();
                         adjustedUnitCost = adjItem.getNewCost();
                         adjustedTotalCost = adjustedUnitCost.multiply(BigDecimal.valueOf(item.getQuantity()));
                         logger.info("入库单 {} 商品 {} 发现调价单 {}: 原成本={}, 调价后成本={}", 
                             inboundOrder.getInboundNo(), product.getName(), 
                             matchedSheetNo, item.getUnitCost(), adjustedUnitCost);
                         break;
                     }
                 }
             }

             StockBatch batch = new StockBatch();
             batch.setBatchNo(batchNoGeneratorService.generateBatchNo(product, poSupplierName));
             batch.setProduct(product);
             
             // Extract Sku from item specification
             Sku targetSku = null;
             if (product.getSkus() != null && !product.getSkus().isEmpty()) {
                 if (item.getSpec() != null && !item.getSpec().isEmpty()) {
                     targetSku = product.getSkus().stream()
                             .filter(s -> item.getSpec().equals(s.getName()) || item.getSpec().equals(s.getSpecification()))
                             .findFirst()
                             .orElse(product.getSkus().get(0));
                 } else {
                     targetSku = product.getSkus().get(0);
                 }
             }
             batch.setSku(targetSku);
             
             batch.setWarehouse(inboundOrder.getWarehouse());
             batch.setPurchaseOrderId(inboundOrder.getPurchaseOrder() != null ? inboundOrder.getPurchaseOrder().getId() : null);
             batch.setQuantity(item.getQuantity());
             batch.setAvailableQuantity(item.getQuantity());
             batch.setUnitCost(adjustedUnitCost);
             batch.setTotalCost(adjustedTotalCost);
             batch.setProductionDate(LocalDate.now());
             batch.setExpiryDate(LocalDate.now().plusYears(1));
             batch.setStatus(StockBatch.Status.ACTIVE);
             
             StockBatch savedBatch = stockBatchRepository.save(batch);

             StockFlow flow = new StockFlow();
             flow.setStockBatch(savedBatch);
             flow.setWarehouse(inboundOrder.getWarehouse());
             flow.setProduct(product);
             flow.setSku(targetSku);
             flow.setSpecName(targetSku != null ? (targetSku.getName() != null ? targetSku.getName() : targetSku.getSpecification()) : "-");
             flow.setBatchNo(savedBatch.getBatchNo());
             flow.setFlowType(StockFlow.FlowType.INBOUND);
             flow.setQuantity(item.getQuantity());
             flow.setBalanceAfter(item.getQuantity());
             flow.setReferenceNo(inboundOrder.getInboundNo());
             flow.setReason("Purchase Inbound");
             flow.setUnitCost(adjustedUnitCost);
             flow.setTotalCost(adjustedTotalCost);
             flow.setCostChange(adjustedTotalCost);
             flow.setOperator(operator);
             
             logger.info("Creating StockFlow for inbound order {}: product={}, sku={}, specName={}, quantity={}, unitCost={}", 
                 inboundOrder.getInboundNo(), product.getName(), 
                 targetSku != null ? targetSku.getSkuCode() : "N/A", 
                 flow.getSpecName(), item.getQuantity(), adjustedUnitCost);
             
             stockFlowRepository.save(flow);
        }

        inboundOrder.setStatus(InboundOrder.Status.RECEIVED);
        inboundOrder.setInboundDate(LocalDateTime.now());
        inboundOrder.setConfirmedBy(operator);
        
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        inboundOrder.setConfirmedIp(ipAddress);
        
        inboundOrderRepository.save(inboundOrder);
        
        po.setStatus(PurchaseOrder.Status.RECEIVED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.RECEIVED);
        purchaseOrderRepository.save(po);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Confirmed successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/details")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateDetails(
            @PathVariable Long id,
            @RequestBody InboundOrderUpdateRequest request) {
        
        InboundOrder order = inboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inbound Order not found"));

        // Update Contact Info
        if (request.getContactName() != null) order.setContactName(request.getContactName());
        if (request.getContactPhone() != null) order.setContactPhone(request.getContactPhone());
        if (request.getContactEmail() != null) order.setContactEmail(request.getContactEmail());

        // Update Address Info
        if (request.getProvince() != null) order.setProvince(request.getProvince());
        if (request.getCity() != null) order.setCity(request.getCity());
        if (request.getDistrict() != null) order.setDistrict(request.getDistrict());
        if (request.getDetailAddress() != null) order.setDetailAddress(request.getDetailAddress());
        if (request.getWarehouseCode() != null) order.setWarehouseCode(request.getWarehouseCode());

        // Update Logistics Info
        if (request.getLogisticsCompany() != null) order.setLogisticsCompany(request.getLogisticsCompany());
        if (request.getTrackingNo() != null) order.setTrackingNo(request.getTrackingNo());
        if (request.getShippedAt() != null) order.setShippedAt(request.getShippedAt());
        if (request.getExpectedArrival() != null) order.setExpectedArrival(request.getExpectedArrival());
        if (request.getActualArrival() != null) order.setActualArrival(request.getActualArrival());

        inboundOrderRepository.save(order);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Inbound details updated successfully");
        return ResponseEntity.ok(response);
    }
}
