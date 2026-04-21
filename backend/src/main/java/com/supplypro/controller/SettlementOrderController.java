package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.SettlementOrderLog;
import com.supplypro.entity.OutboundOrder;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.CostAdjustmentSheet;
import com.supplypro.entity.CostAdjustmentItem;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.SettlementOrderLogRepository;
import com.supplypro.repository.OutboundOrderRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.CostAdjustmentSheetRepository;
import com.supplypro.repository.CostAdjustmentItemRepository;
import com.supplypro.repository.SupplierPrepaymentLogRepository;
import com.supplypro.entity.SupplierPrepaymentLog;
import com.supplypro.entity.RefundOrder;
import com.supplypro.repository.RefundOrderRepository;
import com.supplypro.service.SettlementService;
import com.supplypro.common.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.domain.Specification;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/settlements")
@CrossOrigin(origins = "*")
public class SettlementOrderController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(SettlementOrderController.class);

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private OutboundOrderRepository outboundOrderRepository;

    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Autowired
    private SettlementOrderLogRepository settlementOrderLogRepository;

    @Autowired
    private com.supplypro.repository.LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private com.supplypro.repository.LogisticsCompanyRepository logisticsCompanyRepository;

    @Autowired
    private com.supplypro.repository.SupplierRepository supplierRepository;

    @Autowired
    private com.supplypro.repository.SupplierAccountRepository supplierAccountRepository;

    @Autowired
    private com.supplypro.repository.LogisticsProviderAccountRepository logisticsProviderAccountRepository;

    @Autowired
    private CostAdjustmentSheetRepository costAdjustmentSheetRepository;

    @Autowired
    private CostAdjustmentItemRepository costAdjustmentItemRepository;

    @Autowired
    private SupplierPrepaymentLogRepository supplierPrepaymentLogRepository;

    @Autowired
    private RefundOrderRepository refundOrderRepository;

    @Autowired
    private SettlementService settlementService;

    @Autowired
    private com.supplypro.service.SupplierFinanceService supplierFinanceService;

    private PurchaseOrder getFirstValidPurchaseOrder(String relatedOrderNo, Map<String, PurchaseOrder> poMap) {
        if (relatedOrderNo == null || relatedOrderNo.isEmpty()) return null;
        String[] orderNoArray = relatedOrderNo.split(",");
        for (String orderNo : orderNoArray) {
            PurchaseOrder po = poMap.get(orderNo.trim());
            if (po != null) return po;
        }
        return null;
    }

    @GetMapping("/pending-delivery")
    public ResponseEntity<Map<String, Object>> getPendingDeliverySettlements(
            @RequestParam(required = false) String purchaseOrderNo,
            @RequestParam(required = false) String trackingNo,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String deliveryNo,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sourceType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        // 优化策略：
        // 1. 如果有 PO 相关的搜索条件（订单号、物流单号），先在 PurchaseOrder 表中找到对应的订单号列表。
        // 2. 使用这些订单号去 SettlementOrder 表中过滤。
        // 3. 如果没有 PO 相关搜索条件，直接分页查询 SettlementOrder。
        // 4. 批量加载关联的 PurchaseOrder 信息，避免 N+1 查询。

        List<String> targetOrderNos = null;
        boolean hasSearchCriteria = (purchaseOrderNo != null && !purchaseOrderNo.trim().isEmpty()) || 
                                    (trackingNo != null && !trackingNo.trim().isEmpty());

        if (hasSearchCriteria) {
            Specification<PurchaseOrder> poSpec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                if (purchaseOrderNo != null && !purchaseOrderNo.trim().isEmpty()) {
                    predicates.add(cb.like(root.get("orderNo"), "%" + purchaseOrderNo.trim() + "%"));
                }
                if (trackingNo != null && !trackingNo.trim().isEmpty()) {
                    predicates.add(cb.like(root.get("trackingNumber"), "%" + trackingNo.trim() + "%"));
                }
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            
            Page<PurchaseOrder> poPage = purchaseOrderRepository.findAll(poSpec, PageRequest.of(0, 500));
            targetOrderNos = poPage.getContent().stream()
                .map(PurchaseOrder::getOrderNo)
                .collect(java.util.stream.Collectors.toList());
            
            if (targetOrderNos.isEmpty() && !"出库单".equals(sourceType)) {
                Map<String, Object> response = new HashMap<>();
                response.put("records", java.util.Collections.emptyList());
                response.put("total", 0);
                return ResponseEntity.ok(response);
            }
        }

        final List<String> searchOrderNos = targetOrderNos;

        Specification<SettlementOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("type"), SettlementOrder.Type.LOGISTICS));
            predicates.add(cb.equal(root.get("status"), SettlementOrder.Status.PENDING));
            predicates.add(cb.isNull(root.get("settlementNo")));
            
            if (sourceType != null && !sourceType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("sourceType"), sourceType.trim()));
            }
            
            if (searchOrderNos != null) {
                List<Predicate> orPredicates = new ArrayList<>();
                for (String orderNo : searchOrderNos) {
                    orPredicates.add(cb.like(root.get("relatedOrderNo"), "%" + orderNo + "%"));
                }
                predicates.add(cb.or(orPredicates.toArray(new Predicate[0])));
            }
            
            if (purchaseOrderNo != null && !purchaseOrderNo.trim().isEmpty()) {
                predicates.add(cb.like(root.get("relatedOrderNo"), "%" + purchaseOrderNo.trim() + "%"));
            }
            
            if (deliveryNo != null && !deliveryNo.trim().isEmpty()) {
                predicates.add(cb.like(root.get("deliveryNo"), "%" + deliveryNo.trim() + "%"));
            }
            
            if (supplierName != null && !supplierName.trim().isEmpty()) {
                Predicate supplierPredicate = cb.like(root.get("supplier").get("name"), "%" + supplierName.trim() + "%");
                Predicate logisticsProviderPredicate = cb.like(root.get("logisticsProvider").get("name"), "%" + supplierName.trim() + "%");
                predicates.add(cb.or(supplierPredicate, logisticsProviderPredicate));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // 分页查询 SettlementOrder
        Page<SettlementOrder> pageResult = settlementOrderRepository.findAll(
                spec,
                PageRequest.of(page, size, Sort.by("id").descending())
        );
        
        List<SettlementOrder> orders = pageResult.getContent();
        if (orders.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("records", java.util.Collections.emptyList());
            response.put("total", 0);
            return ResponseEntity.ok(response);
        }

        // 批量加载 PurchaseOrder
        Set<String> allOrderNos = new java.util.HashSet<>();
        for (SettlementOrder order : orders) {
            if (order.getRelatedOrderNo() != null) {
                String[] orderNoArray = order.getRelatedOrderNo().split(",");
                for (String no : orderNoArray) {
                    allOrderNos.add(no.trim());
                }
            }
        }
        
        Map<String, PurchaseOrder> poMap = new HashMap<>();
        if (!allOrderNos.isEmpty()) {
             List<PurchaseOrder> pos = purchaseOrderRepository.findByOrderNoIn(new ArrayList<>(allOrderNos));
             poMap = pos.stream().collect(java.util.stream.Collectors.toMap(PurchaseOrder::getOrderNo, po -> po));
        }
        
        final Map<String, PurchaseOrder> finalPoMap = poMap;

        // 构建返回结果
        List<Map<String, Object>> result = orders.stream().map(order -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("relatedOrderNo", order.getRelatedOrderNo());
            map.put("sourceType", order.getSourceType());
            
            PurchaseOrder po = getFirstValidPurchaseOrder(order.getRelatedOrderNo(), finalPoMap);
            
            map.put("deliveryNo", order.getDeliveryNo());
            map.put("settlementNo", order.getSettlementNo());
            
            // 优先从 SettlementOrder 获取物流单号，其次从 PurchaseOrder 获取
            String orderTrackingNo = order.getTrackingNo();
            if (orderTrackingNo == null || orderTrackingNo.isEmpty()) {
                orderTrackingNo = (po != null) ? po.getTrackingNumber() : null;
            }
            map.put("trackingNo", orderTrackingNo);
            
            if (po != null) {
                map.put("relatedOrderId", po.getId());
            }
            String deliveryMethod = order.getDeliveryMethod();
            
            if (deliveryMethod == null && po != null) {
                deliveryMethod = po.getDeliveryMethod();
            }

            if ("SelfDelivery".equals(deliveryMethod)) {
                map.put("type", "SelfDelivery");
                if (po != null) {
                     String details = "配送员: " + (po.getDeliverer() != null ? po.getDeliverer() : "-");
                     details += ", 电话: " + (po.getDelivererPhone() != null ? po.getDelivererPhone() : "-");
                     if (po.getPlateNumber() != null && !po.getPlateNumber().isEmpty()) {
                         details += ", 车牌: " + po.getPlateNumber();
                     }
                     if (orderTrackingNo != null && !orderTrackingNo.isEmpty()) {
                         details += ", 物流单号: " + orderTrackingNo;
                     }
                     map.put("details", details);
                } else {
                     // 对于出库单来源的自配送，使用 SettlementOrder 中的信息
                     String details = "自配送";
                     if (orderTrackingNo != null && !orderTrackingNo.isEmpty()) {
                         details += ", 物流单号: " + orderTrackingNo;
                     }
                     map.put("details", details);
                }
            } else {
                map.put("type", "Logistics");
                // 优先从 SettlementOrder 获取物流公司，其次从 PurchaseOrder 获取
                String companyCode = order.getLogisticsCompany();
                String companyName = companyCode;
                
                if (companyCode == null || companyCode.isEmpty()) {
                    companyCode = (po != null) ? po.getLogisticsCompany() : null;
                    companyName = companyCode;
                }
                
                if (companyCode != null && !companyCode.isEmpty()) {
                    try {
                        com.supplypro.entity.LogisticsCompany company = logisticsCompanyRepository.findById(companyCode).orElse(null);
                        if (company != null && company.getName() != null) {
                            companyName = company.getName();
                        }
                    } catch (Exception e) {
                    }
                }
                
                if (companyName != null || orderTrackingNo != null) {
                    map.put("details", "物流公司: " + (companyName != null ? companyName : "-") + 
                                     ", 单号: " + (orderTrackingNo != null ? orderTrackingNo : "-"));
                } else {
                    map.put("details", "物流信息缺失");
                }
            }
            
            String settlementTypeStr = "Monthly";
            Integer settlementPeriod = 30;
            
            if (order.getLogisticsProvider() != null) {
                 map.put("supplierId", order.getLogisticsProvider().getId());
                 map.put("supplierName", order.getLogisticsProvider().getName());
                 if (order.getLogisticsProvider().getSettlementType() != null) {
                     settlementTypeStr = order.getLogisticsProvider().getSettlementType().name();
                 }
                 settlementPeriod = order.getLogisticsProvider().getSettlementPeriod();

             } else if (order.getSupplier() != null) {
                 map.put("supplierId", order.getSupplier().getId());
                 map.put("supplierName", order.getSupplier().getName());
                 if (order.getSupplier().getSettlementType() != null) {
                     settlementTypeStr = order.getSupplier().getSettlementType().name();
                 }
                 settlementPeriod = order.getSupplier().getSettlementPeriod();
             } else {
                 if (po != null && po.getSupplier() != null) {
                      map.put("supplierId", po.getSupplier().getId());
                      map.put("supplierName", po.getSupplier().getName());
                      if (po.getSupplier().getSettlementType() != null) {
                         settlementTypeStr = po.getSupplier().getSettlementType().name();
                      }
                      settlementPeriod = po.getSupplier().getSettlementPeriod();
                 } else {
                      map.put("supplierName", "Unknown Provider");
                 }
             }
             
             String settlementTypeCn = "月结";
             if (settlementTypeStr != null) {
                 if ("MONTHLY".equalsIgnoreCase(settlementTypeStr)) settlementTypeCn = "月结";
                 else if ("WEEKLY".equalsIgnoreCase(settlementTypeStr)) settlementTypeCn = "周结";
                 else if ("PREPAYMENT".equalsIgnoreCase(settlementTypeStr)) settlementTypeCn = "预付";
                 else if ("FISHERMAN".equalsIgnoreCase(settlementTypeStr)) settlementTypeCn = "渔民自送";
                 else if ("REAL_TIME".equalsIgnoreCase(settlementTypeStr)) settlementTypeCn = "实销实结";
                 else if ("PERIOD".equalsIgnoreCase(settlementTypeStr)) settlementTypeCn = "月结";
                 else settlementTypeCn = settlementTypeStr;
             }
             map.put("settlementType", settlementTypeCn);
             
             if ("FISHERMAN".equalsIgnoreCase(settlementTypeStr) || "PREPAYMENT".equalsIgnoreCase(settlementTypeStr)) {
                 map.put("settlementCycle", "");
             } else {
                 String cycle = "月结";
                 if (settlementPeriod != null) {
                     if (settlementPeriod == 30) cycle = "月结";
                     else if (settlementPeriod == 7) cycle = "周结";
                     else cycle = settlementPeriod + " 天";
                 }
                 map.put("settlementCycle", cycle);
             }
            
            map.put("fee", order.getTotalAmount());
            
            String deliveryStatus = "待处理";
            // 对于出库单来源的结算单，默认状态为已发货
            if ("出库单".equals(order.getSourceType())) {
                deliveryStatus = "已发货";
            }
            // 对于采购单来源的结算单，根据采购单状态判断
            if (po != null && po.getStatus() != null) {
                String poStatus = po.getStatus().name();
                if ("SHIPPED".equals(poStatus)) deliveryStatus = "已发货";
                else if ("RECEIVED".equals(poStatus)) deliveryStatus = "已收货";
                else if ("PARTIAL_RECEIVED".equals(poStatus)) deliveryStatus = "部分收货";
                else if ("PENDING".equals(poStatus)) deliveryStatus = "待处理";
                else if ("CONFIRMED".equals(poStatus)) deliveryStatus = "已确认";
                else if ("CANCELLED".equals(poStatus)) deliveryStatus = "已取消";
                else deliveryStatus = poStatus;
            }
            map.put("status", deliveryStatus);
            return map;
        }).collect(java.util.stream.Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("records", result);
        response.put("total", pageResult.getTotalElements());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending-purchase")
    public ResponseEntity<Map<String, Object>> getPendingPurchaseSettlements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String purchaseOrderNo,
            @RequestParam(required = false) String bizNo,
            @RequestParam(required = false) String bizType,
            @RequestParam(required = false) String settlementType) {
        
        // 从 purchase_orders 表查询待结算的采购单
        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // 只查询未结算的采购单
            Predicate isUnsettled = cb.equal(root.get("settlementStatus"), PurchaseOrder.SettlementStatus.UNSETTLED);
            Predicate isNull = cb.isNull(root.get("settlementStatus"));
            predicates.add(cb.or(isUnsettled, isNull));
            
            // 排除待处理状态的采购单（只有已确认/已发货/已收货的采购单才能结算）
            predicates.add(cb.notEqual(root.get("status"), PurchaseOrder.Status.PENDING));
            predicates.add(cb.notEqual(root.get("status"), PurchaseOrder.Status.CANCELLED));
            
            // 供应商名称筛选
            if (supplierName != null && !supplierName.trim().isEmpty()) {
                Join<PurchaseOrder, Supplier> supplierJoin = root.join("supplier", JoinType.LEFT);
                predicates.add(cb.like(supplierJoin.get("name"), "%" + supplierName.trim() + "%"));
            }
            
            // 采购单号筛选
            if (purchaseOrderNo != null && !purchaseOrderNo.trim().isEmpty()) {
                predicates.add(cb.like(root.get("orderNo"), "%" + purchaseOrderNo.trim() + "%"));
            }
            
            // 业务单号筛选 - 需要特殊处理
            if (bizNo != null && !bizNo.trim().isEmpty()) {
                String bizNoTrim = bizNo.trim();
                List<Long> matchedPoIds = new ArrayList<>();
                
                // 1. 检查采购单本身的 bizNo
                List<PurchaseOrder> allPOs = purchaseOrderRepository.findAll();
                for (PurchaseOrder po : allPOs) {
                    if (bizNoTrim.equals(po.getBizNo()) || (po.getBizNo() != null && po.getBizNo().contains(bizNoTrim))) {
                        matchedPoIds.add(po.getId());
                    }
                }
                
                // 2. 检查调价单号
                List<CostAdjustmentSheet> sheets = costAdjustmentSheetRepository.findAll();
                for (CostAdjustmentSheet sheet : sheets) {
                    if (sheet.getStatus() == CostAdjustmentSheet.Status.APPROVED && 
                        sheet.getSheetNo() != null && sheet.getSheetNo().contains(bizNoTrim)) {
                        List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheet.getId());
                        for (CostAdjustmentItem item : items) {
                            matchedPoIds.add(item.getPurchaseOrderId());
                        }
                    }
                }
                
                if (matchedPoIds.isEmpty()) {
                    predicates.add(cb.disjunction()); // 没有匹配的采购单
                } else {
                    predicates.add(root.get("id").in(matchedPoIds.stream().distinct().collect(java.util.stream.Collectors.toList())));
                }
            }
            
            // 业务类型筛选 - 需要特殊处理 COST_ADJUSTMENT 和 REFUND
            if (bizType != null && !bizType.trim().isEmpty()) {
                if ("COST_ADJUSTMENT".equals(bizType.trim())) {
                    // 调价单：查询有关联调价单的采购单
                    List<Long> poIdsWithAdjustment = costAdjustmentItemRepository.findAll().stream()
                        .filter(item -> {
                            CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(item.getSheetId()).orElse(null);
                            return sheet != null && sheet.getStatus() == CostAdjustmentSheet.Status.APPROVED;
                        })
                        .map(CostAdjustmentItem::getPurchaseOrderId)
                        .collect(java.util.stream.Collectors.toList());
                    if (poIdsWithAdjustment.isEmpty()) {
                        predicates.add(cb.disjunction()); // 没有符合条件的采购单
                    } else {
                        predicates.add(root.get("id").in(poIdsWithAdjustment));
                    }
                } else if ("REFUND".equals(bizType.trim())) {
                    List<RefundOrder> refundOrders = refundOrderRepository.findByRelatedOrderIdAndBizType(
                        null, RefundOrder.BizType.PURCHASE);
                    List<Long> poIdsWithRefund = refundOrders.stream()
                        .filter(ro -> ro.getStatus() == RefundOrder.Status.COMPLETED)
                        .map(RefundOrder::getRelatedOrderId)
                        .filter(java.util.Objects::nonNull)
                        .collect(java.util.stream.Collectors.toList());
                    if (poIdsWithRefund.isEmpty()) {
                        predicates.add(cb.disjunction());
                    } else {
                        predicates.add(root.get("id").in(poIdsWithRefund.stream().distinct().collect(java.util.stream.Collectors.toList())));
                    }
                } else {
                    // 其他业务类型：将字符串转换为枚举值进行比较
                    try {
                        PurchaseOrder.BizType bizTypeEnum = PurchaseOrder.BizType.valueOf(bizType.trim());
                        predicates.add(cb.equal(root.get("bizType"), bizTypeEnum));
                    } catch (IllegalArgumentException e) {
                        // 无效的业务类型，返回空结果
                        predicates.add(cb.disjunction());
                    }
                }
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // 先查询所有待结算采购单（不分页），然后在内存中构建所有记录
        List<PurchaseOrder> allOrders = purchaseOrderRepository.findAll(spec, Sort.by("id").descending());
        
        // Build response - 按业务单拆分显示
        List<Map<String, Object>> allRecords = new ArrayList<>();
        for (PurchaseOrder po : allOrders) {
            // 根据筛选条件决定是否添加采购单本身的业务记录
            boolean shouldAddPORecord = bizType == null || bizType.trim().isEmpty() || 
                bizType.trim().equals(po.getBizType() != null ? po.getBizType().name() : null);
            
            // 业务单号筛选 - 检查是否匹配
            if (bizNo != null && !bizNo.trim().isEmpty()) {
                String bizNoTrim = bizNo.trim();
                boolean bizNoMatch = bizNoTrim.equals(po.getBizNo()) || 
                    (po.getBizNo() != null && po.getBizNo().contains(bizNoTrim));
                shouldAddPORecord = shouldAddPORecord && bizNoMatch;
            }
            
            if (shouldAddPORecord) {
                String recordBizType = po.getBizType() != null ? po.getBizType().name() : "UNKNOWN";
                Map<String, Object> poRecord = new HashMap<>();
                poRecord.put("id", recordBizType + "-" + po.getId());
                poRecord.put("rawId", po.getId());
                poRecord.put("purchaseOrderId", po.getId());
                poRecord.put("purchaseOrderNo", po.getOrderNo());
                poRecord.put("bizType", po.getBizType() != null ? po.getBizType().name() : null);
                poRecord.put("bizTypeLabel", po.getBizType() != null ? po.getBizType().getDescription() : null);
                poRecord.put("bizNo", po.getBizNo());
                poRecord.put("amount", po.getTotalAmount());
                poRecord.put("createdAt", po.getCreatedAt());
                poRecord.put("status", po.getStatus() != null ? po.getStatus().name() : null);
                poRecord.put("shippingStatus", po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
                poRecord.put("platformOrderNo", po.getPlatformOrderNo());
                
                if (po.getSupplier() != null) {
                    poRecord.put("supplierId", po.getSupplier().getId());
                    poRecord.put("supplierName", po.getSupplier().getName());
                    poRecord.put("settlementType", po.getSupplier().getSettlementType() != null ? 
                        po.getSupplier().getSettlementType().name() : null);
                    poRecord.put("settlementPeriod", po.getSupplier().getSettlementPeriod());
                }
                
                allRecords.add(poRecord);
            }
            
            // 根据筛选条件决定是否添加调价单记录
            boolean shouldAddAdjustmentRecords = bizType == null || bizType.trim().isEmpty() || 
                "COST_ADJUSTMENT".equals(bizType.trim());
            
            // 业务单号搜索标志
            boolean hasBizNoSearch = bizNo != null && !bizNo.trim().isEmpty();
            
            if (shouldAddAdjustmentRecords) {
                // 2. 查询并添加调价单记录
                List<CostAdjustmentItem> adjustmentItems = costAdjustmentItemRepository.findByPurchaseOrderId(po.getId());
                for (CostAdjustmentItem item : adjustmentItems) {
                    // 获取调价单信息
                    CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(item.getSheetId()).orElse(null);
                    if (sheet != null && sheet.getStatus() == CostAdjustmentSheet.Status.APPROVED) {
                        // 业务单号筛选 - 检查调价单号是否匹配
                        if (hasBizNoSearch) {
                            boolean bizNoMatch = sheet.getSheetNo() != null && sheet.getSheetNo().contains(bizNo.trim());
                            if (!bizNoMatch) {
                                continue;
                            }
                        }
                        
                        Map<String, Object> adjRecord = new HashMap<>();
                        adjRecord.put("id", "COST_ADJUSTMENT-" + item.getId());
                        adjRecord.put("rawId", item.getId());
                        adjRecord.put("purchaseOrderId", po.getId());
                        adjRecord.put("purchaseOrderNo", po.getOrderNo());
                        adjRecord.put("bizType", "COST_ADJUSTMENT");
                        adjRecord.put("bizTypeLabel", "调价单");
                        adjRecord.put("bizNo", sheet.getSheetNo());
                        adjRecord.put("amount", item.getTotalDiff());
                        adjRecord.put("createdAt", item.getCreatedAt());
                        adjRecord.put("status", po.getStatus() != null ? po.getStatus().name() : null);
                        adjRecord.put("shippingStatus", po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
                        
                        if (po.getSupplier() != null) {
                            adjRecord.put("supplierId", po.getSupplier().getId());
                            adjRecord.put("supplierName", po.getSupplier().getName());
                            adjRecord.put("settlementType", po.getSupplier().getSettlementType() != null ? 
                                po.getSupplier().getSettlementType().name() : null);
                            adjRecord.put("settlementPeriod", po.getSupplier().getSettlementPeriod());
                        }
                        
                        allRecords.add(adjRecord);
                    }
                }
            }
            
            // 根据筛选条件决定是否添加退款单记录
            boolean shouldAddRefundRecords = bizType == null || bizType.trim().isEmpty() || 
                "REFUND".equals(bizType.trim());
            
            if (shouldAddRefundRecords) {
                List<RefundOrder> refundOrders = refundOrderRepository.findByRelatedOrderIdAndBizType(
                    po.getId(), RefundOrder.BizType.PURCHASE);
                for (RefundOrder ro : refundOrders) {
                    if (ro.getStatus() != RefundOrder.Status.COMPLETED) continue;
                    if ("SETTLED".equals(ro.getSettlementStatus())) continue;
                    Map<String, Object> refundRecord = new HashMap<>();
                    refundRecord.put("id", "REFUND-" + ro.getId());
                    refundRecord.put("rawId", ro.getId());
                    refundRecord.put("purchaseOrderId", po.getId());
                    refundRecord.put("purchaseOrderNo", po.getOrderNo());
                    refundRecord.put("bizType", "REFUND");
                    refundRecord.put("bizTypeLabel", "退款单");
                    refundRecord.put("bizNo", ro.getRefundNo());
                    refundRecord.put("amount", ro.getRefundAmount().negate());
                    refundRecord.put("createdAt", ro.getCreatedAt());
                    refundRecord.put("status", po.getStatus() != null ? po.getStatus().name() : null);
                    refundRecord.put("shippingStatus", po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
                    refundRecord.put("refundNo", ro.getRefundNo());
                    refundRecord.put("refundType", ro.getRefundType() != null ? ro.getRefundType().name() : null);
                    refundRecord.put("bearer", ro.getBearer() != null ? ro.getBearer().name() : null);
                    refundRecord.put("specName", ro.getSpecName());
                    refundRecord.put("quantity", ro.getQuantity());
                    refundRecord.put("platformOrderNo", ro.getPlatformOrderNo());
                    refundRecord.put("platformRefundNo", ro.getPlatformRefundNo());
                    
                    if (po.getSupplier() != null) {
                        refundRecord.put("supplierId", po.getSupplier().getId());
                        refundRecord.put("supplierName", po.getSupplier().getName());
                        refundRecord.put("settlementType", po.getSupplier().getSettlementType() != null ? 
                            po.getSupplier().getSettlementType().name() : null);
                        refundRecord.put("settlementPeriod", po.getSupplier().getSettlementPeriod());
                    }
                    
                    allRecords.add(refundRecord);
                }
            }
        }
        
        // 按创建时间倒序排序
        allRecords.sort((a, b) -> {
            java.time.LocalDateTime timeA = a.get("createdAt") != null ? 
                java.time.LocalDateTime.parse(a.get("createdAt").toString().replace(" ", "T").substring(0, 19)) : 
                java.time.LocalDateTime.MIN;
            java.time.LocalDateTime timeB = b.get("createdAt") != null ? 
                java.time.LocalDateTime.parse(b.get("createdAt").toString().replace(" ", "T").substring(0, 19)) : 
                java.time.LocalDateTime.MIN;
            return timeB.compareTo(timeA);
        });
        
        // 分页处理
        int totalRecords = allRecords.size();
        int totalPages = (int) Math.ceil((double) totalRecords / size);
        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, totalRecords);
        List<Map<String, Object>> pagedRecords = fromIndex < totalRecords ? 
            allRecords.subList(fromIndex, toIndex) : new ArrayList<>();
        
        Map<String, Object> response = new HashMap<>();
        response.put("records", pagedRecords);
        response.put("total", totalRecords);
        response.put("totalPages", totalPages);
        response.put("currentPage", page);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) SettlementOrder.Type type,
            @RequestParam(required = false) String purchaseOrderNo,
            @RequestParam(required = false) String businessNo) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("id").descending());
        
        Specification<SettlementOrder> spec = (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("supplier", JoinType.LEFT);
                root.fetch("logisticsProvider", JoinType.LEFT);
            }
            List<Predicate> predicates = new ArrayList<>();
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            // 只返回已经生成结算单的记录（即过滤掉纯配送单记录）
            predicates.add(cb.isNotNull(root.get("settlementNo")));
            
            if (purchaseOrderNo != null && !purchaseOrderNo.trim().isEmpty()) {
                predicates.add(cb.like(root.get("relatedOrderNo"), "%" + purchaseOrderNo.trim() + "%"));
            }
            
            if (businessNo != null && !businessNo.trim().isEmpty()) {
                String searchPattern = "%" + businessNo.trim() + "%";
                Predicate deliveryNoLike = cb.like(root.get("deliveryNo"), searchPattern);
                Predicate relatedOrderNoLike = cb.like(root.get("relatedOrderNo"), searchPattern);
                predicates.add(cb.or(deliveryNoLike, relatedOrderNoLike));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<SettlementOrder> pageResult = settlementOrderRepository.findAll(spec, pageRequest);
        List<SettlementOrder> content = pageResult.getContent();

        // 批量预加载关联数据，解决 N+1 问题
        // 1. 收集所有的 DeliveryNo 和 RelatedOrderNo
        Set<String> deliveryNos = new java.util.HashSet<>();
        Set<String> relatedOrderNos = new java.util.HashSet<>();
        
        for (SettlementOrder order : content) {
            if (order.getDeliveryNo() != null && !order.getDeliveryNo().isEmpty()) {
                deliveryNos.add(order.getDeliveryNo());
            }
            if (order.getRelatedOrderNo() != null && !order.getRelatedOrderNo().isEmpty()) {
                String[] orderNos = order.getRelatedOrderNo().split(",");
                for (String no : orderNos) {
                    relatedOrderNos.add(no.trim());
                }
            }
        }

        // 2. 批量查询 SettlementOrder (By DeliveryNo)
        Map<String, SettlementOrder> deliveryOrderMap = new HashMap<>();
        if (!deliveryNos.isEmpty()) {
            List<SettlementOrder> deliveryOrders = settlementOrderRepository.findByDeliveryNoIn(new ArrayList<>(deliveryNos));
            for (SettlementOrder d : deliveryOrders) {
                deliveryOrderMap.put(d.getDeliveryNo(), d);
            }
        }

        // 3. 批量查询 PurchaseOrder (By OrderNo)
        Map<String, PurchaseOrder> purchaseOrderMap = new HashMap<>();
        if (!relatedOrderNos.isEmpty()) {
            List<PurchaseOrder> pos = purchaseOrderRepository.findByOrderNoIn(new ArrayList<>(relatedOrderNos));
            for (PurchaseOrder p : pos) {
                purchaseOrderMap.put(p.getOrderNo(), p);
            }
        }

        // Convert to Map
        List<Map<String, Object>> records = content.stream().map(order -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("settlementNo", order.getSettlementNo());
            
            String typeCn = "采购结算";
            if (order.getType() == SettlementOrder.Type.LOGISTICS) typeCn = "配送单";
            map.put("type", typeCn);
            
            map.put("totalAmount", order.getTotalAmount());
            map.put("createdAt", order.getCreatedAt());
            
            String supplierName = "未知供应商";
            String supplierSource = "";
            
            if (order.getLogisticsProvider() != null && order.getLogisticsProvider().getName() != null) {
                supplierName = order.getLogisticsProvider().getName();
                supplierSource = "物流供应商";
            } else if (order.getSupplier() != null && order.getSupplier().getName() != null) {
                supplierName = order.getSupplier().getName();
                supplierSource = "供应商";
            } else if (order.getDeliveryNo() != null && !order.getDeliveryNo().isEmpty()) {
                // 使用预加载的 Map
                SettlementOrder deliveryOrder = deliveryOrderMap.get(order.getDeliveryNo());
                if (deliveryOrder != null) {
                    if (deliveryOrder.getLogisticsProvider() != null && deliveryOrder.getLogisticsProvider().getName() != null) {
                        supplierName = deliveryOrder.getLogisticsProvider().getName();
                        supplierSource = "配送单-物流供应商";
                    } else if (deliveryOrder.getSupplier() != null && deliveryOrder.getSupplier().getName() != null) {
                        supplierName = deliveryOrder.getSupplier().getName();
                        supplierSource = "配送单-供应商";
                    }
                }
            } else if (order.getRelatedOrderNo() != null && !order.getRelatedOrderNo().isEmpty()) {
                // 使用预加载的 Map
                String[] orderNos = order.getRelatedOrderNo().split(",");
                if (orderNos.length > 0) {
                    PurchaseOrder po = purchaseOrderMap.get(orderNos[0].trim());
                    if (po != null && po.getSupplier() != null) {
                        supplierName = po.getSupplier().getName();
                        supplierSource = "采购单关联";
                    }
                }
            }
            
            map.put("supplierName", supplierName);
            map.put("supplierSource", supplierSource);
            
            // ... (其余字段保持不变)
            String settlementType = null;
            Integer settlementPeriod = null;
            
            if (order.getLogisticsProvider() != null) {
                if (order.getLogisticsProvider().getSettlementType() != null) {
                    settlementType = order.getLogisticsProvider().getSettlementType().name();
                }
                settlementPeriod = order.getLogisticsProvider().getSettlementPeriod();
            } else if (order.getSupplier() != null) {
                if (order.getSupplier().getSettlementType() != null) {
                    settlementType = order.getSupplier().getSettlementType().name();
                }
                settlementPeriod = order.getSupplier().getSettlementPeriod();
            }
            
            String settlementTypeCn = "现付";
            if ("PREPAYMENT".equals(settlementType)) settlementTypeCn = "预付";
            else if ("FISHERMAN".equals(settlementType)) settlementTypeCn = "渔户";
            else if ("MONTHLY".equals(settlementType)) settlementTypeCn = "月结";
            
            map.put("settlementType", settlementTypeCn);
            map.put("settlementPeriod", settlementPeriod);
            
            String statusCn = "待处理";
            if (order.getStatus() != null) {
                switch (order.getStatus()) {
                    case PENDING: statusCn = "待结算"; break;
                    case SETTLED: statusCn = "已结算"; break;
                    case PAID: statusCn = "已付款"; break;
                    case REVOKED: statusCn = "已撤回"; break;
                    case REJECTED: statusCn = "已拒回"; break;
                    default: statusCn = order.getStatus().name();
                }
            }
            map.put("status", statusCn);
            map.put("statusEnum", order.getStatus() != null ? order.getStatus().name() : null);
            map.put("relatedOrderNo", order.getRelatedOrderNo());
            map.put("auditor", order.getAuditor());
            map.put("auditTime", order.getAuditTime());
            
            map.put("costInvoiceAmount", order.getCostInvoiceAmount() != null ? order.getCostInvoiceAmount() : order.getTotalAmount());
            map.put("costInvoiceReceived", order.getCostInvoiceReceived() != null ? order.getCostInvoiceReceived() : BigDecimal.ZERO);
            map.put("costInvoiceStatus", order.getCostInvoiceStatus() != null ? order.getCostInvoiceStatus() : "未上传");
            
            return map;
        }).collect(java.util.stream.Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of("records", records, "total", pageResult.getTotalElements()));
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/pending-delivery/status")
    @Transactional
    public ResponseEntity<Map<String, Object>> updatePendingStatus(@RequestBody Map<String, Object> payload) {
        List<?> ids = (List<?>) payload.get("ids");
        String statusStr = (String) payload.get("status");
        
        SettlementOrder.Status status;
        try {
            status = SettlementOrder.Status.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            status = SettlementOrder.Status.SETTLED; // Default fallback
        }
        
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "ids cannot be empty"));
        }

        List<Long> longIds = ids.stream().map(id -> {
            if (id instanceof Integer) return ((Integer) id).longValue();
            if (id instanceof String) return Long.valueOf((String) id);
            if (id instanceof Long) return (Long) id;
            throw new IllegalArgumentException("Invalid ID type: " + (id != null ? id.getClass().getName() : "null"));
        }).collect(java.util.stream.Collectors.toList());

        List<SettlementOrder> orders = settlementOrderRepository.findAllById(longIds);
        
        for (SettlementOrder order : orders) {
            order.setStatus(status);
            order.setUpdatedAt(LocalDateTime.now());
            settlementOrderRepository.save(order);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Status updated successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/payee-accounts")
    public ResponseEntity<Map<String, Object>> getPayeeAccounts(@RequestParam List<Long> settlementOrderIds) {
        if (settlementOrderIds == null || settlementOrderIds.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        SettlementOrder firstOrder = settlementOrderRepository.findById(settlementOrderIds.get(0)).orElse(null);
        if (firstOrder == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> result = new HashMap<>();
        
        if (firstOrder.getLogisticsProvider() != null) {
            com.supplypro.entity.LogisticsProvider lp = firstOrder.getLogisticsProvider();
            result.put("payeeType", "logistics_provider");
            result.put("payeeId", lp.getId());
            result.put("payeeName", lp.getName());
            result.put("accounts", logisticsProviderAccountRepository.findByLogisticsProvider(lp));
        } else if (firstOrder.getSupplier() != null) {
            com.supplypro.entity.Supplier supplier = firstOrder.getSupplier();
            result.put("payeeType", "supplier");
            result.put("payeeId", supplier.getId());
            result.put("payeeName", supplier.getName());
            result.put("accounts", supplierAccountRepository.findBySupplier(supplier));
        } else {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", "Order has no valid payee"));
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/supplier")
    @Transactional
    public ResponseEntity<Map<String, Object>> createSupplierSettlement(@RequestBody Map<String, Object> payload) {
        Object supplierIdObj = payload.get("supplierId");
        Long supplierId;
        if (supplierIdObj instanceof Integer) {
            supplierId = ((Integer) supplierIdObj).longValue();
        } else if (supplierIdObj instanceof String) {
            supplierId = Long.valueOf((String) supplierIdObj);
        } else {
            supplierId = (Long) supplierIdObj;
        }
        
        String source = (String) payload.get("source");
        
        java.math.BigDecimal amount = java.math.BigDecimal.ZERO;
        Object amountObj = payload.get("amount");
        if (amountObj != null) {
            amount = new java.math.BigDecimal(amountObj.toString());
        }
        
        String createdBy = "admin"; // TODO: get user
        
        // 获取银行账户信息
        String payeeAccountType = (String) payload.get("payeeAccountType");
        String payeeAccountName = (String) payload.get("payeeAccountName");
        String payeeBank = (String) payload.get("payeeBank");
        String payeeAccount = (String) payload.get("payeeAccount");

        // 获取配送单信息
        String deliveryNo = null;
        String relatedOrderNo = null;
        java.util.List<Long> itemIds = new java.util.ArrayList<>();
        
        Object itemsObj = payload.get("items");
        if (itemsObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) itemsObj;
            if (!items.isEmpty()) {
                Map<String, Object> firstItem = items.get(0);
                deliveryNo = (String) firstItem.get("deliveryNo");
                relatedOrderNo = (String) firstItem.get("relatedOrderNo");
                
                // Extract item IDs for status update
                for (Map<String, Object> item : items) {
                    Object idObj = item.get("id");
                    if (idObj != null) {
                        if (idObj instanceof Integer) {
                            itemIds.add(((Integer) idObj).longValue());
                        } else if (idObj instanceof Long) {
                            itemIds.add((Long) idObj);
                        } else if (idObj instanceof String) {
                            itemIds.add(Long.valueOf((String) idObj));
                        }
                    }
                }
            }
        }
        
        SettlementOrder saved = null;
        
        // For Delivery or Purchase source, create new settlement record and link to items
        if (("Delivery".equals(source) || "Purchase".equals(source)) && !itemIds.isEmpty()) {
            // Find existing pending records
            List<SettlementOrder> deliveryOrders = settlementOrderRepository.findAllById(itemIds);
            
            if (deliveryOrders.isEmpty()) {
                // Fallback to creating new settlement if no existing records found
                saved = settlementService.createBatchSettlement(supplierId, source, amount, createdBy, deliveryNo, relatedOrderNo);
                
                // 更新新创建的结算单的银行信息
                saved.setPayeeAccountType(payeeAccountType);
                saved.setPayeeAccountName(payeeAccountName);
                saved.setPayeeBank(payeeBank);
                saved.setPayeeAccount(payeeAccount);
                saved = settlementOrderRepository.save(saved);
            } else {
                // Check if any of the delivery orders have already been settled
                for (SettlementOrder delivery : deliveryOrders) {
                    if (delivery.getStatus() != SettlementOrder.Status.PENDING) {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("code", 400);
                        errorResponse.put("message", "配送单 " + delivery.getDeliveryNo() + " 已经结算，不能重复结算");
                        return ResponseEntity.badRequest().body(errorResponse);
                    }
                    if (delivery.getSettlementNo() != null && !delivery.getSettlementNo().isEmpty()) {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("code", 400);
                        errorResponse.put("message", "配送单 " + delivery.getDeliveryNo() + " 已关联结算单 " + delivery.getSettlementNo() + "，不能重复结算");
                        return ResponseEntity.badRequest().body(errorResponse);
                    }
                }
                
                // NEW ARCHITECTURE: Create a new settlement record, link to delivery/purchase orders
                // Sort by ID to be deterministic
                deliveryOrders.sort(java.util.Comparator.comparing(SettlementOrder::getId));
                
                // Calculate total amounts from delivery orders
                java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;
                java.math.BigDecimal netAmount = java.math.BigDecimal.ZERO;
                java.math.BigDecimal taxAmount = java.math.BigDecimal.ZERO;
                
                StringBuilder relatedOrderNoBuilder = new StringBuilder();
                StringBuilder deliveryNoBuilder = new StringBuilder();
                List<Long> deliveryIdList = new java.util.ArrayList<>();
                
                for (SettlementOrder delivery : deliveryOrders) {
                    // Sum amounts
                    totalAmount = totalAmount.add(delivery.getTotalAmount() != null ? delivery.getTotalAmount() : java.math.BigDecimal.ZERO);
                    if (delivery.getNetAmount() != null) netAmount = netAmount.add(delivery.getNetAmount());
                    if (delivery.getTaxAmount() != null) taxAmount = taxAmount.add(delivery.getTaxAmount());
                    
                    // Merge Related Order Nos
                    if (delivery.getRelatedOrderNo() != null && !delivery.getRelatedOrderNo().isEmpty()) {
                        if (relatedOrderNoBuilder.length() > 0) relatedOrderNoBuilder.append(",");
                        relatedOrderNoBuilder.append(delivery.getRelatedOrderNo());
                    }
                    
                    // Merge Delivery Nos
                    if (delivery.getDeliveryNo() != null && !delivery.getDeliveryNo().isEmpty()) {
                        if (deliveryNoBuilder.length() > 0) deliveryNoBuilder.append(",");
                        deliveryNoBuilder.append(delivery.getDeliveryNo());
                    }
                    
                    // Collect delivery IDs
                    deliveryIdList.add(delivery.getId());
                }
                
                // Create NEW settlement record (not modifying delivery orders)
                SettlementOrder newSettlement = new SettlementOrder();
                
                // Retry mechanism for handling concurrent settlement number generation
                int maxRetries = 3;
                Exception lastException = null;
                
                for (int retry = 0; retry < maxRetries; retry++) {
                    String settlementNo = settlementService.generateSettlementNo();
                    
                    // Double-check uniqueness before saving
                    if (settlementOrderRepository.findBySettlementNo(settlementNo) != null) {
                        continue; // Retry with new number
                    }
                    
                    newSettlement.setSettlementNo(settlementNo);
                    newSettlement.setStatus(SettlementOrder.Status.PENDING);
                    
                    if ("Purchase".equals(source)) {
                        newSettlement.setType(SettlementOrder.Type.PURCHASE);
                        newSettlement.setSourceType("采购单");
                    } else {
                        newSettlement.setType(SettlementOrder.Type.LOGISTICS);
                        newSettlement.setSourceType("配送单");
                    }
                    
                    newSettlement.setCreatedAt(LocalDateTime.now());
                    newSettlement.setUpdatedAt(LocalDateTime.now());
                    newSettlement.setCreatedBy(createdBy);
                    
                    newSettlement.setTotalAmount(totalAmount);
                    newSettlement.setNetAmount(netAmount);
                    newSettlement.setTaxAmount(taxAmount);
                    
                    newSettlement.setRelatedOrderNo(relatedOrderNoBuilder.toString());
                    newSettlement.setDeliveryNo(deliveryNoBuilder.toString());
                    
                    // Store delivery IDs as JSON
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        newSettlement.setDeliveryIds(mapper.writeValueAsString(deliveryIdList));
                    } catch (Exception e) {
                        // Fallback: store as comma-separated string
                        newSettlement.setDeliveryIds(deliveryIdList.stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse(""));
                    }
                    
                    // Set supplier/logistics provider from first delivery
                    SettlementOrder firstItem = deliveryOrders.get(0);
                    if (firstItem.getLogisticsProvider() != null) {
                        newSettlement.setLogisticsProvider(firstItem.getLogisticsProvider());
                    } else if (firstItem.getSupplier() != null) {
                        newSettlement.setSupplier(firstItem.getSupplier());
                    }
                    
                    // 保存银行账户信息
                    newSettlement.setPayeeAccountType(payeeAccountType);
                    newSettlement.setPayeeAccountName(payeeAccountName);
                    newSettlement.setPayeeBank(payeeBank);
                    newSettlement.setPayeeAccount(payeeAccount);
                    
                    try {
                        saved = settlementOrderRepository.save(newSettlement);
                        
                        // Update delivery orders status to SETTLED so they won't appear in pending list
                        // Note: Do NOT set settlement_no on delivery orders as it has unique constraint
                        // Delivery orders are linked to settlement via delivery_ids field in the settlement record
                        for (SettlementOrder delivery : deliveryOrders) {
                            delivery.setStatus(SettlementOrder.Status.SETTLED);
                            delivery.setUpdatedAt(LocalDateTime.now());
                            settlementOrderRepository.save(delivery);
                        }
                        
                        // Success, break out of retry loop
                        break;
                    } catch (org.springframework.dao.DataIntegrityViolationException e) {
                        // Duplicate key exception - retry with new settlement number
                        lastException = e;
                        if (retry < maxRetries - 1) {
                            // Reset for next retry
                            newSettlement = new SettlementOrder();
                            continue;
                        }
                        throw new RuntimeException("Failed to create settlement after " + maxRetries + " retries due to duplicate settlement number", e);
                    }
                }
                
                if (saved == null && lastException != null) {
                    throw new RuntimeException("Failed to create settlement", lastException);
                }
            }
        } else {
            // For other sources, create new settlement
            saved = settlementService.createBatchSettlement(supplierId, source, amount, createdBy, deliveryNo, relatedOrderNo);
            
            // 更新新创建的结算单的银行信息
            saved.setPayeeAccountType(payeeAccountType);
            saved.setPayeeAccountName(payeeAccountName);
            saved.setPayeeBank(payeeBank);
            saved.setPayeeAccount(payeeAccount);
            saved = settlementOrderRepository.save(saved);
        }
        
        // Convert to Map for Chinese Translation
        Map<String, Object> savedMap = new HashMap<>();
        savedMap.put("id", saved.getId());
        savedMap.put("settlementNo", saved.getSettlementNo());
        savedMap.put("totalAmount", saved.getTotalAmount());
        savedMap.put("status", saved.getStatus());
        savedMap.put("createdAt", saved.getCreatedAt());
        savedMap.put("sourceType", saved.getSourceType()); // 来源类型
        savedMap.put("settlementPeriod", saved.getSettlementPeriod()); // 结算周期
        
        String typeCn = "采购结算";
        if (saved.getType() == SettlementOrder.Type.LOGISTICS) {
            typeCn = "配送单";
        }
        savedMap.put("type", typeCn);
        
        if (saved.getSupplier() != null) {
            savedMap.put("supplierName", saved.getSupplier().getName());
            savedMap.put("supplierId", saved.getSupplier().getId());
        } else if (saved.getLogisticsProvider() != null) {
            savedMap.put("supplierName", saved.getLogisticsProvider().getName());
            savedMap.put("supplierId", saved.getLogisticsProvider().getId());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Batch Settlement created successfully");
        response.put("data", savedMap);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate")
    public ApiResponse<SettlementOrder> generate(@RequestBody Map<String, Object> payload) {
        // Safe casting for supplierId
        Object supplierIdObj = payload.get("supplierId");
        Long supplierId;
        if (supplierIdObj == null) {
            throw new IllegalArgumentException("supplierId cannot be null");
        }
        if (supplierIdObj instanceof Integer) {
            supplierId = ((Integer) supplierIdObj).longValue();
        } else if (supplierIdObj instanceof String) {
            supplierId = Long.valueOf((String) supplierIdObj);
        } else {
            supplierId = (Long) supplierIdObj;
        }

        List<?> orderIdsRaw = (List<?>) payload.get("orderIds");
        if (orderIdsRaw == null) {
             throw new IllegalArgumentException("orderIds cannot be null");
        }
        List<Long> orderIds = orderIdsRaw.stream().map(id -> {
            if (id instanceof Integer) return ((Integer) id).longValue();
            if (id instanceof String) return Long.valueOf((String) id);
            return (Long) id;
        }).collect(java.util.stream.Collectors.toList());
        
        String createdBy = "admin"; // TODO: get user
        
        return ApiResponse.success(settlementService.createSettlement(supplierId, orderIds, createdBy));
    }

    @PostMapping("/{id}/pay")
    public ApiResponse<?> pay(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String method = (String) payload.get("paymentMethod");
        String proof = (String) payload.get("paymentProof");
        String operator = "admin";
        settlementService.paySettlement(id, method, proof, operator);
        return ApiResponse.success("Paid successfully", null);
    }

    @PostMapping("/migrate-fix-unknown-suppliers")
    @Transactional
    public ResponseEntity<Map<String, Object>> migrateFixUnknownSuppliers() {
        Map<String, Object> report = new HashMap<>();
        List<Map<String, Object>> fixedRecords = new ArrayList<>();
        int totalFixed = 0;
        int totalUnfixed = 0;
        
        // 查找所有没有供应商信息的结算单
        List<SettlementOrder> ordersWithoutSupplier = settlementOrderRepository.findAll().stream()
            .filter(o -> o.getSupplier() == null && o.getLogisticsProvider() == null)
            .collect(java.util.stream.Collectors.toList());
        
        for (SettlementOrder order : ordersWithoutSupplier) {
            Map<String, Object> recordReport = new HashMap<>();
            recordReport.put("id", order.getId());
            recordReport.put("settlementNo", order.getSettlementNo());
            recordReport.put("type", order.getType());
            
            boolean fixed = false;
            
            // 尝试通过配送单号获取供应商信息
            if (order.getDeliveryNo() != null && !order.getDeliveryNo().isEmpty()) {
                // 查找同配送单号的其他结算单（有供应商信息的）
                SettlementOrder deliveryOrder = settlementOrderRepository.findByDeliveryNo(order.getDeliveryNo());
                if (deliveryOrder != null && deliveryOrder.getId() != order.getId()) {
                    if (deliveryOrder.getLogisticsProvider() != null) {
                        order.setLogisticsProvider(deliveryOrder.getLogisticsProvider());
                        fixed = true;
                        recordReport.put("fixedBy", "配送单关联-物流供应商");
                        recordReport.put("supplierName", deliveryOrder.getLogisticsProvider().getName());
                    } else if (deliveryOrder.getSupplier() != null) {
                        order.setSupplier(deliveryOrder.getSupplier());
                        fixed = true;
                        recordReport.put("fixedBy", "配送单关联-供应商");
                        recordReport.put("supplierName", deliveryOrder.getSupplier().getName());
                    }
                }
            }
            
            // 尝试通过采购单号获取供应商信息
            if (!fixed && order.getRelatedOrderNo() != null && !order.getRelatedOrderNo().isEmpty()) {
                String[] orderNos = order.getRelatedOrderNo().split(",");
                if (orderNos.length > 0) {
                    try {
                        PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNos[0].trim());
                        if (po != null && po.getSupplier() != null) {
                            order.setSupplier(po.getSupplier());
                            fixed = true;
                            recordReport.put("fixedBy", "采购单关联");
                            recordReport.put("supplierName", po.getSupplier().getName());
                        }
                    } catch (Exception e) {
                        // 忽略异常
                    }
                }
            }
            
            if (fixed) {
                settlementOrderRepository.save(order);
                totalFixed++;
                recordReport.put("status", "已修复");
            } else {
                totalUnfixed++;
                recordReport.put("status", "无法修复");
            }
            
            fixedRecords.add(recordReport);
        }
        
        report.put("totalScanned", ordersWithoutSupplier.size());
        report.put("totalFixed", totalFixed);
        report.put("totalUnfixed", totalUnfixed);
        report.put("fixedRecords", fixedRecords);
        report.put("timestamp", java.time.LocalDateTime.now().toString());
        
        return ResponseEntity.ok(report);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        SettlementOrder settlement = settlementOrderRepository.findById(id).orElse(null);
        if (settlement == null) {
            response.put("code", 404);
            response.put("message", "结算单不存在");
            return ResponseEntity.status(404).body(response);
        }
        
        // 记录删除信息
        String settlementNo = settlement.getSettlementNo();
        String relatedOrderNo = settlement.getRelatedOrderNo();
        java.math.BigDecimal amount = settlement.getTotalAmount();
        SettlementOrder.Type type = settlement.getType();
        
        // 删除结算单
        settlementOrderRepository.delete(settlement);
        
        // 更新关联采购单的结算状态
        if (type == SettlementOrder.Type.LOGISTICS && relatedOrderNo != null) {
            PurchaseOrder po = purchaseOrderRepository.findByOrderNo(relatedOrderNo);
            if (po != null) {
                po.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
                purchaseOrderRepository.save(po);
                
                // 添加操作日志
                PurchaseOrderLog log = new PurchaseOrderLog();
                log.setPurchaseOrderId(po.getId());
                log.setOperationType("SETTLEMENT_DELETE");
                log.setOperator("admin");
                log.setRemark("删除系统自动生成的结算单 " + settlementNo + "，金额：" + amount);
                log.setCreatedAt(LocalDateTime.now());
                purchaseOrderLogRepository.save(log);
            }
        }
        
        response.put("code", 200);
        response.put("message", "删除成功");
        response.put("deletedSettlementNo", settlementNo);
        response.put("deletedAmount", amount);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@RequestBody SettlementOrder settlementOrder) {
        settlementOrder.setSettlementNo("SET-" + System.currentTimeMillis());
        settlementOrder.setStatus(SettlementOrder.Status.PENDING);
        settlementOrder.setCreatedAt(LocalDateTime.now());
        
        SettlementOrder saved = settlementOrderRepository.save(settlementOrder);
        
        // Update related order status if needed
        if (settlementOrder.getType() == SettlementOrder.Type.PURCHASE && settlementOrder.getRelatedOrderNo() != null) {
             PurchaseOrder po = purchaseOrderRepository.findByOrderNo(settlementOrder.getRelatedOrderNo());
             if (po != null) {
                 po.setSettlementStatus(PurchaseOrder.SettlementStatus.PARTIALLY_SETTLED); // Or SETTLED based on amount
                 purchaseOrderRepository.save(po);
             }
        } else if (settlementOrder.getType() == SettlementOrder.Type.LOGISTICS && settlementOrder.getRelatedOrderNo() != null) {
             OutboundOrder oo = outboundOrderRepository.findByOutboundNo(settlementOrder.getRelatedOrderNo());
             if (oo != null) {
                 oo.setSettlementStatus(OutboundOrder.SettlementStatus.PARTIALLY_SETTLED);
                 outboundOrderRepository.save(oo);
             }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable long id) {
        return settlementOrderRepository.findById(id).map(order -> {
            Supplier supplier = order.getSupplier();
            LogisticsProvider logisticsProvider = order.getLogisticsProvider();

            if (logisticsProvider != null && logisticsProvider.getSettlementType() == LogisticsProvider.SettlementType.PREPAYMENT) {
                BigDecimal prepaymentBalance = logisticsProvider.getPrepaymentBalance();
                if (prepaymentBalance == null) {
                    prepaymentBalance = BigDecimal.ZERO;
                }
                if (prepaymentBalance.compareTo(order.getTotalAmount()) < 0) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("code", 500);
                    errorResponse.put("message", "物流供应商预付款余额不足，无法进行预付款扣款操作");
                    return ResponseEntity.status(500).body(errorResponse);
                }
                supplierFinanceService.deductLogistics(
                    logisticsProvider.getId(),
                    order.getTotalAmount(),
                    order.getSettlementNo(),
                    "物流供应商结算",
                    null
                );
                order.setStatus(SettlementOrder.Status.PAID);
                order.setPaymentDate(LocalDateTime.now());
                settlementOrderRepository.save(order);
            } else if (supplier != null && supplier.getSettlementType() == Supplier.SettlementType.PREPAYMENT) {
                BigDecimal prepaymentBalance = supplier.getPrepaymentBalance();
                if (prepaymentBalance == null) {
                    prepaymentBalance = BigDecimal.ZERO;
                }
                if (prepaymentBalance.compareTo(order.getTotalAmount()) < 0) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("code", 500);
                    errorResponse.put("message", "供应商预付款余额不足，无法进行预付款扣款操作");
                    return ResponseEntity.status(500).body(errorResponse);
                }
                supplierFinanceService.deduct(
                    supplier.getId(),
                    order.getTotalAmount(),
                    order.getSettlementNo(),
                    "供应商结算",
                    null
                );
                order.setStatus(SettlementOrder.Status.PAID);
                order.setPaymentDate(LocalDateTime.now());
                settlementOrderRepository.save(order);
            } else {
                order.setStatus(SettlementOrder.Status.SETTLED);
                order.setPaymentDate(LocalDateTime.now());
                settlementOrderRepository.save(order);

                if (order.getType() == SettlementOrder.Type.PURCHASE && order.getRelatedOrderNo() != null) {
                    PurchaseOrder po = purchaseOrderRepository.findByOrderNo(order.getRelatedOrderNo());
                    if (po != null) {
                        po.setSettlementStatus(PurchaseOrder.SettlementStatus.SETTLED);
                        purchaseOrderRepository.save(po);
                    }
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Confirmed successfully");
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping("/batch-release-revoked")
    @Transactional
    public ResponseEntity<Map<String, Object>> batchReleaseRevokedSettlements() {
        Map<String, Object> report = new HashMap<>();
        List<Map<String, Object>> successRecords = new ArrayList<>();
        List<Map<String, Object>> errorRecords = new ArrayList<>();
        int totalProcessed = 0;
        int totalSuccess = 0;
        int totalError = 0;
        
        try {
            // 查找所有状态为REVOKED的结算单
            List<SettlementOrder> revokedSettlements = settlementOrderRepository.findByStatus(SettlementOrder.Status.REVOKED, Pageable.unpaged()).getContent();
            totalProcessed = revokedSettlements.size();
            
            for (SettlementOrder settlement : revokedSettlements) {
                try {
                    // 释放关联的待结算配送单
                    if (settlement.getDeliveryNo() != null && !settlement.getDeliveryNo().isEmpty()) {
                        // 处理配送单号，可能是多个，用逗号分隔
                        String[] deliveryNos = settlement.getDeliveryNo().split(",");
                        for (String deliveryNo : deliveryNos) {
                            // 查找关联的待结算配送单
                            List<SettlementOrder> deliveryOrders = settlementOrderRepository.findByDeliveryNoContaining(deliveryNo.trim());
                            for (SettlementOrder deliveryOrder : deliveryOrders) {
                                // 将待结算配送单状态改回PENDING，并清除settlementNo以便在待结算列表中显示
                                if (deliveryOrder.getType() == SettlementOrder.Type.LOGISTICS) {
                                    deliveryOrder.setStatus(SettlementOrder.Status.PENDING);
                                    deliveryOrder.setSettlementNo(null); // 清除结算单号，使其重新出现在待结算列表中
                                    deliveryOrder.setUpdatedAt(LocalDateTime.now());
                                    settlementOrderRepository.save(deliveryOrder);
                                    
                                    // 记录成功释放的配送单
                                    Map<String, Object> successRecord = new HashMap<>();
                                    successRecord.put("deliveryNo", deliveryOrder.getDeliveryNo());
                                    successRecord.put("settlementNo", settlement.getSettlementNo());
                                    successRecord.put("status", "RELEASED");
                                    successRecords.add(successRecord);
                                    totalSuccess++;
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    // 记录异常情况
                    Map<String, Object> errorRecord = new HashMap<>();
                    errorRecord.put("settlementNo", settlement.getSettlementNo());
                    errorRecord.put("error", e.getMessage());
                    errorRecords.add(errorRecord);
                    totalError++;
                }
            }
            
            // 构建报告
            report.put("totalProcessed", totalProcessed);
            report.put("totalSuccess", totalSuccess);
            report.put("totalError", totalError);
            report.put("successRecords", successRecords);
            report.put("errorRecords", errorRecords);
            report.put("message", "批量释放已撤回结算单关联的配送单完成");
            report.put("timestamp", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            // 全局异常处理
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "批量处理失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping("/fix-revoked-settlements")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixRevokedSettlements() {
        Map<String, Object> report = new HashMap<>();
        List<Map<String, Object>> successRecords = new ArrayList<>();
        List<Map<String, Object>> errorRecords = new ArrayList<>();
        int totalProcessed = 0;
        int totalSuccess = 0;
        int totalError = 0;
        
        try {
            // 查找所有状态为REVOKED的结算单
            List<SettlementOrder> revokedSettlements = settlementOrderRepository.findByStatus(SettlementOrder.Status.REVOKED, Pageable.unpaged()).getContent();
            totalProcessed = revokedSettlements.size();
            
            for (SettlementOrder settlement : revokedSettlements) {
                try {
                    // 处理关联的配送单
                    if (settlement.getDeliveryNo() != null && !settlement.getDeliveryNo().isEmpty()) {
                        // 处理配送单号，可能是多个，用逗号分隔
                        String[] deliveryNos = settlement.getDeliveryNo().split(",");
                        for (String deliveryNo : deliveryNos) {
                            // 查找关联的配送单（包括所有状态）
                            List<SettlementOrder> deliveryOrders = settlementOrderRepository.findByDeliveryNoContaining(deliveryNo.trim());
                            for (SettlementOrder deliveryOrder : deliveryOrders) {
                                // 只处理物流类型的配送单
                                if (deliveryOrder.getType() == SettlementOrder.Type.LOGISTICS) {
                                    // 确保状态为PENDING，并且清除settlementNo
                                    deliveryOrder.setStatus(SettlementOrder.Status.PENDING);
                                    deliveryOrder.setSettlementNo(null); // 清除结算单号，使其重新出现在待结算列表中
                                    deliveryOrder.setUpdatedAt(LocalDateTime.now());
                                    settlementOrderRepository.save(deliveryOrder);
                                    
                                    // 记录成功修复的配送单
                                    Map<String, Object> successRecord = new HashMap<>();
                                    successRecord.put("deliveryNo", deliveryOrder.getDeliveryNo());
                                    successRecord.put("settlementNo", settlement.getSettlementNo());
                                    successRecord.put("status", "FIXED");
                                    successRecords.add(successRecord);
                                    totalSuccess++;
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    // 记录异常情况
                    Map<String, Object> errorRecord = new HashMap<>();
                    errorRecord.put("settlementNo", settlement.getSettlementNo());
                    errorRecord.put("error", e.getMessage());
                    errorRecords.add(errorRecord);
                    totalError++;
                }
            }
            
            // 构建报告
            report.put("totalProcessed", totalProcessed);
            report.put("totalSuccess", totalSuccess);
            report.put("totalError", totalError);
            report.put("successRecords", successRecords);
            report.put("errorRecords", errorRecords);
            report.put("message", "修复已撤销结算单关联的配送单完成");
            report.put("timestamp", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            // 全局异常处理
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "修复处理失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @GetMapping("/fix-revoked-settlements-simple")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixRevokedSettlementsSimple() {
        Map<String, Object> report = new HashMap<>();
        int totalProcessed = 0;
        int totalSuccess = 0;
        
        try {
            // 查找所有状态为REVOKED的结算单
            List<SettlementOrder> revokedSettlements = settlementOrderRepository.findByStatus(SettlementOrder.Status.REVOKED, Pageable.unpaged()).getContent();
            totalProcessed = revokedSettlements.size();
            
            for (SettlementOrder settlement : revokedSettlements) {
                if (settlement.getDeliveryNo() != null && !settlement.getDeliveryNo().isEmpty()) {
                    // 处理配送单号，可能是多个，用逗号分隔
                    String[] deliveryNos = settlement.getDeliveryNo().split(",");
                    for (String deliveryNo : deliveryNos) {
                        String trimmedDn = deliveryNo.trim();
                        if (!trimmedDn.isEmpty()) {
                            // 查找关联的配送单
                            List<SettlementOrder> deliveryOrders = settlementOrderRepository.findByDeliveryNoContaining(trimmedDn);
                            for (SettlementOrder deliveryOrder : deliveryOrders) {
                                if (deliveryOrder.getType() == SettlementOrder.Type.LOGISTICS) {
                                    deliveryOrder.setStatus(SettlementOrder.Status.PENDING);
                                    deliveryOrder.setSettlementNo(null);
                                    deliveryOrder.setUpdatedAt(LocalDateTime.now());
                                    settlementOrderRepository.save(deliveryOrder);
                                    totalSuccess++;
                                }
                            }
                        }
                    }
                }
            }
            
            report.put("totalProcessed", totalProcessed);
            report.put("totalSuccess", totalSuccess);
            report.put("message", "修复已撤销结算单关联的配送单完成");
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "修复处理失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @GetMapping("/delivery/{deliveryNo}")
    public ResponseEntity<Map<String, Object>> getDeliveryOrderDetail(@PathVariable String deliveryNo) {
        // Use containing search to handle merged delivery numbers (e.g., "PS1,PS2")
        List<SettlementOrder> orders = settlementOrderRepository.findByDeliveryNoContaining(deliveryNo);
        
        if (orders == null || orders.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Pick the best match or the first one
        // Ideally, we want exact match if possible, but with merged strings "PS1,PS2", "PS1" is a substring.
        // If we have "PS1" and "PS10", searching "PS1" matches both.
        // We should filter for exact token match if strictness is required, but for now take first.
        SettlementOrder order = orders.get(0);
        
        Map<String, Object> result = new HashMap<>();
        result.put("deliveryNo", order.getDeliveryNo());
        result.put("settlementNo", order.getSettlementNo());
        result.put("relatedOrderNo", order.getRelatedOrderNo());
        result.put("deliveryMethod", order.getDeliveryMethod());
        result.put("totalAmount", order.getTotalAmount());
        result.put("status", order.getStatus());
        result.put("createdAt", order.getCreatedAt());
        result.put("sourceType", order.getSourceType());
        
        result.put("trackingNumber", order.getTrackingNo());
        result.put("logisticsCompany", order.getLogisticsCompany());
        
        // 获取关联的采购单信息（处理多个采购单号用逗号分隔的情况）
        if (order.getRelatedOrderNo() != null) {
            // 获取所有关联的采购单
            Set<String> allOrderNos = new java.util.HashSet<>();
            String[] orderNoArray = order.getRelatedOrderNo().split(",");
            for (String orderNo : orderNoArray) {
                allOrderNos.add(orderNo.trim());
            }
            
            List<PurchaseOrder> pos = purchaseOrderRepository.findByOrderNoIn(new ArrayList<>(allOrderNos));
            Map<String, PurchaseOrder> poMap = pos.stream()
                    .collect(java.util.stream.Collectors.toMap(PurchaseOrder::getOrderNo, po -> po));
            
            // 获取第一个有效的采购单
            PurchaseOrder po = getFirstValidPurchaseOrder(order.getRelatedOrderNo(), poMap);
            if (po != null) {
                result.put("trackingNumber", po.getTrackingNumber());
                result.put("logisticsCompany", po.getLogisticsCompany());
                result.put("shippedAt", po.getShippedAt());
                result.put("deliverer", po.getDeliverer());
                result.put("delivererPhone", po.getDelivererPhone());
                result.put("plateNumber", po.getPlateNumber());
                result.put("currentLocation", po.getCurrentLocation());
                // 收货地址信息（省、市、县、详细地址）
                result.put("receiverProvince", po.getProvince());
                result.put("receiverCity", po.getCity());
                result.put("receiverDistrict", po.getDistrict());
                result.put("receiverAddress", po.getDetailAddress());
                result.put("logisticsSupplierName", po.getLogisticsCompany());
                // 采购单收货状态（用于显示配送单状态）
                result.put("purchaseOrderStatus", po.getStatus() != null ? po.getStatus().name() : null);
                // 增加发货凭证 (Prioritize shippingProof, fallback to attachments for legacy)
                result.put("attachments", po.getShippingProof() != null ? po.getShippingProof() : po.getAttachments());
            }
        }
        
        // 获取供应商/物流商信息
        if (order.getLogisticsProvider() != null) {
            result.put("supplierName", order.getLogisticsProvider().getName());
        } else if (order.getSupplier() != null) {
            result.put("supplierName", order.getSupplier().getName());
        } else {
            // Fallback: If no provider linked directly to Settlement, try to infer from PO
            if (order.getRelatedOrderNo() != null) {
                // We need to fetch PO here again if not fetched or use the one fetched above.
                // The logic above fetched 'po' based on getFirstValidPurchaseOrder.
                // But 'po' variable scope is inside the if block.
                // Refactor to lift 'po' scope or re-fetch.
                // Re-fetching is simpler for now, but inefficient.
                // Better to reuse the logic.
                
                Set<String> allOrderNos = new java.util.HashSet<>();
                String[] orderNoArray = order.getRelatedOrderNo().split(",");
                for (String orderNo : orderNoArray) {
                    allOrderNos.add(orderNo.trim());
                }
                List<PurchaseOrder> pos = purchaseOrderRepository.findByOrderNoIn(new ArrayList<>(allOrderNos));
                Map<String, PurchaseOrder> poMap = pos.stream().collect(java.util.stream.Collectors.toMap(PurchaseOrder::getOrderNo, p -> p));
                PurchaseOrder po = getFirstValidPurchaseOrder(order.getRelatedOrderNo(), poMap);
                
                if (po != null && po.getSupplier() != null) {
                    result.put("supplierName", po.getSupplier().getName());
                } else {
                    result.put("supplierName", "Unknown Provider");
                }
            } else {
                result.put("supplierName", "Unknown Provider");
            }
        }
        
        // Translate Status to Chinese
        if (order.getStatus() != null) {
            String statusCn = "待处理";
            switch (order.getStatus()) {
                case PENDING: statusCn = "待结算"; break;
                case SETTLED: statusCn = "已结算"; break;
                case PAID: statusCn = "已付款"; break;
                case REVOKED: statusCn = "已撤回"; break;
                case REJECTED: statusCn = "已拒回"; break;
                default: statusCn = order.getStatus().name();
            }
            result.put("status", statusCn);
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/delivery/{deliveryNo}/fix-logistics")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixDeliveryLogisticsInfo(@PathVariable String deliveryNo, @RequestBody Map<String, Object> payload) {
        SettlementOrder order = settlementOrderRepository.findByDeliveryNo(deliveryNo);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        
        String newLogisticsCompany = (String) payload.get("logisticsCompany");
        String newLogisticsSupplierName = (String) payload.get("logisticsSupplierName");
        
        // Update the related purchase order's logistics info
        if (order.getRelatedOrderNo() != null) {
            String[] orderNos = order.getRelatedOrderNo().split(",");
            for (String orderNo : orderNos) {
                PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNo.trim());
                if (po != null) {
                    if (newLogisticsCompany != null) {
                        po.setLogisticsCompany(newLogisticsCompany);
                    }
                    if (newLogisticsSupplierName != null) {
                        po.setLogisticsSupplierName(newLogisticsSupplierName);
                    }
                    purchaseOrderRepository.save(po);
                }
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Delivery logistics info fixed successfully");
        response.put("data", Map.of(
            "deliveryNo", deliveryNo,
            "logisticsCompany", newLogisticsCompany,
            "logisticsSupplierName", newLogisticsSupplierName
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/manual-delivery/{poId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> manualCreateDeliverySettlement(@PathVariable Long poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
            .orElseThrow(() -> new RuntimeException("Purchase Order not found: " + poId));
        
        java.math.BigDecimal logisticsFee = po.getLogisticsFee();
        if (logisticsFee == null || logisticsFee.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", "物流费用必须大于0才能创建待结算配送单");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        List<SettlementOrder> existingSettlements = settlementOrderRepository.findByRelatedOrderNoAndType(
            po.getOrderNo(), SettlementOrder.Type.LOGISTICS);
        if (existingSettlements != null && !existingSettlements.isEmpty()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", "该采购单已存在待结算配送单");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        SettlementOrder settlement = new SettlementOrder();
        settlement.setType(SettlementOrder.Type.LOGISTICS);
        settlement.setSourceType("配送单");
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setTotalAmount(logisticsFee);
        
        java.math.BigDecimal netAmount = logisticsFee.divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
        java.math.BigDecimal taxAmount = logisticsFee.subtract(netAmount);
        settlement.setNetAmount(netAmount);
        settlement.setTaxAmount(taxAmount);
        
        settlement.setRelatedOrderNo(po.getOrderNo());
        settlement.setDeliveryMethod(po.getDeliveryMethod());
        
        String deliveryNo = "PS" + java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(java.time.LocalDateTime.now()) + String.format("%03d", new java.util.Random().nextInt(1000));
        settlement.setDeliveryNo(deliveryNo);
        
        String settlementNo = "JS" + java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(java.time.LocalDateTime.now()) + String.format("%03d", new java.util.Random().nextInt(1000));
        settlement.setSettlementNo(settlementNo);
        
        settlement.setCreatedAt(java.time.LocalDateTime.now());
        settlement.setCreatedBy("ADMIN_MANUAL_BACKFILL");
        
        if (po.getLogisticsProvider() != null) {
            settlement.setLogisticsProvider(po.getLogisticsProvider());
        } else if (po.getSupplier() != null) {
            settlement.setSupplier(po.getSupplier());
        }
        
        SettlementOrder savedSettlement = settlementOrderRepository.save(settlement);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "待结算配送单创建成功");
        response.put("data", convertSettlementToMap(savedSettlement));
        return ResponseEntity.ok(response);
    }
    
    private Map<String, Object> convertSettlementToMap(SettlementOrder order) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", order.getId());
        map.put("settlementNo", order.getSettlementNo());
        map.put("deliveryNo", order.getDeliveryNo());
        map.put("type", order.getType());
        map.put("sourceType", order.getSourceType());
        map.put("status", order.getStatus());
        map.put("totalAmount", order.getTotalAmount());
        map.put("netAmount", order.getNetAmount());
        map.put("taxAmount", order.getTaxAmount());
        map.put("relatedOrderNo", order.getRelatedOrderNo());
        
        if (order.getSupplier() != null) {
            Map<String, Object> supplierMap = new HashMap<>();
            supplierMap.put("id", order.getSupplier().getId());
            supplierMap.put("name", order.getSupplier().getName());
            map.put("supplier", supplierMap);
        }
        
        if (order.getLogisticsProvider() != null) {
            Map<String, Object> lpMap = new HashMap<>();
            lpMap.put("id", order.getLogisticsProvider().getId());
            lpMap.put("name", order.getLogisticsProvider().getName());
            map.put("logisticsProvider", lpMap);
        }
        
        return map;
    }

    @DeleteMapping("/history")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteHistorySettlements(@RequestBody Map<String, Object> payload) {
        String confirmToken = (String) payload.get("confirmToken");
        if (!"DELETE_ALL_SETTLEMENTS_CONFIRMED".equals(confirmToken)) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", "Invalid confirmation token. Operation aborted.");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        LocalDateTime startTime = LocalDateTime.now();
        Map<String, Object> report = new HashMap<>();
        report.put("operation", "DELETE_ALL_SETTLEMENTS");
        report.put("startTime", startTime.toString());
        
        long totalBefore = settlementOrderRepository.count();
        report.put("totalRecordsBefore", totalBefore);
        
        long pendingCount = settlementOrderRepository.findAll().stream()
            .filter(o -> o.getStatus() == SettlementOrder.Status.PENDING)
            .count();
        long settledCount = settlementOrderRepository.findAll().stream()
            .filter(o -> o.getStatus() == SettlementOrder.Status.SETTLED)
            .count();
        long completedCount = settlementOrderRepository.findAll().stream()
            .filter(o -> o.getStatus() == SettlementOrder.Status.PAID)
            .count();
        long otherCount = totalBefore - pendingCount - settledCount - completedCount;
        
        report.put("pendingCount", pendingCount);
        report.put("settledCount", settledCount);
        report.put("completedCount", completedCount);
        report.put("otherCount", otherCount);
        
        settlementOrderRepository.deleteAll();
        
        long totalAfter = settlementOrderRepository.count();
        report.put("totalRecordsAfter", totalAfter);
        report.put("deletedCount", totalBefore - totalAfter);
        
        LocalDateTime endTime = LocalDateTime.now();
        report.put("endTime", endTime.toString());
        report.put("durationMs", java.time.Duration.between(startTime, endTime).toMillis());
        report.put("operator", "ADMIN");
        report.put("status", "SUCCESS");
        
        return ResponseEntity.ok(report);
    }

    @GetMapping("/no/{settlementNo}")
    public ResponseEntity<Map<String, Object>> getSettlementDetailByNo(@PathVariable String settlementNo) {
        SettlementOrder order = settlementOrderRepository.findBySettlementNo(settlementNo);
        if (order == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 404);
            errorResponse.put("message", "结算单不存在或已被删除");
            return ResponseEntity.status(404).body(errorResponse);
        }
        
        Map<String, Object> result = buildSettlementDetailMap(order);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", result);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<Map<String, Object>> getSettlementDetail(@PathVariable Long id) {
        SettlementOrder order = settlementOrderRepository.findById(id).orElse(null);
        if (order == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 404);
            errorResponse.put("message", "结算单不存在");
            return ResponseEntity.status(404).body(errorResponse);
        }
        
        Map<String, Object> result = buildSettlementDetailMap(order);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", result);
        return ResponseEntity.ok(response);
    }
    
    private Map<String, Object> buildSettlementDetailMap(SettlementOrder order) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", order.getId());
        result.put("settlementNo", order.getSettlementNo());
        result.put("deliveryNo", order.getDeliveryNo());
        result.put("relatedOrderNo", order.getRelatedOrderNo());
        result.put("totalAmount", order.getTotalAmount());
        result.put("netAmount", order.getNetAmount());
        result.put("taxAmount", order.getTaxAmount());
        result.put("createdAt", order.getCreatedAt());
        result.put("deliveryMethod", order.getDeliveryMethod());
        result.put("logisticsCompany", order.getLogisticsCompany());
        result.put("remark", order.getRemark());
        result.put("revokeRemark", order.getRevokeRemark());
        result.put("sourceType", order.getSourceType());
        
        String typeCn = "采购结算";
        if (order.getType() == SettlementOrder.Type.LOGISTICS) {
            typeCn = "配送单";
        }
        result.put("settlementType", typeCn);
        
        String supplierSettlementType = null;
        if (order.getSupplier() != null && order.getSupplier().getSettlementType() != null) {
            supplierSettlementType = order.getSupplier().getSettlementType().name();
            String supplierSettlementTypeCn = "月结";
            if ("PREPAYMENT".equals(supplierSettlementType)) supplierSettlementTypeCn = "预付";
            else if ("MONTHLY".equals(supplierSettlementType)) supplierSettlementTypeCn = "月结";
            else if ("WEEKLY".equals(supplierSettlementType)) supplierSettlementTypeCn = "周结";
            else if ("FISHERMAN".equals(supplierSettlementType)) supplierSettlementTypeCn = "渔民自送";
            else if ("REAL_TIME".equals(supplierSettlementType)) supplierSettlementTypeCn = "实销实结";
            result.put("supplierSettlementType", supplierSettlementTypeCn);
        } else if (order.getLogisticsProvider() != null && order.getLogisticsProvider().getSettlementType() != null) {
            supplierSettlementType = order.getLogisticsProvider().getSettlementType().name();
            String supplierSettlementTypeCn = "月结";
            if ("PREPAYMENT".equals(supplierSettlementType)) supplierSettlementTypeCn = "预付";
            else if ("MONTHLY".equals(supplierSettlementType)) supplierSettlementTypeCn = "月结";
            else if ("WEEKLY".equals(supplierSettlementType)) supplierSettlementTypeCn = "周结";
            result.put("supplierSettlementType", supplierSettlementTypeCn);
        }
        
        String statusCn = "待处理";
        if (order.getStatus() != null) {
            switch (order.getStatus()) {
                case PENDING: statusCn = "待结算"; break;
                case SETTLED: statusCn = "已结算"; break;
                case PAID: statusCn = "已付款"; break;
                case REVOKED: statusCn = "已撤回"; break;
                case REJECTED: statusCn = "已拒回"; break;
                default: statusCn = order.getStatus().name();
            }
        }
        result.put("status", statusCn);
        result.put("statusEnum", order.getStatus() != null ? order.getStatus().name() : null);
        
        String payeeName = "未知收款方";
        String payeeAccountType = order.getPayeeAccountType();
        String payeeAccountName = order.getPayeeAccountName();
        String payeeBank = order.getPayeeBank();
        String payeeAccount = order.getPayeeAccount();
        
        if (order.getLogisticsProvider() != null) {
            LogisticsProvider lp = order.getLogisticsProvider();
            payeeName = lp.getName();
            if (payeeAccountName == null) payeeAccountName = lp.getName();
            result.put("payeeId", lp.getId());
            result.put("payeeType", "logistics_provider");
            
            // 如果结算单中没有固化银行信息，则动态获取默认账户（向后兼容）
            if (payeeBank == null || payeeAccount == null) {
                java.util.List<com.supplypro.entity.LogisticsProviderAccount> accounts = logisticsProviderAccountRepository.findByLogisticsProvider(lp);
                if (accounts != null && !accounts.isEmpty()) {
                    com.supplypro.entity.LogisticsProviderAccount account = accounts.stream()
                        .filter(com.supplypro.entity.LogisticsProviderAccount::isDefault)
                        .findFirst()
                        .orElse(accounts.get(0));
                    payeeBank = account.getBank();
                    payeeAccount = account.getAccount();
                    if (account.getName() != null && !account.getName().isEmpty()) {
                        payeeAccountName = account.getName();
                    }
                }
            }
        } else if (order.getSupplier() != null) {
            com.supplypro.entity.Supplier supplier = order.getSupplier();
            payeeName = supplier.getName();
            if (payeeAccountName == null) payeeAccountName = supplier.getName();
            result.put("payeeId", supplier.getId());
            result.put("payeeType", "supplier");
            
            // 如果结算单中没有固化银行信息，则动态获取默认账户（向后兼容）
            if (payeeBank == null || payeeAccount == null) {
                java.util.List<com.supplypro.entity.SupplierAccount> accounts = supplierAccountRepository.findBySupplier(supplier);
                if (accounts != null && !accounts.isEmpty()) {
                    com.supplypro.entity.SupplierAccount account = accounts.stream()
                        .filter(com.supplypro.entity.SupplierAccount::isDefault)
                        .findFirst()
                        .orElse(accounts.get(0));
                    payeeBank = account.getBank();
                    payeeAccount = account.getAccount();
                    if (account.getName() != null && !account.getName().isEmpty()) {
                        payeeAccountName = account.getName();
                    }
                }
            }
        }
        
        result.put("payee", payeeName);
        result.put("payeeAccountType", payeeAccountType);
        result.put("payeeBank", payeeBank);
        result.put("payeeAccount", payeeAccount);
        result.put("payeeAccountName", payeeAccountName);
        result.put("payer", "平台运营主体");
        
        result.put("costInvoiceAmount", order.getCostInvoiceAmount());
        result.put("costInvoiceReceived", order.getCostInvoiceReceived());
        result.put("costInvoiceStatus", order.getCostInvoiceStatus() != null ? order.getCostInvoiceStatus() : "未上传");
        result.put("costInvoiceFiles", order.getCostInvoiceFiles());
        
        List<Map<String, Object>> deliveryList = new ArrayList<>();
        
        // 优先使用 settlementItems 字段（新逻辑）
        if (order.getSettlementItems() != null && !order.getSettlementItems().isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> items = mapper.readValue(order.getSettlementItems(), List.class);
                
                for (Map<String, Object> item : items) {
                    Map<String, Object> record = new HashMap<>();
                    record.put("relatedOrderNo", item.get("purchaseOrderNo"));
                    record.put("relatedOrderId", item.get("purchaseOrderId"));
                    record.put("bizType", item.get("bizType"));
                    record.put("bizNo", item.get("bizNo"));
                    record.put("amount", item.get("amount"));
                    record.put("platformOrderNo", item.get("platformOrderNo"));
                    record.put("bizTypeLabel", item.get("bizTypeLabel"));
                    
                    Object purchaseOrderId = item.get("purchaseOrderId");
                    if (purchaseOrderId != null) {
                        Long poId = null;
                        if (purchaseOrderId instanceof Number) {
                            poId = ((Number) purchaseOrderId).longValue();
                        } else if (purchaseOrderId instanceof String) {
                            poId = Long.valueOf((String) purchaseOrderId);
                        }
                        if (poId != null) {
                            PurchaseOrder po = purchaseOrderRepository.findById(poId).orElse(null);
                            if (po != null) {
                                record.put("status", po.getStatus() != null ? po.getStatus().name() : null);
                                record.put("shippingStatus", po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
                                if (record.get("platformOrderNo") == null && po.getPlatformOrderNo() != null) {
                                    record.put("platformOrderNo", po.getPlatformOrderNo());
                                }
                            }
                        }
                    }
                    
                    if (record.get("bizTypeLabel") == null && item.get("bizType") != null) {
                        String bt = (String) item.get("bizType");
                        switch (bt) {
                            case "PLATFORM": record.put("bizTypeLabel", "平台单"); break;
                            case "REPLENISHMENT": record.put("bizTypeLabel", "补货单"); break;
                            case "INBOUND": record.put("bizTypeLabel", "入库单"); break;
                            case "COST_ADJUSTMENT": record.put("bizTypeLabel", "调价单"); break;
                            case "REFUND": record.put("bizTypeLabel", "退款单"); break;
                            default: record.put("bizTypeLabel", bt); break;
                        }
                    }
                    
                    record.put("createdAt", item.get("createdAt"));
                    deliveryList.add(record);
                }
            } catch (Exception e) {
                // 解析失败，使用旧逻辑
            }
        }
        
        // 如果 settlementItems 为空或解析失败，使用 delivery_ids 查询配送单
        if (deliveryList.isEmpty() && order.getDeliveryIds() != null && !order.getDeliveryIds().isEmpty()) {
            try {
                String deliveryIdsStr = order.getDeliveryIds();
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                @SuppressWarnings("unchecked")
                List<Object> ids = mapper.readValue(deliveryIdsStr, List.class);
                
                for (Object idObj : ids) {
                    Long deliveryId = null;
                    if (idObj instanceof Number) {
                        deliveryId = ((Number) idObj).longValue();
                    } else if (idObj instanceof String) {
                        deliveryId = Long.valueOf((String) idObj);
                    }
                    
                    if (deliveryId != null) {
                        SettlementOrder delivery = settlementOrderRepository.findById(deliveryId).orElse(null);
                        if (delivery != null) {
                            Map<String, Object> record = new HashMap<>();
                            record.put("deliveryNo", delivery.getDeliveryNo());
                            record.put("deliveryId", delivery.getId());
                            record.put("amount", delivery.getTotalAmount() != null ? delivery.getTotalAmount() : java.math.BigDecimal.ZERO);
                            record.put("deliveryMethod", delivery.getDeliveryMethod());
                            record.put("shippedAt", delivery.getCreatedAt());
                            record.put("status", delivery.getStatus() != null ? delivery.getStatus().name() : null);
                            
                            // 根据来源类型设置业务类型和关联单号
                            String sourceType = delivery.getSourceType();
                            record.put("sourceType", sourceType);
                            
                            if ("出库单".equals(sourceType)) {
                                // 出库单来源
                                record.put("bizType", "出库单");
                                record.put("bizNo", delivery.getRelatedOrderNo());
                                // 查询出库单信息
                                OutboundOrder oo = outboundOrderRepository.findByOutboundNo(delivery.getRelatedOrderNo());
                                if (oo != null) {
                                    record.put("relatedOrderId", oo.getId());
                                    record.put("relatedOrderNo", oo.getOutboundNo());
                                }
                            } else {
                                // 采购单来源（采购单、物流配送、配送单等）
                                record.put("bizType", "采购单");
                                record.put("bizNo", delivery.getRelatedOrderNo());
                                // 查询采购单信息
                                if (delivery.getRelatedOrderNo() != null) {
                                    String[] orderNos = delivery.getRelatedOrderNo().split(",");
                                    if (orderNos.length > 0) {
                                        PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNos[0].trim());
                                        if (po != null) {
                                            record.put("relatedOrderId", po.getId());
                                            record.put("relatedOrderNo", delivery.getRelatedOrderNo());
                                        }
                                    }
                                }
                            }
                            
                            deliveryList.add(record);
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to parse delivery_ids: {}", e.getMessage());
            }
        }
        
        // 如果 delivery_ids 也为空，使用旧逻辑（按 relatedOrderNo 查询采购单）
        if (deliveryList.isEmpty() && order.getRelatedOrderNo() != null && !order.getRelatedOrderNo().isEmpty()) {
            String[] orderNos = order.getRelatedOrderNo().split(",");
            Set<String> allOrderNos = new java.util.HashSet<>();
            for (String orderNo : orderNos) {
                allOrderNos.add(orderNo.trim());
            }
            
            List<PurchaseOrder> pos = purchaseOrderRepository.findByOrderNoIn(new ArrayList<>(allOrderNos));
            Map<String, PurchaseOrder> poMap = pos.stream()
                .collect(java.util.stream.Collectors.toMap(PurchaseOrder::getOrderNo, po -> po));
            
            for (String orderNo : orderNos) {
                String trimmedOrderNo = orderNo.trim();
                PurchaseOrder po = poMap.get(trimmedOrderNo);
                if (po != null) {
                    // 1. 添加采购单本身的业务记录（入库单/平台单/补货单）
                    if (order.getType() == SettlementOrder.Type.PURCHASE) {
                        Map<String, Object> poRecord = new HashMap<>();
                        poRecord.put("relatedOrderNo", trimmedOrderNo);
                        poRecord.put("relatedOrderId", po.getId());
                        poRecord.put("bizType", po.getBizType() != null ? po.getBizType().name() : "");
                        poRecord.put("bizNo", po.getBizNo() != null ? po.getBizNo() : "-");
                        poRecord.put("amount", po.getTotalAmount() != null ? po.getTotalAmount() : java.math.BigDecimal.ZERO);
                        poRecord.put("status", po.getStatus() != null ? po.getStatus().name() : null);
                        poRecord.put("shippingStatus", po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
                        poRecord.put("createdAt", po.getCreatedAt());
                        deliveryList.add(poRecord);
                    }
                    
                    // 2. 添加调价单记录
                    List<CostAdjustmentItem> adjustmentItems = costAdjustmentItemRepository.findByPurchaseOrderId(po.getId());
                    for (CostAdjustmentItem item : adjustmentItems) {
                        CostAdjustmentSheet sheet = costAdjustmentSheetRepository.findById(item.getSheetId()).orElse(null);
                        if (sheet != null && sheet.getStatus() == CostAdjustmentSheet.Status.APPROVED) {
                            Map<String, Object> adjRecord = new HashMap<>();
                            adjRecord.put("relatedOrderNo", trimmedOrderNo);
                            adjRecord.put("relatedOrderId", po.getId());
                            adjRecord.put("bizType", "COST_ADJUSTMENT");
                            adjRecord.put("bizNo", sheet.getSheetNo());
                            adjRecord.put("amount", item.getTotalDiff() != null ? item.getTotalDiff() : java.math.BigDecimal.ZERO);
                            adjRecord.put("status", po.getStatus() != null ? po.getStatus().name() : null);
                            adjRecord.put("shippingStatus", po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
                            adjRecord.put("createdAt", sheet.getCreatedAt());
                            deliveryList.add(adjRecord);
                        }
                    }
                }
            }
        }
        result.put("deliveryList", deliveryList);
        
        List<Map<String, Object>> approvalRecords = new ArrayList<>();
        if (order.getStatus() != SettlementOrder.Status.PENDING && 
            order.getStatus() != SettlementOrder.Status.REVOKED && 
            order.getStatus() != SettlementOrder.Status.REJECTED) {
            Map<String, Object> step1 = new HashMap<>();
            step1.put("step", 1);
            step1.put("title", "发起审批");
            step1.put("description", "系统自动发起");
            step1.put("status", "finish");
            step1.put("operator", "系统");
            step1.put("time", order.getCreatedAt() != null ? order.getCreatedAt().toString() : "");
            approvalRecords.add(step1);
        }
        if (order.getStatus() == SettlementOrder.Status.SETTLED || 
            order.getStatus() == SettlementOrder.Status.PAID) {
            Map<String, Object> step2 = new HashMap<>();
            step2.put("step", 2);
            step2.put("title", "审批通过");
            step2.put("description", "结算审批完成");
            step2.put("status", "finish");
            step2.put("operator", order.getAuditor() != null ? order.getAuditor() : "系统");
            step2.put("time", order.getAuditTime() != null ? order.getAuditTime().toString() : "");
            approvalRecords.add(step2);
        }
        result.put("approvalRecords", approvalRecords);
        
        // 查询操作日志
        List<SettlementOrderLog> logs = settlementOrderLogRepository.findBySettlementOrderIdOrderByCreatedAtDesc(order.getId());
        List<Map<String, Object>> operationLogs = new ArrayList<>();
        for (SettlementOrderLog log : logs) {
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("id", log.getId());
            logMap.put("operator", log.getOperator());
            logMap.put("operationType", log.getOperationType());
            logMap.put("oldStatus", log.getOldStatus());
            logMap.put("newStatus", log.getNewStatus());
            logMap.put("remark", log.getRemark());
            logMap.put("createdAt", log.getCreatedAt());
            operationLogs.add(logMap);
        }
        result.put("operationLogs", operationLogs);
        
        return result;
    }

    @PostMapping("/{id:\\d+}/revoke")
    @Transactional
    public ResponseEntity<Map<String, Object>> revokeSettlement(
            @PathVariable Long id, 
            @RequestBody(required = false) Map<String, Object> payload) {
        
        SettlementOrder order = settlementOrderRepository.findById(id).orElse(null);
        if (order == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 404);
            errorResponse.put("message", "结算单不存在");
            return ResponseEntity.status(404).body(errorResponse);
        }
        
        String statusCn = getStatusChineseName(order.getStatus());
        if (order.getStatus() == SettlementOrder.Status.SETTLED || 
            order.getStatus() == SettlementOrder.Status.PAID) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 403);
            errorResponse.put("message", "当前状态[" + statusCn + "]不允许执行撤销操作");
            
            logRejectedOperation(order, "REVOKE", "当前状态[" + statusCn + "]不允许执行撤销操作");
            
            return ResponseEntity.status(403).body(errorResponse);
        }
        
        if (order.getStatus() != SettlementOrder.Status.PENDING) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", "当前状态不允许撤销");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        String remark = payload != null ? (String) payload.get("remark") : null;
        String operator = "系统";
        
        String oldStatusCn = getStatusChineseName(order.getStatus());
        SettlementOrder.Status oldStatus = order.getStatus();
        
        order.setStatus(SettlementOrder.Status.REVOKED);
        order.setUpdatedAt(LocalDateTime.now());
        order.setRevokeRemark(remark);
        settlementOrderRepository.save(order);
        
        SettlementOrderLog operationLog = new SettlementOrderLog();
        operationLog.setSettlementOrderId(order.getId());
        operationLog.setOperator(operator);
        operationLog.setOperationType("撤回");
        operationLog.setOldStatus(oldStatusCn);
        operationLog.setNewStatus("已撤销");
        operationLog.setRemark("结算单撤销操作" + (remark != null && !remark.isEmpty() ? "，原因：" + remark : ""));
        operationLog.setCreatedAt(LocalDateTime.now());
        settlementOrderLogRepository.save(operationLog);
        
        // NEW ARCHITECTURE: Release linked delivery orders via deliveryIds field
        if (order.getDeliveryIds() != null && !order.getDeliveryIds().isEmpty()) {
            try {
                // Parse delivery IDs from JSON or comma-separated string
                List<Long> deliveryIdList = new java.util.ArrayList<>();
                
                if (order.getDeliveryIds().startsWith("[")) {
                    // JSON array format
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    deliveryIdList = mapper.readValue(order.getDeliveryIds(), 
                        new com.fasterxml.jackson.core.type.TypeReference<List<Long>>() {});
                } else {
                    // Comma-separated format
                    String[] ids = order.getDeliveryIds().split(",");
                    for (String idStr : ids) {
                        try {
                            deliveryIdList.add(Long.valueOf(idStr.trim()));
                        } catch (NumberFormatException e) {
                            // Skip invalid IDs
                        }
                    }
                }
                
                // Find and release delivery orders
                List<SettlementOrder> deliveryOrders = settlementOrderRepository.findAllById(deliveryIdList);
                for (SettlementOrder delivery : deliveryOrders) {
                    if (delivery.getType() == SettlementOrder.Type.LOGISTICS) {
                        delivery.setSettlementNo(null);
                        delivery.setStatus(SettlementOrder.Status.PENDING);
                        delivery.setUpdatedAt(LocalDateTime.now());
                        settlementOrderRepository.save(delivery);
                    }
                }
            } catch (Exception e) {
                // Log error but continue
                System.err.println("Error releasing delivery orders: " + e.getMessage());
            }
        }
        
        // Fallback: Also check deliveryNo field for backward compatibility
        if (order.getDeliveryNo() != null && !order.getDeliveryNo().isEmpty()) {
            String[] deliveryNos = order.getDeliveryNo().split(",");
            for (String deliveryNo : deliveryNos) {
                List<SettlementOrder> deliveryOrders = settlementOrderRepository.findByDeliveryNoContaining(deliveryNo.trim());
                for (SettlementOrder deliveryOrder : deliveryOrders) {
                    if (deliveryOrder.getId() != order.getId() && deliveryOrder.getType() == SettlementOrder.Type.LOGISTICS) {
                        if (deliveryOrder.getSettlementNo() != null && 
                            deliveryOrder.getSettlementNo().equals(order.getSettlementNo())) {
                            deliveryOrder.setStatus(SettlementOrder.Status.PENDING);
                            deliveryOrder.setSettlementNo(null);
                            deliveryOrder.setUpdatedAt(LocalDateTime.now());
                            settlementOrderRepository.save(deliveryOrder);
                        }
                    }
                }
            }
        }
        
        if (order.getType() == SettlementOrder.Type.PURCHASE && order.getSettlementItems() != null && !order.getSettlementItems().isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> items = mapper.readValue(order.getSettlementItems(), List.class);
                java.util.Set<Long> processedPurchaseOrderIds = new java.util.HashSet<>();
                for (Map<String, Object> item : items) {
                    String itemBizType = (String) item.get("bizType");
                    
                    // 释放退款单的结算状态
                    if ("REFUND".equals(itemBizType)) {
                        Object rawIdObj = item.get("rawId");
                        Long refundOrderId = null;
                        if (rawIdObj instanceof Number) {
                            refundOrderId = ((Number) rawIdObj).longValue();
                        } else if (rawIdObj instanceof String) {
                            refundOrderId = Long.valueOf((String) rawIdObj);
                        }
                        if (refundOrderId != null) {
                            RefundOrder ro = refundOrderRepository.findById(refundOrderId).orElse(null);
                            if (ro != null && "SETTLED".equals(ro.getSettlementStatus())) {
                                ro.setSettlementStatus(null);
                                refundOrderRepository.save(ro);
                            }
                        }
                    }
                    
                    // 释放采购单的结算状态（从settlementItems中提取purchaseOrderNo）
                    Object purchaseOrderIdObj = item.get("purchaseOrderId");
                    Long purchaseOrderId = null;
                    if (purchaseOrderIdObj instanceof Number) {
                        purchaseOrderId = ((Number) purchaseOrderIdObj).longValue();
                    } else if (purchaseOrderIdObj instanceof String) {
                        purchaseOrderId = Long.valueOf((String) purchaseOrderIdObj);
                    }
                    if (purchaseOrderId != null && !processedPurchaseOrderIds.contains(purchaseOrderId)) {
                        processedPurchaseOrderIds.add(purchaseOrderId);
                        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId).orElse(null);
                        if (po != null) {
                            po.setSettlementOrder(null);
                            po.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
                            purchaseOrderRepository.save(po);
                            
                            PurchaseOrderLog plog = new PurchaseOrderLog();
                            plog.setPurchaseOrderId(po.getId());
                            plog.setOperationType("SETTLEMENT_REVOKED");
                            plog.setOperator(operator);
                            plog.setRemark("结算单 " + order.getSettlementNo() + " 已撤销，采购单释放回待结算列表" + 
                                (remark != null ? "，原因：" + remark : ""));
                            plog.setCreatedAt(LocalDateTime.now());
                            purchaseOrderLogRepository.save(plog);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error releasing settlement items: " + e.getMessage());
            }
        } else if (order.getRelatedOrderNo() != null && !order.getRelatedOrderNo().isEmpty()) {
            String[] orderNos = order.getRelatedOrderNo().split(",");
            for (String orderNo : orderNos) {
                PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNo.trim());
                if (po != null) {
                    if (order.getType() == SettlementOrder.Type.PURCHASE) {
                        po.setSettlementOrder(null);
                        po.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
                        purchaseOrderRepository.save(po);
                    }
                    
                    PurchaseOrderLog plog = new PurchaseOrderLog();
                    plog.setPurchaseOrderId(po.getId());
                    plog.setOperationType("SETTLEMENT_REVOKED");
                    plog.setOperator(operator);
                    plog.setRemark("结算单 " + order.getSettlementNo() + " 已撤销，采购单释放回待结算列表" + 
                        (remark != null ? "，原因：" + remark : ""));
                    plog.setCreatedAt(LocalDateTime.now());
                    purchaseOrderLogRepository.save(plog);
                }
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "撤销成功，关联配送单已释放回待结算列表");
        response.put("data", Map.of(
            "id", id,
            "status", "REVOKED",
            "statusCn", "已撤回"
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id:\\d+}/reject")
    @Transactional
    public ResponseEntity<Map<String, Object>> rejectSettlement(
            @PathVariable Long id, 
            @RequestBody(required = false) Map<String, Object> payload) {
        
        SettlementOrder order = settlementOrderRepository.findById(id).orElse(null);
        if (order == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 404);
            errorResponse.put("message", "结算单不存在");
            return ResponseEntity.status(404).body(errorResponse);
        }
        
        String statusCn = getStatusChineseName(order.getStatus());
        if (order.getStatus() == SettlementOrder.Status.SETTLED || 
            order.getStatus() == SettlementOrder.Status.PAID) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 403);
            errorResponse.put("message", "当前状态[" + statusCn + "]不允许执行驳回操作");
            
            logRejectedOperation(order, "REJECT", "当前状态[" + statusCn + "]不允许执行驳回操作");
            
            return ResponseEntity.status(403).body(errorResponse);
        }
        
        if (order.getStatus() != SettlementOrder.Status.PENDING) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", "当前状态不允许驳回");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        String remark = payload != null ? (String) payload.get("remark") : null;
        String operator = "系统";
        
        order.setStatus(SettlementOrder.Status.REJECTED);
        order.setUpdatedAt(LocalDateTime.now());
        order.setRemark(remark);
        settlementOrderRepository.save(order);
        
        // 释放关联的待结算配送单
        if (order.getDeliveryNo() != null && !order.getDeliveryNo().isEmpty()) {
            // 处理配送单号，可能是多个，用逗号分隔
            String[] deliveryNos = order.getDeliveryNo().split(",");
            for (String deliveryNo : deliveryNos) {
                // 查找关联的待结算配送单
                List<SettlementOrder> deliveryOrders = settlementOrderRepository.findByDeliveryNoContaining(deliveryNo.trim());
                for (SettlementOrder deliveryOrder : deliveryOrders) {
                    // 将待结算配送单状态改回PENDING
                    if (deliveryOrder.getType() == SettlementOrder.Type.LOGISTICS) {
                        deliveryOrder.setStatus(SettlementOrder.Status.PENDING);
                        deliveryOrder.setUpdatedAt(LocalDateTime.now());
                        settlementOrderRepository.save(deliveryOrder);
                    }
                }
            }
        }
        
        if (order.getRelatedOrderNo() != null && !order.getRelatedOrderNo().isEmpty()) {
            String[] orderNos = order.getRelatedOrderNo().split(",");
            for (String orderNo : orderNos) {
                PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNo.trim());
                if (po != null) {
                    PurchaseOrderLog log = new PurchaseOrderLog();
                    log.setPurchaseOrderId(po.getId());
                    log.setOperationType("SETTLEMENT_REJECTED");
                    log.setOperator(operator);
                    log.setRemark("结算单 " + order.getSettlementNo() + " 已驳回，配送单释放回待结算列表" + 
                        (remark != null ? "，原因：" + remark : ""));
                    log.setCreatedAt(LocalDateTime.now());
                    purchaseOrderLogRepository.save(log);
                }
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "驳回成功，关联配送单已释放回待结算列表");
        response.put("data", Map.of(
            "id", id,
            "status", "REJECTED",
            "statusCn", "已拒回"
        ));
        return ResponseEntity.ok(response);
    }
    
    private String getStatusChineseName(SettlementOrder.Status status) {
        if (status == null) return "未知";
        switch (status) {
            case PENDING: return "待结算";
            case SETTLED: return "已结算";
            case PAID: return "已付款";
            case REVOKED: return "已撤回";
            case REJECTED: return "已拒回";
            default: return status.name();
        }
    }
    
    private void logRejectedOperation(SettlementOrder order, String operationType, String reason) {
        try {
            SettlementOrderLog log = new SettlementOrderLog();
            log.setSettlementOrderId(order.getId());
            log.setOperator("系统");
            log.setOperationType("REVOKE".equals(operationType) ? "撤回" : "驳回");
            log.setOldStatus(getStatusChineseName(order.getStatus()));
            log.setNewStatus(getStatusChineseName(order.getStatus()));
            log.setRemark("操作被拒绝，原因：" + reason);
            log.setCreatedAt(LocalDateTime.now());
            settlementOrderLogRepository.save(log);
            
            if (order.getRelatedOrderNo() != null && !order.getRelatedOrderNo().isEmpty()) {
                String[] orderNos = order.getRelatedOrderNo().split(",");
                for (String orderNo : orderNos) {
                    PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNo.trim());
                    if (po != null) {
                        PurchaseOrderLog poLog = new PurchaseOrderLog();
                        poLog.setPurchaseOrderId(po.getId());
                        poLog.setOperationType("SETTLEMENT_" + operationType + "_REJECTED");
                        poLog.setOperator("系统");
                        poLog.setRemark("尝试对结算单 " + order.getSettlementNo() + " 执行" + 
                            ("REVOKE".equals(operationType) ? "撤销" : "驳回") + "操作被拒绝，原因：" + reason);
                        poLog.setCreatedAt(LocalDateTime.now());
                        purchaseOrderLogRepository.save(poLog);
                    }
                }
            }
        } catch (Exception e) {
            org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(getClass());
            logger.error("记录拒绝操作日志失败: {}", e.getMessage());
        }
    }
    
    @PostMapping("/{id}/upload-cost-invoice")
    public ResponseEntity<Map<String, Object>> uploadCostInvoice(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            SettlementOrder order = settlementOrderRepository.findById(id).orElse(null);
            if (order == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 404);
                errorResponse.put("message", "结算单不存在");
                return ResponseEntity.status(404).body(errorResponse);
            }
            
            BigDecimal amount = new BigDecimal(request.get("amount").toString());
            String proof = (String) request.get("proof");
            String invoiceType = (String) request.get("invoiceType");
            String invoiceCode = (String) request.get("invoiceCode");
            if (invoiceType == null) invoiceType = "成本票";
            
            BigDecimal costInvoiceAmount = order.getCostInvoiceAmount();
            if (costInvoiceAmount == null) {
                costInvoiceAmount = order.getTotalAmount();
            }
            
            BigDecimal costInvoiceReceived = order.getCostInvoiceReceived();
            if (costInvoiceReceived == null) {
                costInvoiceReceived = BigDecimal.ZERO;
            }
            
            BigDecimal newReceived;
            if ("红冲票".equals(invoiceType)) {
                newReceived = costInvoiceReceived.subtract(amount);
                if (newReceived.compareTo(BigDecimal.ZERO) < 0) {
                    newReceived = BigDecimal.ZERO;
                }
            } else {
                newReceived = costInvoiceReceived.add(amount);
            }
            
            BigDecimal unreceived = costInvoiceAmount.subtract(newReceived);
            
            String status;
            if (unreceived.compareTo(BigDecimal.ZERO) == 0) {
                status = "已上传";
            } else if (unreceived.compareTo(costInvoiceAmount) < 0) {
                status = "部分上传";
            } else {
                status = "未上传";
            }
            
            order.setCostInvoiceReceived(newReceived);
            order.setCostInvoiceStatus(status);
            
            if (proof != null && !proof.isEmpty()) {
                String existingFiles = order.getCostInvoiceFiles();
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.List<Map<String, Object>> filesList;
                if (existingFiles != null && !existingFiles.isEmpty()) {
                    filesList = mapper.readValue(existingFiles, java.util.List.class);
                } else {
                    filesList = new java.util.ArrayList<>();
                }
                Map<String, Object> fileInfo = new HashMap<>();
                fileInfo.put("url", proof);
                fileInfo.put("type", invoiceType);
                fileInfo.put("amount", amount);
                fileInfo.put("invoiceCode", invoiceCode);
                fileInfo.put("uploadTime", java.time.LocalDateTime.now().toString());
                filesList.add(fileInfo);
                order.setCostInvoiceFiles(mapper.writeValueAsString(filesList));
            }
            
            settlementOrderRepository.save(order);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "成本票上传成功");
            response.put("data", Map.of(
                "id", id,
                "costInvoiceReceived", newReceived,
                "costInvoiceStatus", status
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 500);
                errorResponse.put("message", "上传失败: " + e.getMessage());
                return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{id}/reset-cost-invoice")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetCostInvoice(@PathVariable Long id) {
        try {
            SettlementOrder order = settlementOrderRepository.findById(id).orElse(null);
            if (order == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 404);
                errorResponse.put("message", "结算单不存在");
                return ResponseEntity.status(404).body(errorResponse);
            }
            
            order.setCostInvoiceReceived(BigDecimal.ZERO);
            order.setCostInvoiceStatus("未上传");
            order.setCostInvoiceFiles(null);
            
            settlementOrderRepository.save(order);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "成本票数据已重置");
            response.put("data", Map.of(
                "id", id,
                "costInvoiceReceived", 0,
                "costInvoiceStatus", "未上传"
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "重置失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{id}/update-status")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            SettlementOrder order = settlementOrderRepository.findById(id).orElse(null);
            if (order == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 404);
                errorResponse.put("message", "结算单不存在");
                return ResponseEntity.status(404).body(errorResponse);
            }
            
            String newStatus = (String) request.get("status");
            if (newStatus == null || newStatus.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 400);
                errorResponse.put("message", "状态参数不能为空");
                return ResponseEntity.status(400).body(errorResponse);
            }
            
            SettlementOrder.Status status;
            switch (newStatus) {
                case "PENDING":
                    status = SettlementOrder.Status.PENDING;
                    break;
                case "SETTLED":
                    status = SettlementOrder.Status.SETTLED;
                    break;
                case "PAID":
                    status = SettlementOrder.Status.PAID;
                    break;
                case "REVOKED":
                    status = SettlementOrder.Status.REVOKED;
                    break;
                case "REJECTED":
                    status = SettlementOrder.Status.REJECTED;
                    break;
                default:
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("code", 400);
                    errorResponse.put("message", "无效的状态值");
                    return ResponseEntity.status(400).body(errorResponse);
            }
            
            order.setStatus(status);
            order.setUpdatedAt(java.time.LocalDateTime.now());
            settlementOrderRepository.save(order);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "状态更新成功");
            response.put("data", Map.of(
                "id", id,
                "status", status.name()
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "状态更新失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/create-missing-pending-delivery")
    @Transactional
    public ResponseEntity<Map<String, Object>> createMissingPendingDelivery() {
        try {
            List<PurchaseOrder> shippedOrders = purchaseOrderRepository.findAll().stream()
                .filter(po -> po.getShippingStatus() == PurchaseOrder.ShippingStatus.SHIPPED)
                .collect(java.util.stream.Collectors.toList());
            int created = 0;
            List<String> createdOrders = new ArrayList<>();
            
            for (PurchaseOrder po : shippedOrders) {
                if (po.getLogisticsFee() != null && po.getLogisticsFee().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    List<SettlementOrder> existing = settlementOrderRepository.findByRelatedOrderNoAndType(
                        po.getOrderNo(), SettlementOrder.Type.LOGISTICS).stream()
                        .filter(s -> s.getStatus() == SettlementOrder.Status.PENDING)
                        .collect(java.util.stream.Collectors.toList());
                    
                    if (existing.isEmpty()) {
                        SettlementOrder settlement = new SettlementOrder();
                        
                        if ("SelfDelivery".equals(po.getDeliveryMethod())) {
                            if (po.getSupplier() != null) {
                                settlement.setSupplier(po.getSupplier());
                            }
                            settlement.setSourceType("自配送");
                        } else {
                            if (po.getLogisticsProvider() != null) {
                                settlement.setLogisticsProvider(po.getLogisticsProvider());
                            }
                            settlement.setSourceType("物流配送");
                        }
                        
                        settlement.setType(SettlementOrder.Type.LOGISTICS);
                        settlement.setStatus(SettlementOrder.Status.PENDING);
                        settlement.setTotalAmount(po.getLogisticsFee());
                        
                        java.math.BigDecimal netAmount = po.getLogisticsFee().divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
                        java.math.BigDecimal taxAmount = po.getLogisticsFee().subtract(netAmount);
                        settlement.setNetAmount(netAmount);
                        settlement.setTaxAmount(taxAmount);
                        
                        settlement.setRelatedOrderNo(po.getOrderNo());
                        settlement.setDeliveryMethod(po.getDeliveryMethod());
                        
                        String deliveryNo = "PS" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + 
                                           String.format("%03d", new java.util.Random().nextInt(1000));
                        settlement.setDeliveryNo(deliveryNo);
                        settlement.setCreatedAt(java.time.LocalDateTime.now());
                        settlement.setCreatedBy("SYSTEM_FIX");
                        
                        settlementOrderRepository.save(settlement);
                        created++;
                        createdOrders.add(po.getOrderNo());
                    }
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "成功创建 " + created + " 个待结算配送单");
            response.put("data", Map.of(
                "created", created,
                "orders", createdOrders
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "创建失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/merge-delivery-by-tracking")
    @Transactional
    public ResponseEntity<Map<String, Object>> mergeDeliveryByTracking() {
        try {
            List<SettlementOrder> allOrders = settlementOrderRepository.findAll().stream()
                .filter(s -> s.getType() == SettlementOrder.Type.LOGISTICS)
                .filter(s -> s.getStatus() == SettlementOrder.Status.PENDING)
                .filter(s -> s.getTrackingNo() != null && !s.getTrackingNo().isEmpty())
                .collect(java.util.stream.Collectors.toList());
            
            Map<String, List<SettlementOrder>> groupedByTracking = new java.util.HashMap<>();
            for (SettlementOrder order : allOrders) {
                String trackingNo = order.getTrackingNo();
                if (!groupedByTracking.containsKey(trackingNo)) {
                    groupedByTracking.put(trackingNo, new java.util.ArrayList<>());
                }
                groupedByTracking.get(trackingNo).add(order);
            }
            
            int merged = 0;
            List<String> mergedDetails = new java.util.ArrayList<>();
            
            for (Map.Entry<String, List<SettlementOrder>> entry : groupedByTracking.entrySet()) {
                List<SettlementOrder> orders = entry.getValue();
                if (orders.size() > 1) {
                    SettlementOrder master = orders.get(0);
                    java.math.BigDecimal totalAmount = master.getTotalAmount();
                    StringBuilder orderNos = new StringBuilder(master.getRelatedOrderNo());
                    
                    for (int i = 1; i < orders.size(); i++) {
                        SettlementOrder slave = orders.get(i);
                        totalAmount = totalAmount.add(slave.getTotalAmount());
                        orderNos.append(",").append(slave.getRelatedOrderNo());
                        
                        slave.setStatus(SettlementOrder.Status.SETTLED);
                        slave.setRemark("已合并到配送单: " + master.getDeliveryNo());
                        settlementOrderRepository.save(slave);
                    }
                    
                    master.setRelatedOrderNo(orderNos.toString());
                    master.setTotalAmount(totalAmount);
                    java.math.BigDecimal netAmount = totalAmount.divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
                    master.setNetAmount(netAmount);
                    master.setTaxAmount(totalAmount.subtract(netAmount));
                    settlementOrderRepository.save(master);
                    
                    merged++;
                    mergedDetails.add(master.getDeliveryNo() + ": " + orderNos.toString());
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "成功合并 " + merged + " 组配送单");
            response.put("data", Map.of(
                "merged", merged,
                "details", mergedDetails
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "合并失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/update-related-orders")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateRelatedOrders() {
        try {
            List<SettlementOrder> allOrders = settlementOrderRepository.findAll().stream()
                .filter(s -> s.getType() == SettlementOrder.Type.LOGISTICS)
                .filter(s -> s.getStatus() == SettlementOrder.Status.PENDING)
                .collect(java.util.stream.Collectors.toList());
            
            int updated = 0;
            List<String> updateDetails = new ArrayList<>();
            
            for (SettlementOrder order : allOrders) {
                String relatedOrderNo = order.getRelatedOrderNo();
                if (relatedOrderNo != null && !relatedOrderNo.isEmpty()) {
                    PurchaseOrder firstPo = purchaseOrderRepository.findByOrderNo(relatedOrderNo);
                    if (firstPo != null) {
                        String trackingNo = firstPo.getTrackingNumber();
                        if (trackingNo != null && !trackingNo.isEmpty()) {
                            order.setTrackingNo(trackingNo);
                            
                            List<PurchaseOrder> posWithSameTracking = purchaseOrderRepository.findByTrackingNumber(trackingNo);
                            if (posWithSameTracking != null && posWithSameTracking.size() > 1) {
                                StringBuilder orderNos = new StringBuilder();
                                java.math.BigDecimal totalFee = java.math.BigDecimal.ZERO;
                                
                                for (PurchaseOrder po : posWithSameTracking) {
                                    if (orderNos.length() > 0) {
                                        orderNos.append(",");
                                    }
                                    orderNos.append(po.getOrderNo());
                                    if (po.getLogisticsFee() != null) {
                                        totalFee = totalFee.add(po.getLogisticsFee());
                                    }
                                }
                                
                                String newOrderNos = orderNos.toString();
                                if (!newOrderNos.equals(order.getRelatedOrderNo())) {
                                    order.setRelatedOrderNo(newOrderNos);
                                    order.setTotalAmount(totalFee);
                                    java.math.BigDecimal netAmount = totalFee.divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
                                    order.setNetAmount(netAmount);
                                    order.setTaxAmount(totalFee.subtract(netAmount));
                                    updated++;
                                    updateDetails.add(order.getDeliveryNo() + ": " + newOrderNos);
                                }
                            }
                            settlementOrderRepository.save(order);
                        }
                    }
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "成功更新 " + updated + " 个配送单的关联采购单");
            response.put("data", Map.of(
                "updated", updated,
                "details", updateDetails
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/migrate-release-deliveries")
    @Transactional
    public ResponseEntity<Map<String, Object>> migrateReleaseDeliveries() {
        Map<String, Object> report = new HashMap<>();
        List<Map<String, Object>> releasedDeliveries = new ArrayList<>();
        List<Map<String, Object>> deletedSettlements = new ArrayList<>();
        int totalReleased = 0;
        int totalDeleted = 0;
        
        try {
            List<SettlementOrder> allOrders = settlementOrderRepository.findAll();
            
            for (SettlementOrder order : allOrders) {
                if (order.getType() == SettlementOrder.Type.LOGISTICS) {
                    if (order.getSettlementNo() != null && !order.getSettlementNo().isEmpty()) {
                        Map<String, Object> record = new HashMap<>();
                        record.put("id", order.getId());
                        record.put("deliveryNo", order.getDeliveryNo());
                        record.put("settlementNo", order.getSettlementNo());
                        record.put("oldStatus", order.getStatus());
                        
                        order.setSettlementNo(null);
                        order.setStatus(SettlementOrder.Status.PENDING);
                        order.setUpdatedAt(LocalDateTime.now());
                        settlementOrderRepository.save(order);
                        
                        record.put("newStatus", SettlementOrder.Status.PENDING);
                        record.put("action", "RELEASED");
                        releasedDeliveries.add(record);
                        totalReleased++;
                    }
                }
            }
            
            report.put("totalReleased", totalReleased);
            report.put("releasedDeliveries", releasedDeliveries);
            report.put("totalDeleted", totalDeleted);
            report.put("deletedSettlements", deletedSettlements);
            report.put("message", "数据迁移完成：已释放 " + totalReleased + " 个配送单回待结算状态");
            report.put("timestamp", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "数据迁移失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/clean-duplicate-settlement-nos")
    @Transactional
    public ResponseEntity<Map<String, Object>> cleanDuplicateSettlementNos() {
        Map<String, Object> report = new HashMap<>();
        List<Map<String, Object>> cleanedRecords = new ArrayList<>();
        int totalCleaned = 0;
        
        try {
            List<SettlementOrder> allOrders = settlementOrderRepository.findAll();
            
            Map<String, List<SettlementOrder>> settlementNoMap = new HashMap<>();
            for (SettlementOrder order : allOrders) {
                if (order.getSettlementNo() != null && !order.getSettlementNo().isEmpty()) {
                    settlementNoMap.computeIfAbsent(order.getSettlementNo(), k -> new ArrayList<>()).add(order);
                }
            }
            
            for (Map.Entry<String, List<SettlementOrder>> entry : settlementNoMap.entrySet()) {
                String settlementNo = entry.getKey();
                List<SettlementOrder> duplicates = entry.getValue();
                
                if (duplicates.size() > 1) {
                    duplicates.sort((a, b) -> {
                        if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                            return b.getCreatedAt().compareTo(a.getCreatedAt());
                        }
                        return Long.compare(b.getId(), a.getId());
                    });
                    
                    SettlementOrder keep = duplicates.get(0);
                    
                    for (int i = 1; i < duplicates.size(); i++) {
                        SettlementOrder duplicate = duplicates.get(i);
                        
                        Map<String, Object> record = new HashMap<>();
                        record.put("id", duplicate.getId());
                        record.put("settlementNo", duplicate.getSettlementNo());
                        record.put("type", duplicate.getType());
                        record.put("status", duplicate.getStatus());
                        record.put("action", "CLEARED_SETTLEMENT_NO");
                        
                        duplicate.setSettlementNo(null);
                        duplicate.setUpdatedAt(LocalDateTime.now());
                        settlementOrderRepository.save(duplicate);
                        
                        cleanedRecords.add(record);
                        totalCleaned++;
                    }
                }
            }
            
            report.put("totalCleaned", totalCleaned);
            report.put("cleanedRecords", cleanedRecords);
            report.put("message", "清理完成：已清除 " + totalCleaned + " 个重复的结算单号");
            report.put("timestamp", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "清理失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/check-all-records")
    public ResponseEntity<Map<String, Object>> checkAllRecords() {
        Map<String, Object> report = new HashMap<>();
        
        try {
            List<SettlementOrder> allOrders = settlementOrderRepository.findAll();
            
            int totalRecords = allOrders.size();
            int withSettlementNo = 0;
            int withoutSettlementNo = 0;
            int logisticsType = 0;
            int purchaseType = 0;
            
            Map<String, List<Long>> settlementNoMap = new HashMap<>();
            
            for (SettlementOrder order : allOrders) {
                if (order.getSettlementNo() != null && !order.getSettlementNo().isEmpty()) {
                    withSettlementNo++;
                    settlementNoMap.computeIfAbsent(order.getSettlementNo(), k -> new ArrayList<>()).add(order.getId());
                } else {
                    withoutSettlementNo++;
                }
                
                if (order.getType() == SettlementOrder.Type.LOGISTICS) {
                    logisticsType++;
                } else if (order.getType() == SettlementOrder.Type.PURCHASE) {
                    purchaseType++;
                }
            }
            
            Map<String, List<Long>> duplicates = new HashMap<>();
            for (Map.Entry<String, List<Long>> entry : settlementNoMap.entrySet()) {
                if (entry.getValue().size() > 1) {
                    duplicates.put(entry.getKey(), entry.getValue());
                }
            }
            
            report.put("totalRecords", totalRecords);
            report.put("withSettlementNo", withSettlementNo);
            report.put("withoutSettlementNo", withoutSettlementNo);
            report.put("logisticsType", logisticsType);
            report.put("purchaseType", purchaseType);
            report.put("duplicateSettlementNos", duplicates);
            report.put("hasDuplicates", !duplicates.isEmpty());
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "检查失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/all-delivery-records")
    public ResponseEntity<Map<String, Object>> getAllDeliveryRecords() {
        Map<String, Object> report = new HashMap<>();
        
        try {
            List<SettlementOrder> allOrders = settlementOrderRepository.findAll();
            
            List<Map<String, Object>> deliveryRecords = new ArrayList<>();
            
            for (SettlementOrder order : allOrders) {
                if (order.getType() == SettlementOrder.Type.LOGISTICS) {
                    Map<String, Object> record = new HashMap<>();
                    record.put("id", order.getId());
                    record.put("deliveryNo", order.getDeliveryNo());
                    record.put("settlementNo", order.getSettlementNo());
                    record.put("status", order.getStatus());
                    record.put("supplierId", order.getSupplier() != null ? order.getSupplier().getId() : null);
                    record.put("supplierName", order.getSupplier() != null ? order.getSupplier().getName() : null);
                    record.put("logisticsProviderId", order.getLogisticsProvider() != null ? order.getLogisticsProvider().getId() : null);
                    record.put("logisticsProviderName", order.getLogisticsProvider() != null ? order.getLogisticsProvider().getName() : null);
                    record.put("totalAmount", order.getTotalAmount());
                    record.put("createdAt", order.getCreatedAt());
                    deliveryRecords.add(record);
                }
            }
            
            report.put("totalRecords", deliveryRecords.size());
            report.put("records", deliveryRecords);
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/fix-adjustment-data")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixAdjustmentData() {
        try {
            List<SettlementOrder> adjustmentOrders = settlementOrderRepository.findAll().stream()
                .filter(s -> "调价单".equals(s.getSourceType()))
                .filter(s -> s.getRelatedOrderNo() != null && s.getRelatedOrderNo().startsWith("RC"))
                .collect(java.util.stream.Collectors.toList());
            
            int updated = 0;
            List<String> updateDetails = new ArrayList<>();
            
            for (SettlementOrder order : adjustmentOrders) {
                String adjustmentNo = order.getRelatedOrderNo();
                
                Optional<CostAdjustmentSheet> sheetOpt = costAdjustmentSheetRepository.findBySheetNo(adjustmentNo);
                if (sheetOpt.isPresent()) {
                    CostAdjustmentSheet sheet = sheetOpt.get();
                    List<CostAdjustmentItem> items = costAdjustmentItemRepository.findBySheetId(sheet.getId());
                    if (!items.isEmpty()) {
                        String poNo = items.get(0).getPoNo();
                        
                        order.setRelatedOrderNo(poNo);
                        order.setDeliveryNo(adjustmentNo);
                        settlementOrderRepository.save(order);
                        
                        updated++;
                        updateDetails.add(String.format("结算单ID %d: 调价单号 %s -> deliveryNo, 采购单号 %s -> relatedOrderNo", 
                            order.getId(), adjustmentNo, poNo));
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

    @PostMapping("/fix-negative-amounts")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixNegativeAmounts() {
        try {
            List<SettlementOrder> adjustmentOrders = settlementOrderRepository.findAll().stream()
                .filter(s -> "调价单".equals(s.getSourceType()))
                .collect(java.util.stream.Collectors.toList());
            
            int updated = 0;
            List<String> updateDetails = new ArrayList<>();
            
            for (SettlementOrder order : adjustmentOrders) {
                String adjustmentNo = order.getDeliveryNo();
                if (adjustmentNo == null || adjustmentNo.isEmpty()) {
                    continue;
                }
                
                Optional<CostAdjustmentSheet> sheetOpt = costAdjustmentSheetRepository.findBySheetNo(adjustmentNo);
                if (sheetOpt.isPresent()) {
                    CostAdjustmentSheet sheet = sheetOpt.get();
                    BigDecimal totalDiff = sheet.getTotalDiff();
                    
                    // Check if totalDiff is negative but order.totalAmount is positive
                    if (totalDiff.compareTo(BigDecimal.ZERO) < 0 && 
                        order.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                        
                        // Fix totalAmount
                        order.setTotalAmount(totalDiff);
                        
                        // Fix netAmount and taxAmount (should also be negative)
                        BigDecimal absAmount = totalDiff.abs();
                        BigDecimal netAmount = absAmount.divide(new BigDecimal("1.06"), 2, RoundingMode.HALF_UP);
                        BigDecimal taxAmount = absAmount.subtract(netAmount);
                        
                        order.setNetAmount(netAmount.negate());
                        order.setTaxAmount(taxAmount.negate());
                        
                        settlementOrderRepository.save(order);
                        
                        updated++;
                        updateDetails.add(String.format("结算单ID %d: totalAmount %.2f -> %.2f, netAmount %.2f -> %.2f, taxAmount %.2f -> %.2f", 
                            order.getId(), 
                            order.getTotalAmount().negate(), totalDiff,
                            order.getNetAmount().negate(), netAmount.negate(),
                            order.getTaxAmount().negate(), taxAmount.negate()));
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
    
    @PostMapping("/batch-delete-purchase-settlements")
    @Transactional
    public ResponseEntity<Map<String, Object>> batchDeletePurchaseSettlements(@RequestBody Map<String, Object> payload) {
        try {
            List<Long> settlementIds = (List<Long>) payload.get("settlementIds");
            if (settlementIds == null || settlementIds.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 400);
                errorResponse.put("message", "结算单ID列表不能为空");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            settlementService.batchDeletePurchaseSettlements(settlementIds);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "批量删除采购结算单成功");
            response.put("data", Map.of("deletedCount", settlementIds.size()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "批量删除失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping("/batch-restore-pending-purchase-orders")
    @Transactional
    public ResponseEntity<Map<String, Object>> batchRestorePendingPurchaseOrders(@RequestBody Map<String, Object> payload) {
        try {
            List<Long> settlementIds = (List<Long>) payload.get("settlementIds");
            List<Long> pendingPurchaseOrderIds = (List<Long>) payload.get("pendingPurchaseOrderIds");
            
            if (settlementIds == null || settlementIds.isEmpty() || pendingPurchaseOrderIds == null || pendingPurchaseOrderIds.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 400);
                errorResponse.put("message", "结算单ID列表和待结算采购单ID列表不能为空");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            if (settlementIds.size() != pendingPurchaseOrderIds.size()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 400);
                errorResponse.put("message", "结算单ID列表和待结算采购单ID列表数量不一致");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            settlementService.batchRestorePendingPurchaseOrders(settlementIds, pendingPurchaseOrderIds);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "批量恢复待结算采购单成功");
            response.put("data", Map.of("restoredCount", pendingPurchaseOrderIds.size()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "批量恢复失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping("/restore-missing-purchase-settlements")
    @Transactional
    public ResponseEntity<Map<String, Object>> restoreMissingPurchaseSettlements() {
        List<PurchaseOrder> pos = purchaseOrderRepository.findAll();
        int restoredCount = 0;
        for (PurchaseOrder po : pos) {
            if (po.getStatus() != PurchaseOrder.Status.PENDING && 
                po.getStatus() != PurchaseOrder.Status.CANCELLED &&
                po.getSettlementStatus() == PurchaseOrder.SettlementStatus.UNSETTLED &&
                (po.getTotalAmount() != null && po.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) > 0)) {
                
                // Check if already exists
                List<SettlementOrder> existing = settlementOrderRepository.findByRelatedOrderNoAndType(po.getOrderNo(), SettlementOrder.Type.PURCHASE);
                if (existing == null || existing.isEmpty()) {
                    SettlementOrder settlement = new SettlementOrder();
                    settlement.setType(SettlementOrder.Type.PURCHASE);
                    settlement.setStatus(SettlementOrder.Status.PENDING);
                    settlement.setRelatedOrderNo(po.getOrderNo());
                    settlement.setTotalAmount(po.getTotalAmount());
                    settlement.setSupplier(po.getSupplier());
                    
                    String sourceType = "采购单";
                    settlement.setSourceType(sourceType);
                    
                    java.math.BigDecimal netAmount = po.getTotalAmount().divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
                    java.math.BigDecimal taxAmount = po.getTotalAmount().subtract(netAmount);
                    settlement.setNetAmount(netAmount);
                    settlement.setTaxAmount(taxAmount);
                    
                    String deliveryNo = "GS" + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + 
                                       String.format("%03d", new java.util.Random().nextInt(1000));
                    settlement.setDeliveryNo(deliveryNo);
                    
                    if (po.getSupplier() != null && po.getSupplier().getSettlementPeriod() != null) {
                        settlement.setSettlementPeriod(po.getSupplier().getSettlementPeriod());
                    }
                    
                    settlement.setCreatedBy("admin");
                    settlement.setCreatedAt(java.time.LocalDateTime.now());
                    settlementOrderRepository.save(settlement);
                    restoredCount++;
                }
            }
        }
        Map<String, Object> response = new HashMap<>();
        response.put("restoredCount", restoredCount);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/purchase-settlements-from-pending")
    public ResponseEntity<Map<String, Object>> createPurchaseSettlementsFromPendingPurchaseOrders(@RequestBody Map<String, Object> payload) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
            String createdBy = (String) payload.getOrDefault("createdBy", "系统");
            
            // 银行账户信息（可选）
            String payeeAccountType = (String) payload.get("payeeAccountType");
            String payeeAccountName = (String) payload.get("payeeAccountName");
            String payeeBank = (String) payload.get("payeeBank");
            String payeeAccount = (String) payload.get("payeeAccount");
            
            if (items == null || items.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 400);
                errorResponse.put("message", "待结算记录列表不能为空");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            List<SettlementOrder> settlements = settlementService.createSettlementsFromBizItems(
                items, createdBy, payeeAccountType, payeeAccountName, payeeBank, payeeAccount);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "成功生成 " + settlements.size() + " 个采购结算单");
            response.put("data", Map.of("createdCount", settlements.size()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "生成采购结算单失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
