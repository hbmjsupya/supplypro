package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.*;
import com.supplypro.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/outbound-orders")
@CrossOrigin(origins = "*")
public class OutboundOrderController {

    private static final Logger logger = LoggerFactory.getLogger(OutboundOrderController.class);

    @Autowired
    private OutboundOrderRepository outboundOrderRepository;

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private StockFlowRepository stockFlowRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private SkuRepository skuRepository;

    @Autowired
    private OutboundOrderLogRepository outboundOrderLogRepository;

    @Autowired
    private RefundOrderRepository refundOrderRepository;

    @Autowired
    private PlatformPendingOrderRepository platformPendingOrderRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sourceType) {
        
        Page<OutboundOrder> pageResult = outboundOrderRepository.findAll(
            PageRequest.of(page, size, Sort.by("id").descending())
        );
        
        List<Map<String, Object>> records = new ArrayList<>();
        for (OutboundOrder oo : pageResult.getContent()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", oo.getId());
            map.put("outboundNo", oo.getOutboundNo());
            map.put("sourceType", oo.getSourceType() != null ? oo.getSourceType().name() : null);
            map.put("sourceRefNo", oo.getSourceRefNo());
            map.put("status", oo.getStatus() != null ? oo.getStatus().name() : null);
            map.put("settlementStatus", oo.getSettlementStatus() != null ? oo.getSettlementStatus().name() : null);
            map.put("logisticsCompany", oo.getLogisticsCompany());
            map.put("trackingNo", oo.getTrackingNo());
            map.put("deliveryMethod", oo.getDeliveryMethod());
            map.put("logisticsFee", oo.getLogisticsFee());
            map.put("outboundDate", oo.getOutboundDate());
            map.put("outboundItems", oo.getOutboundItems());
            map.put("createdAt", oo.getCreatedAt());
            map.put("consignee", oo.getConsignee());
            map.put("consigneePhone", oo.getConsigneePhone());
            map.put("consigneeAddress", oo.getConsigneeAddress());
            map.put("expectedArrival", oo.getExpectedArrival());
            map.put("remark", oo.getRemark());
            
            if (oo.getWarehouse() != null) {
                Map<String, Object> wh = new HashMap<>();
                wh.put("id", oo.getWarehouse().getId());
                wh.put("code", oo.getWarehouse().getCode());
                wh.put("name", oo.getWarehouse().getName());
                map.put("warehouse", wh);
            }
            
            if (oo.getLogisticsProvider() != null) {
                Map<String, Object> lp = new HashMap<>();
                lp.put("id", oo.getLogisticsProvider().getId());
                lp.put("name", oo.getLogisticsProvider().getName());
                map.put("logisticsProvider", lp);
            }
            
            if (oo.getSalesOrder() != null) {
                Map<String, Object> so = new HashMap<>();
                so.put("id", oo.getSalesOrder().getId());
                so.put("orderNo", oo.getSalesOrder().getOrderNo());
                map.put("salesOrder", so);
            }
            
            records.add(map);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", records,
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> payload) {
        OutboundOrder outboundOrder = new OutboundOrder();
        
        String sourceTypeStr = (String) payload.get("sourceType");
        OutboundOrder.SourceType sourceType = OutboundOrder.SourceType.SALES;
        if (sourceTypeStr != null) {
            sourceType = OutboundOrder.SourceType.valueOf(sourceTypeStr);
        }
        outboundOrder.setSourceType(sourceType);
        outboundOrder.setSourceRefNo((String) payload.get("sourceRefNo"));
        
        if (payload.get("salesOrderId") != null) {
            Long soId = Long.valueOf(payload.get("salesOrderId").toString());
            SalesOrder so = salesOrderRepository.findById(soId).orElse(null);
            outboundOrder.setSalesOrder(so);
        }
        
        if (payload.get("warehouseId") != null) {
            Long whId = Long.valueOf(payload.get("warehouseId").toString());
            Warehouse wh = new Warehouse();
            wh.setId(whId);
            outboundOrder.setWarehouse(wh);
        }
        
        outboundOrder.setOutboundNo(generateOutboundNo());
        outboundOrder.setStatus(OutboundOrder.Status.PENDING);
        outboundOrder.setSettlementStatus(OutboundOrder.SettlementStatus.UNSETTLED);
        
        // 从平台订单获取收货人信息
        if (outboundOrder.getSourceRefNo() != null && !outboundOrder.getSourceRefNo().isEmpty()) {
            Optional<PlatformPendingOrder> platformOrderOpt = platformPendingOrderRepository.findByOrderNo(outboundOrder.getSourceRefNo());
            if (platformOrderOpt.isPresent()) {
                PlatformPendingOrder platformOrder = platformOrderOpt.get();
                outboundOrder.setConsignee(platformOrder.getReceiver());
                outboundOrder.setConsigneePhone(platformOrder.getReceiverPhone());
                outboundOrder.setConsigneeAddress(platformOrder.getAddress());
                outboundOrder.setExpectedArrival(platformOrder.getExpectedReceiveTime());
                outboundOrder.setRemark(platformOrder.getOrderRemark());
            }
        }
        
        if (payload.get("logisticsFee") != null) {
            outboundOrder.setLogisticsFee(new BigDecimal(payload.get("logisticsFee").toString()));
        }
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        
        if (items != null && !items.isEmpty()) {
            ObjectMapper mapper = new ObjectMapper();
            try {
                outboundOrder.setOutboundItems(mapper.writeValueAsString(items));
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                throw new RuntimeException("序列化出库明细失败: " + e.getMessage());
            }
            
            for (Map<String, Object> item : items) {
                Long batchId = Long.valueOf(item.get("batchId").toString());
                int quantity = Integer.valueOf(item.get("quantity").toString());
                
                StockBatch batch = stockBatchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("库存批次不存在: " + batchId));
                
                int availableForShip = batch.getAvailableQuantity() - (batch.getLockedQuantity() != null ? batch.getLockedQuantity() : 0);
                if (availableForShip < quantity) {
                    throw new RuntimeException("批次 " + batch.getBatchNo() + " 可发数量不足: 可发=" + availableForShip + ", 需要=" + quantity);
                }
                
                int newLocked = (batch.getLockedQuantity() != null ? batch.getLockedQuantity() : 0) + quantity;
                batch.setLockedQuantity(newLocked);
                stockBatchRepository.save(batch);
            }
        }
        
        OutboundOrder saved = outboundOrderRepository.save(outboundOrder);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "出库单创建成功，库存已冻结");
        response.put("data", Map.of("id", saved.getId(), "outboundNo", saved.getOutboundNo()));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/ship")
    @Transactional
    public ResponseEntity<Map<String, Object>> ship(
            @PathVariable long id,
            @RequestBody Map<String, Object> payload) {
        logger.info("=== Outbound Order Ship Request ===");
        logger.info("Payload: {}", payload);
        
        OutboundOrder outboundOrder = outboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("出库单不存在"));

        if (outboundOrder.getStatus() != OutboundOrder.Status.PENDING) {
            throw new RuntimeException("出库单状态不是待发货，无法发货");
        }

        Long logisticsProviderId = payload.get("logisticsProviderId") != null ? 
            Long.valueOf(payload.get("logisticsProviderId").toString()) : null;
        String logisticsCompany = (String) payload.get("logisticsCompany");
        String trackingNo = (String) payload.get("trackingNo");
        BigDecimal logisticsFee = payload.get("logisticsFee") != null ? 
            new BigDecimal(payload.get("logisticsFee").toString()) : BigDecimal.ZERO;
        String deliveryMethod = (String) payload.get("deliveryMethod");
        String operator = (String) payload.getOrDefault("operator", "系统");
        
        String shippedAtStr = (String) payload.get("shippedAt");
        LocalDateTime shippedAt = null;
        if (shippedAtStr != null && !shippedAtStr.isEmpty()) {
            try {
                shippedAt = LocalDateTime.parse(shippedAtStr.replace(" ", "T"));
            } catch (Exception e) {
                logger.warn("Failed to parse shippedAt: {}", shippedAtStr);
            }
        }

        logger.info("Parsed values - logisticsProviderId: {}, logisticsCompany: {}, trackingNo: {}, deliveryMethod: {}, logisticsFee: {}", 
            logisticsProviderId, logisticsCompany, trackingNo, deliveryMethod, logisticsFee);

        if (logisticsProviderId == null && logisticsCompany == null) {
            throw new RuntimeException("出库单发货必须选择物流供应商");
        }

        if (logisticsProviderId != null) {
            LogisticsProvider lp = logisticsProviderRepository.findById(logisticsProviderId)
                .orElseThrow(() -> new RuntimeException("物流供应商不存在"));
            outboundOrder.setLogisticsProvider(lp);
            if (logisticsCompany == null) logisticsCompany = lp.getName();
        }
        
        outboundOrder.setLogisticsCompany(logisticsCompany);
        outboundOrder.setTrackingNo(trackingNo);
        outboundOrder.setLogisticsFee(logisticsFee);
        outboundOrder.setDeliveryMethod(deliveryMethod);
        outboundOrder.setStatus(OutboundOrder.Status.SHIPPED);
        outboundOrder.setOutboundDate(LocalDateTime.now());
        outboundOrder.setShippedAt(shippedAt);
        outboundOrder.setConfirmedBy(operator);
        
        logger.info("After setting - trackingNo: {}, logisticsCompany: {}, deliveryMethod: {}", 
            outboundOrder.getTrackingNo(), outboundOrder.getLogisticsCompany(), outboundOrder.getDeliveryMethod());

        if (outboundOrder.getOutboundItems() != null && !outboundOrder.getOutboundItems().isEmpty()) {
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> items;
            try {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> parsedItems = mapper.readValue(outboundOrder.getOutboundItems(), List.class);
                items = parsedItems;
            } catch (Exception e) {
                throw new RuntimeException("解析出库明细失败: " + e.getMessage());
            }
            
            // 用于按SKU分组合并变动记录
            Map<Long, List<Map<String, Object>>> skuItemsMap = new HashMap<>();
            Map<Long, StockBatch> skuFirstBatchMap = new HashMap<>();
            
            for (Map<String, Object> item : items) {
                Long batchId = Long.valueOf(item.get("batchId").toString());
                int quantity = Integer.valueOf(item.get("quantity").toString());
                
                StockBatch batch = stockBatchRepository.findById(batchId)
                    .orElseThrow(() -> new RuntimeException("库存批次不存在: " + batchId));
                
                int currentLocked = batch.getLockedQuantity() != null ? batch.getLockedQuantity() : 0;
                batch.setLockedQuantity(Math.max(0, currentLocked - quantity));
                batch.setAvailableQuantity(batch.getAvailableQuantity() - quantity);
                batch.setQuantity(batch.getQuantity() - quantity);
                
                if (batch.getAvailableQuantity() <= 0) {
                    batch.setStatus(StockBatch.Status.SOLD_OUT);
                }
                stockBatchRepository.save(batch);
                
                // 按SKU分组
                Long skuId = batch.getSku() != null ? batch.getSku().getId() : 0L;
                if (!skuItemsMap.containsKey(skuId)) {
                    skuItemsMap.put(skuId, new ArrayList<>());
                    skuFirstBatchMap.put(skuId, batch);
                }
                Map<String, Object> itemData = new HashMap<>();
                itemData.put("batch", batch);
                itemData.put("quantity", quantity);
                skuItemsMap.get(skuId).add(itemData);
            }
            
            // 按SKU合并创建变动记录
            for (Map.Entry<Long, List<Map<String, Object>>> entry : skuItemsMap.entrySet()) {
                Long skuId = entry.getKey();
                List<Map<String, Object>> skuItems = entry.getValue();
                StockBatch firstBatch = skuFirstBatchMap.get(skuId);
                
                int totalQuantity = 0;
                BigDecimal totalCost = BigDecimal.ZERO;
                BigDecimal totalUnitCost = BigDecimal.ZERO;
                int batchCount = 0;
                
                for (Map<String, Object> itemData : skuItems) {
                    StockBatch batch = (StockBatch) itemData.get("batch");
                    int quantity = (Integer) itemData.get("quantity");
                    totalQuantity += quantity;
                    BigDecimal unitCost = batch.getUnitCost() != null ? batch.getUnitCost() : BigDecimal.ZERO;
                    totalCost = totalCost.add(unitCost.multiply(new BigDecimal(quantity)));
                    if (unitCost.compareTo(BigDecimal.ZERO) > 0) {
                        totalUnitCost = totalUnitCost.add(unitCost);
                        batchCount++;
                    }
                }
                
                BigDecimal avgUnitCost = batchCount > 0 ? 
                    totalUnitCost.divide(new BigDecimal(batchCount), 2, BigDecimal.ROUND_HALF_UP) : BigDecimal.ZERO;

                StockFlow flow = new StockFlow();
                flow.setStockBatch(firstBatch);
                flow.setWarehouse(firstBatch.getWarehouse());
                flow.setProduct(firstBatch.getProduct());
                flow.setSku(firstBatch.getSku());
                flow.setSpecName(firstBatch.getSku() != null && firstBatch.getSku().getSpecification() != null ? 
                    firstBatch.getSku().getSpecification() : "-");
                flow.setBatchNo(null);
                flow.setFlowType(StockFlow.FlowType.OUTBOUND);
                flow.setQuantity(-totalQuantity);
                flow.setBalanceAfter(firstBatch.getAvailableQuantity());
                flow.setReferenceNo(outboundOrder.getOutboundNo());
                flow.setReason("分仓出库发货");
                flow.setUnitCost(avgUnitCost);
                flow.setTotalCost(totalCost.negate());
                flow.setCostChange(totalCost.negate());
                flow.setRelatedSheetNo(outboundOrder.getOutboundNo());
                flow.setOperator(operator);
                stockFlowRepository.save(flow);
            }
        } else if (outboundOrder.getSalesOrder() != null) {
            SalesOrder so = outboundOrder.getSalesOrder();
            Warehouse warehouse = outboundOrder.getWarehouse();
            if (warehouse == null) {
                throw new RuntimeException("出库单缺少仓库信息");
            }
            
            for (SalesOrderItem soItem : so.getItems()) {
                Product product = soItem.getProduct();
                if (product == null && soItem.getProductId() != null) {
                    product = productRepository.findById(soItem.getProductId()).orElse(null);
                }
                if (product == null) continue;

                int quantityNeeded = soItem.getQuantity();
                List<StockBatch> batches = stockBatchRepository.findByWarehouseIdAndProductIdAndStatusOrderByExpiryDateAsc(
                    warehouse.getId(), product.getId(), StockBatch.Status.ACTIVE
                );

                // 用于合并变动记录
                int totalQuantity = 0;
                BigDecimal totalCost = BigDecimal.ZERO;
                BigDecimal totalUnitCost = BigDecimal.ZERO;
                int batchCount = 0;
                StockBatch firstBatch = null;

                int quantityDeducted = 0;
                for (StockBatch batch : batches) {
                    if (quantityDeducted >= quantityNeeded) break;
                    int available = batch.getAvailableQuantity();
                    if (available <= 0) continue;
                    int toDeduct = Math.min(available, quantityNeeded - quantityDeducted);
                    
                    batch.setAvailableQuantity(available - toDeduct);
                    batch.setQuantity(batch.getQuantity() - toDeduct);
                    stockBatchRepository.save(batch);

                    if (firstBatch == null) {
                        firstBatch = batch;
                    }
                    
                    totalQuantity += toDeduct;
                    BigDecimal unitCost = batch.getUnitCost() != null ? batch.getUnitCost() : BigDecimal.ZERO;
                    totalCost = totalCost.add(unitCost.multiply(new BigDecimal(toDeduct)));
                    if (unitCost.compareTo(BigDecimal.ZERO) > 0) {
                        totalUnitCost = totalUnitCost.add(unitCost);
                        batchCount++;
                    }

                    quantityDeducted += toDeduct;
                }
                if (quantityDeducted < quantityNeeded) {
                    throw new RuntimeException("库存不足: " + product.getName());
                }
                
                // 创建合并后的变动记录
                if (firstBatch != null) {
                    BigDecimal avgUnitCost = batchCount > 0 ? 
                        totalUnitCost.divide(new BigDecimal(batchCount), 2, BigDecimal.ROUND_HALF_UP) : BigDecimal.ZERO;

                    StockFlow flow = new StockFlow();
                    flow.setStockBatch(firstBatch);
                    flow.setWarehouse(warehouse);
                    flow.setProduct(product);
                    flow.setSku(firstBatch.getSku());
                    flow.setSpecName(firstBatch.getSku() != null && firstBatch.getSku().getSpecification() != null ? 
                        firstBatch.getSku().getSpecification() : "-");
                    flow.setBatchNo(null);
                    flow.setFlowType(StockFlow.FlowType.OUTBOUND);
                    flow.setQuantity(-totalQuantity);
                    flow.setBalanceAfter(firstBatch.getAvailableQuantity());
                    flow.setReferenceNo(outboundOrder.getOutboundNo());
                    flow.setReason("销售出库发货");
                    flow.setUnitCost(avgUnitCost);
                    flow.setTotalCost(totalCost.negate());
                    flow.setCostChange(totalCost.negate());
                    flow.setRelatedSheetNo(outboundOrder.getOutboundNo());
                    flow.setOperator(operator);
                    stockFlowRepository.save(flow);
                }
            }
            
            so.setStatus(SalesOrder.Status.SHIPPED);
            salesOrderRepository.save(so);
        }

        outboundOrderRepository.save(outboundOrder);
        
        if (logisticsFee.compareTo(BigDecimal.ZERO) > 0) {
            createOutboundDeliverySettlement(outboundOrder, logisticsFee, deliveryMethod, logisticsCompany, operator);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "出库单发货成功");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable long id) {
        OutboundOrder outboundOrder = outboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Outbound Order not found"));

        if (outboundOrder.getStatus() != OutboundOrder.Status.PENDING) {
            throw new RuntimeException("Outbound Order is not in PENDING status");
        }

        SalesOrder so = outboundOrder.getSalesOrder();
        if (so == null) {
             throw new RuntimeException("Associated Sales Order not found");
        }
        
        Warehouse warehouse = outboundOrder.getWarehouse();

        for (SalesOrderItem item : so.getItems()) {
             Product product = item.getProduct();
             if (product == null && item.getProductId() != null) {
                 long pid = item.getProductId();
                 product = productRepository.findById(pid).orElse(null);
             }
             
             if (product == null) continue;

             int quantityNeeded = item.getQuantity();
             
             List<StockBatch> batches = stockBatchRepository.findByWarehouseIdAndProductIdAndStatusOrderByExpiryDateAsc(
                 warehouse.getId(), product.getId(), StockBatch.Status.ACTIVE
             );

             int quantityDeducted = 0;

             for (StockBatch batch : batches) {
                 if (quantityDeducted >= quantityNeeded) break;
                 
                 int available = batch.getAvailableQuantity();
                 if (available <= 0) continue;

                 int toDeduct = Math.min(available, quantityNeeded - quantityDeducted);
                 
                 batch.setAvailableQuantity(available - toDeduct);
                 batch.setQuantity(batch.getQuantity() - toDeduct);
                 stockBatchRepository.save(batch);

                 BigDecimal unitCost = batch.getUnitCost() != null ? batch.getUnitCost() : BigDecimal.ZERO;
                 BigDecimal totalCost = unitCost.multiply(new BigDecimal(toDeduct));

                 StockFlow flow = new StockFlow();
                flow.setStockBatch(batch);
                flow.setWarehouse(warehouse);
                flow.setProduct(product);
                flow.setSku(batch.getSku());
                flow.setSpecName(batch.getSku() != null && batch.getSku().getSpecification() != null ? batch.getSku().getSpecification() : "-");
                flow.setBatchNo(batch.getBatchNo());
                flow.setFlowType(StockFlow.FlowType.OUTBOUND);
                flow.setQuantity(-toDeduct);
                flow.setBalanceAfter(batch.getAvailableQuantity());
                flow.setReferenceNo(outboundOrder.getOutboundNo());
                flow.setReason("Sales Outbound");
                flow.setUnitCost(unitCost);
                flow.setTotalCost(totalCost.negate());
                flow.setCostChange(totalCost.negate());
                flow.setOperator("System");
                
                stockFlowRepository.save(flow);

                 quantityDeducted += toDeduct;
             }

             if (quantityDeducted < quantityNeeded) {
                 throw new RuntimeException("Insufficient stock for product: " + product.getName());
             }
        }

        outboundOrder.setStatus(OutboundOrder.Status.SHIPPED);
        outboundOrder.setOutboundDate(LocalDateTime.now());
        outboundOrderRepository.save(outboundOrder);
        
        so.setStatus(SalesOrder.Status.SHIPPED);
        salesOrderRepository.save(so);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Confirmed successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable long id) {
        try {
            OutboundOrder outboundOrder = outboundOrderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("出库单不存在"));

            if (outboundOrder.getStatus() != OutboundOrder.Status.PENDING) {
                throw new RuntimeException("只有待发货状态的出库单才能取消");
            }

            if (outboundOrder.getOutboundItems() != null && !outboundOrder.getOutboundItems().isEmpty()) {
                ObjectMapper mapper = new ObjectMapper();
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> items = mapper.readValue(outboundOrder.getOutboundItems(), List.class);
                
                for (Map<String, Object> item : items) {
                    Long batchId = Long.valueOf(item.get("batchId").toString());
                    int quantity = Integer.valueOf(item.get("quantity").toString());
                    
                    StockBatch batch = stockBatchRepository.findById(batchId).orElse(null);
                    if (batch != null) {
                        int currentLocked = batch.getLockedQuantity() != null ? batch.getLockedQuantity() : 0;
                        batch.setLockedQuantity(Math.max(0, currentLocked - quantity));
                        stockBatchRepository.save(batch);
                    }
                }
            }

            outboundOrder.setStatus(OutboundOrder.Status.CANCELLED);
            outboundOrderRepository.save(outboundOrder);

            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "出库单已取消，冻结库存已释放");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "取消出库单失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    private String generateOutboundNo() {
        return "O" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd")) + 
               "-" + String.format("%05d", new Random().nextInt(100000));
    }

    private void createOutboundDeliverySettlement(OutboundOrder outboundOrder, BigDecimal logisticsFee,
            String deliveryMethod, String logisticsCompany, String operator) {
        
        // Check if settlement order already exists for this outbound order
        List<SettlementOrder> existingSettlements = settlementOrderRepository.findByRelatedOrderNo(outboundOrder.getOutboundNo());
        if (existingSettlements != null && !existingSettlements.isEmpty()) {
            logger.info("Settlement order already exists for outbound order: {}", outboundOrder.getOutboundNo());
            // Update existing settlement order with new logistics info
            SettlementOrder existingSettlement = existingSettlements.get(0);
            existingSettlement.setTotalAmount(logisticsFee);
            existingSettlement.setDeliveryMethod(deliveryMethod);
            existingSettlement.setLogisticsCompany(logisticsCompany);
            existingSettlement.setTrackingNo(outboundOrder.getTrackingNo());
            if (outboundOrder.getLogisticsProvider() != null) {
                existingSettlement.setLogisticsProvider(outboundOrder.getLogisticsProvider());
            }
            settlementOrderRepository.save(existingSettlement);
            return;
        }
        
        SettlementOrder settlement = new SettlementOrder();
        settlement.setType(SettlementOrder.Type.LOGISTICS);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setSourceType("出库单");
        settlement.setTotalAmount(logisticsFee);
        
        BigDecimal netAmount = logisticsFee.divide(new BigDecimal("1.06"), 2, RoundingMode.HALF_UP);
        BigDecimal taxAmount = logisticsFee.subtract(netAmount);
        settlement.setNetAmount(netAmount);
        settlement.setTaxAmount(taxAmount);
        
        settlement.setRelatedOrderNo(outboundOrder.getOutboundNo());
        settlement.setDeliveryMethod(deliveryMethod);
        settlement.setLogisticsCompany(logisticsCompany);
        settlement.setTrackingNo(outboundOrder.getTrackingNo());
        
        if (outboundOrder.getLogisticsProvider() != null) {
            settlement.setLogisticsProvider(outboundOrder.getLogisticsProvider());
        }
        
        String deliveryNo = "PS" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + 
                           String.format("%03d", new Random().nextInt(1000));
        settlement.setDeliveryNo(deliveryNo);
        settlement.setCreatedAt(LocalDateTime.now());
        settlement.setCreatedBy(operator);
        
        settlementOrderRepository.save(settlement);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        OutboundOrder oo = outboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("出库单不存在"));
        
        Map<String, Object> map = new HashMap<>();
        map.put("id", oo.getId());
        map.put("outboundNo", oo.getOutboundNo());
        map.put("sourceType", oo.getSourceType() != null ? oo.getSourceType().name() : null);
        map.put("sourceRefNo", oo.getSourceRefNo());
        map.put("status", oo.getStatus() != null ? oo.getStatus().name() : null);
        map.put("settlementStatus", oo.getSettlementStatus() != null ? oo.getSettlementStatus().name() : null);
        map.put("logisticsCompany", oo.getLogisticsCompany());
        map.put("trackingNo", oo.getTrackingNo());
        map.put("deliveryMethod", oo.getDeliveryMethod());
        map.put("logisticsFee", oo.getLogisticsFee());
        map.put("outboundDate", oo.getOutboundDate());
        map.put("shippedAt", oo.getShippedAt());
        map.put("outboundItems", oo.getOutboundItems());
        map.put("confirmedBy", oo.getConfirmedBy());
        map.put("createdAt", oo.getCreatedAt());
        map.put("updatedAt", oo.getUpdatedAt());
        map.put("consignee", oo.getConsignee());
        map.put("consigneePhone", oo.getConsigneePhone());
        map.put("consigneeAddress", oo.getConsigneeAddress());
        map.put("expectedArrival", oo.getExpectedArrival());
        map.put("remark", oo.getRemark());
        
        if (oo.getWarehouse() != null) {
            Map<String, Object> wh = new HashMap<>();
            wh.put("id", oo.getWarehouse().getId());
            wh.put("code", oo.getWarehouse().getCode());
            wh.put("name", oo.getWarehouse().getName());
            map.put("warehouse", wh);
        }
        
        if (oo.getLogisticsProvider() != null) {
            Map<String, Object> lp = new HashMap<>();
            lp.put("id", oo.getLogisticsProvider().getId());
            lp.put("name", oo.getLogisticsProvider().getName());
            map.put("logisticsProvider", lp);
        }
        
        if (oo.getSalesOrder() != null) {
            Map<String, Object> so = new HashMap<>();
            so.put("id", oo.getSalesOrder().getId());
            so.put("orderNo", oo.getSalesOrder().getOrderNo());
            map.put("salesOrder", so);
        }
        
        List<OutboundOrderLog> logs = outboundOrderLogRepository.findByOutboundOrderIdOrderByCreatedAtDesc(id);
        List<Map<String, Object>> logList = new ArrayList<>();
        for (OutboundOrderLog log : logs) {
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("id", log.getId());
            logMap.put("operator", log.getOperator());
            logMap.put("operationType", log.getOperationType());
            logMap.put("oldValue", log.getOldValue());
            logMap.put("newValue", log.getNewValue());
            logMap.put("remark", log.getRemark());
            logMap.put("createdAt", log.getCreatedAt());
            logList.add(logMap);
        }
        map.put("orderLogs", logList);
        
        List<RefundOrder> refundOrders = refundOrderRepository.findByRelatedOrderIdAndBizType(
            id, RefundOrder.BizType.OUTBOUND);
        List<Map<String, Object>> refundRecordMaps = new ArrayList<>();
        for (RefundOrder ro : refundOrders) {
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
            rMap.put("createdAt", ro.getCreatedAt());
            refundRecordMaps.add(rMap);
        }
        map.put("refundRecords", refundRecordMaps);
        
        // 查询物流单创建时间
        if (oo.getOutboundNo() != null) {
            List<SettlementOrder> settlements = settlementOrderRepository.findByRelatedOrderNoAndType(
                oo.getOutboundNo(), SettlementOrder.Type.LOGISTICS);
            if (!settlements.isEmpty()) {
                map.put("logisticsCreatedAt", settlements.get(0).getCreatedAt());
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", map);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reset")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetOutboundOrder(@PathVariable Long id) {
        OutboundOrder oo = outboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("出库单不存在"));

        if (oo.getStatus() != OutboundOrder.Status.SHIPPED) {
            throw new RuntimeException("只有已发货的出库单才能重置");
        }
        
        // Reset outbound order status
        oo.setStatus(OutboundOrder.Status.PENDING);
        oo.setTrackingNo(null);
        oo.setLogisticsCompany(null);
        oo.setLogisticsProvider(null);
        oo.setLogisticsFee(null);
        oo.setDeliveryMethod(null);
        oo.setOutboundDate(null);
        oo.setConfirmedBy(null);
        outboundOrderRepository.save(oo);
        
        // Delete related settlement orders
        List<SettlementOrder> settlements = settlementOrderRepository.findByRelatedOrderNo(oo.getOutboundNo());
        if (settlements != null && !settlements.isEmpty()) {
            settlementOrderRepository.deleteAll(settlements);
        }
        
        // Delete related outbound order logs
        outboundOrderLogRepository.deleteByOutboundOrderId(oo.getId());
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "出库单已重置为待发货状态");
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/logistics")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateLogistics(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        logger.info("=== Update Outbound Order Logistics ===");
        logger.info("Payload: {}", payload);
        
        OutboundOrder outboundOrder = outboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("出库单不存在"));

        if (outboundOrder.getStatus() != OutboundOrder.Status.SHIPPED) {
            throw new RuntimeException("只有已发货的出库单才能修改物流信息");
        }

        Long logisticsProviderId = payload.get("logisticsProviderId") != null ? 
            Long.valueOf(payload.get("logisticsProviderId").toString()) : null;
        String logisticsCompany = (String) payload.get("logisticsCompany");
        String trackingNo = (String) payload.get("trackingNo");
        BigDecimal logisticsFee = payload.get("logisticsFee") != null ? 
            new BigDecimal(payload.get("logisticsFee").toString()) : BigDecimal.ZERO;
        String deliveryMethod = (String) payload.get("deliveryMethod");

        logger.info("Parsed values - logisticsProviderId: {}, logisticsCompany: {}, trackingNo: {}, deliveryMethod: {}, logisticsFee: {}", 
            logisticsProviderId, logisticsCompany, trackingNo, deliveryMethod, logisticsFee);

        if (logisticsProviderId != null) {
            LogisticsProvider lp = logisticsProviderRepository.findById(logisticsProviderId)
                .orElseThrow(() -> new RuntimeException("物流供应商不存在"));
            outboundOrder.setLogisticsProvider(lp);
            if (logisticsCompany == null) logisticsCompany = lp.getName();
        }
        
        outboundOrder.setLogisticsCompany(logisticsCompany);
        outboundOrder.setTrackingNo(trackingNo);
        outboundOrder.setLogisticsFee(logisticsFee);
        outboundOrder.setDeliveryMethod(deliveryMethod);
        
        outboundOrderRepository.save(outboundOrder);
        
        logger.info("After update - trackingNo: {}, logisticsCompany: {}, deliveryMethod: {}", 
            outboundOrder.getTrackingNo(), outboundOrder.getLogisticsCompany(), outboundOrder.getDeliveryMethod());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "物流信息更新成功");
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<Map<String, Object>> getLogs(@PathVariable Long id) {
        List<OutboundOrderLog> logs = outboundOrderLogRepository.findByOutboundOrderIdOrderByCreatedAtDesc(id);
        
        List<Map<String, Object>> logList = new ArrayList<>();
        for (OutboundOrderLog log : logs) {
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("id", log.getId());
            logMap.put("operator", log.getOperator());
            logMap.put("operationType", log.getOperationType());
            logMap.put("oldValue", log.getOldValue());
            logMap.put("newValue", log.getNewValue());
            logMap.put("remark", log.getRemark());
            logMap.put("createdAt", log.getCreatedAt());
            logList.add(logMap);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", logList);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/update-consignee-info")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateConsigneeInfo() {
        List<OutboundOrder> orders = outboundOrderRepository.findAll();
        int updatedCount = 0;
        
        String[] receivers = {"张三", "李四", "王五"};
        String[] phones = {"13800138001", "13800138002", "13800138003"};
        String[] addresses = {
            "北京市朝阳区建国路88号",
            "上海市浦东新区陆家嘴环路1000号",
            "广州市天河区天河路385号"
        };
        String[] remarks = {"加急订单", "常规订单", "样品采购"};
        
        int idx = 0;
        for (OutboundOrder order : orders) {
            if (order.getConsignee() == null) {
                order.setConsignee(receivers[idx % receivers.length]);
                order.setConsigneePhone(phones[idx % phones.length]);
                order.setConsigneeAddress(addresses[idx % addresses.length]);
                order.setExpectedArrival(LocalDateTime.now().plusDays(7 + idx));
                order.setRemark(remarks[idx % remarks.length]);
                order.setOutboundNo("O" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd")) + 
                    "-" + String.format("%05d", idx + 1));
                outboundOrderRepository.save(order);
                updatedCount++;
                idx++;
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "更新完成，共更新 " + updatedCount + " 条出库单");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/update-outbound-no")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateOutboundNo() {
        List<OutboundOrder> orders = outboundOrderRepository.findAll();
        int updatedCount = 0;
        
        for (int i = 0; i < orders.size(); i++) {
            OutboundOrder order = orders.get(i);
            String newNo = "O" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd")) + 
                "-" + String.format("%05d", i + 1);
            order.setOutboundNo(newNo);
            outboundOrderRepository.save(order);
            updatedCount++;
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "更新完成，共更新 " + updatedCount + " 条出库单编号");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/merge-stock-flows")
    @Transactional
    public ResponseEntity<Map<String, Object>> mergeStockFlows() {
        List<StockFlow> outboundFlows = stockFlowRepository.findByFlowType(StockFlow.FlowType.OUTBOUND);
        
        Map<String, Map<Long, List<StockFlow>>> groupedFlows = new HashMap<>();
        
        for (StockFlow flow : outboundFlows) {
            String refNo = flow.getReferenceNo();
            Long skuId = flow.getSku() != null ? flow.getSku().getId() : 0L;
            
            groupedFlows.computeIfAbsent(refNo, k -> new HashMap<>())
                        .computeIfAbsent(skuId, k -> new ArrayList<>())
                        .add(flow);
        }
        
        int mergedCount = 0;
        
        for (Map.Entry<String, Map<Long, List<StockFlow>>> refEntry : groupedFlows.entrySet()) {
            for (Map.Entry<Long, List<StockFlow>> skuEntry : refEntry.getValue().entrySet()) {
                List<StockFlow> flows = skuEntry.getValue();
                
                if (flows.size() <= 1) {
                    continue;
                }
                
                int totalQuantity = 0;
                BigDecimal totalCost = BigDecimal.ZERO;
                BigDecimal totalUnitCost = BigDecimal.ZERO;
                int batchCount = 0;
                StockFlow firstFlow = flows.get(0);
                
                for (StockFlow flow : flows) {
                    totalQuantity += Math.abs(flow.getQuantity());
                    totalCost = totalCost.add(flow.getTotalCost() != null ? flow.getTotalCost().abs() : BigDecimal.ZERO);
                    if (flow.getUnitCost() != null && flow.getUnitCost().compareTo(BigDecimal.ZERO) > 0) {
                        totalUnitCost = totalUnitCost.add(flow.getUnitCost());
                        batchCount++;
                    }
                }
                
                BigDecimal avgUnitCost = batchCount > 0 ? 
                    totalUnitCost.divide(new BigDecimal(batchCount), 2, BigDecimal.ROUND_HALF_UP) : BigDecimal.ZERO;
                
                firstFlow.setQuantity(-totalQuantity);
                firstFlow.setUnitCost(avgUnitCost);
                firstFlow.setTotalCost(totalCost.negate());
                firstFlow.setCostChange(totalCost.negate());
                firstFlow.setBatchNo(null);
                stockFlowRepository.save(firstFlow);
                
                for (int i = 1; i < flows.size(); i++) {
                    stockFlowRepository.delete(flows.get(i));
                    mergedCount++;
                }
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "合并完成，共合并 " + mergedCount + " 条变动记录");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/regenerate-stock-flows")
    @Transactional
    public ResponseEntity<Map<String, Object>> regenerateStockFlows() {
        List<StockFlow> outboundFlows = stockFlowRepository.findByFlowType(StockFlow.FlowType.OUTBOUND);
        int deletedCount = outboundFlows.size();
        for (StockFlow flow : outboundFlows) {
            stockFlowRepository.delete(flow);
        }
        
        List<OutboundOrder> shippedOrders = outboundOrderRepository.findByStatus(OutboundOrder.Status.SHIPPED);
        int generatedCount = 0;
        
        ObjectMapper mapper = new ObjectMapper();
        
        for (OutboundOrder order : shippedOrders) {
            if (order.getOutboundItems() != null && !order.getOutboundItems().isEmpty()) {
                try {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> items = mapper.readValue(order.getOutboundItems(), List.class);
                    
                    Map<Long, List<Map<String, Object>>> skuItemsMap = new HashMap<>();
                    Map<Long, StockBatch> skuFirstBatchMap = new HashMap<>();
                    
                    for (Map<String, Object> item : items) {
                        Long batchId = Long.valueOf(item.get("batchId").toString());
                        int quantity = Integer.valueOf(item.get("quantity").toString());
                        
                        StockBatch batch = stockBatchRepository.findByIdWithSku(batchId).orElse(null);
                        if (batch == null) continue;
                        
                        Long skuId = batch.getSku() != null ? batch.getSku().getId() : 0L;
                        if (!skuItemsMap.containsKey(skuId)) {
                            skuItemsMap.put(skuId, new ArrayList<>());
                            skuFirstBatchMap.put(skuId, batch);
                        }
                        Map<String, Object> itemData = new HashMap<>();
                        itemData.put("batch", batch);
                        itemData.put("quantity", quantity);
                        skuItemsMap.get(skuId).add(itemData);
                    }
                    
                    for (Map.Entry<Long, List<Map<String, Object>>> entry : skuItemsMap.entrySet()) {
                        Long skuId = entry.getKey();
                        List<Map<String, Object>> skuItems = entry.getValue();
                        StockBatch firstBatch = skuFirstBatchMap.get(skuId);
                        
                        int totalQuantity = 0;
                        BigDecimal totalCost = BigDecimal.ZERO;
                        BigDecimal totalUnitCost = BigDecimal.ZERO;
                        int batchCount = 0;
                        
                        for (Map<String, Object> itemData : skuItems) {
                            StockBatch batch = (StockBatch) itemData.get("batch");
                            int quantity = (Integer) itemData.get("quantity");
                            totalQuantity += quantity;
                            BigDecimal unitCost = batch.getUnitCost() != null ? batch.getUnitCost() : BigDecimal.ZERO;
                            totalCost = totalCost.add(unitCost.multiply(new BigDecimal(quantity)));
                            if (unitCost.compareTo(BigDecimal.ZERO) > 0) {
                                totalUnitCost = totalUnitCost.add(unitCost);
                                batchCount++;
                            }
                        }
                        
                        BigDecimal avgUnitCost = batchCount > 0 ? 
                            totalUnitCost.divide(new BigDecimal(batchCount), 2, BigDecimal.ROUND_HALF_UP) : BigDecimal.ZERO;

                        StockFlow flow = new StockFlow();
                        flow.setStockBatch(firstBatch);
                        flow.setWarehouse(firstBatch.getWarehouse());
                        flow.setProduct(firstBatch.getProduct());
                        flow.setSku(firstBatch.getSku());
                        String specName = "-";
                        if (firstBatch.getSku() != null) {
                            if (firstBatch.getSku().getName() != null && !firstBatch.getSku().getName().isEmpty()) {
                                specName = firstBatch.getSku().getName();
                            } else if (firstBatch.getSku().getSpecification() != null && !firstBatch.getSku().getSpecification().isEmpty()) {
                                specName = firstBatch.getSku().getSpecification();
                            }
                        }
                        flow.setSpecName(specName);
                        flow.setBatchNo(null);
                        flow.setFlowType(StockFlow.FlowType.OUTBOUND);
                        flow.setQuantity(-totalQuantity);
                        flow.setBalanceAfter(firstBatch.getAvailableQuantity());
                        flow.setReferenceNo(order.getOutboundNo());
                        flow.setReason("分仓出库发货");
                        flow.setUnitCost(avgUnitCost);
                        flow.setTotalCost(totalCost.negate());
                        flow.setCostChange(totalCost.negate());
                        flow.setRelatedSheetNo(order.getOutboundNo());
                        flow.setOperator(order.getConfirmedBy() != null ? order.getConfirmedBy().toString() : "system");
                        stockFlowRepository.save(flow);
                        generatedCount++;
                    }
                } catch (Exception e) {
                    logger.error("处理出库单 {} 变动记录失败: {}", order.getOutboundNo(), e.getMessage());
                }
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", String.format("重新生成完成，删除 %d 条，生成 %d 条变动记录", deletedCount, generatedCount));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/receive")
    @Transactional
    public ResponseEntity<Map<String, Object>> receiveOutboundOrder(@PathVariable Long id) {
        OutboundOrder outboundOrder = outboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("出库单不存在"));
        
        if (outboundOrder.getStatus() != OutboundOrder.Status.SHIPPED) {
            throw new RuntimeException("只有已发货的出库单才能确认收货");
        }
        
        outboundOrder.setStatus(OutboundOrder.Status.RECEIVED);
        outboundOrderRepository.save(outboundOrder);
        
        OutboundOrderLog log = new OutboundOrderLog();
        log.setOutboundOrderId(outboundOrder.getId());
        log.setOperator("system");
        log.setOperationType("RECEIVE");
        log.setRemark("确认收货");
        outboundOrderLogRepository.save(log);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "收货成功");
        return ResponseEntity.ok(response);
    }
}
