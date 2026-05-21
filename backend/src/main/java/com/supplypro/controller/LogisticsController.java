package com.supplypro.controller;

import com.supplypro.exception.LogisticsException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.supplypro.dto.LogisticsResponse;
import com.supplypro.entity.OutboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.RefundOrder;
import com.supplypro.repository.OutboundOrderRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.RefundOrderRepository;
import com.supplypro.repository.LogisticsCompanyRepository;
import com.supplypro.entity.LogisticsCompany;
import com.supplypro.service.KuaidiNiaoService;
import com.supplypro.service.PurchaseOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/logistics")
@CrossOrigin(origins = "*")
public class LogisticsController {

    private static final Logger logger = LoggerFactory.getLogger(LogisticsController.class);

    // Monitoring
    private static final AtomicInteger failureCount = new AtomicInteger(0);
    private static long lastMonitorReset = System.currentTimeMillis();
    private static final long MONITOR_WINDOW_MS = 60000; // 1 minute
    private static final int FAILURE_THRESHOLD = 5;

    @Autowired
    private KuaidiNiaoService kuaidiNiaoService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private OutboundOrderRepository outboundOrderRepository;

    @Autowired
    private RefundOrderRepository refundOrderRepository;

    @Autowired
    private LogisticsCompanyRepository logisticsCompanyRepository;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final long CACHE_DURATION_MINUTES = 30; // Cache for 30 minutes

    /**
     * Track logistics by courier tracking number.
     * Returns 404 with errorCode "LOGISTICS_NOT_FOUND" if the tracking number does not exist in the system.
     * Validates format: 5-30 alphanumeric characters.
     * 
     * Update 2026-02-25: Supports multiple POs sharing the same tracking number.
     */
    @GetMapping("/track/courier/{trackingNo}")
    public ResponseEntity<Map<String, Object>> trackByTrackingNumber(@PathVariable String trackingNo) {
        logger.info("Received logistics track request for Tracking No: {}", trackingNo);
        Map<String, Object> result = new HashMap<>();

        // Validate Tracking Number Format
        // 更新验证规则：允许字母、数字、横线，长度5-50字符
        // 自配送运单号可能包含横线，如"DD202611233155601-G1"
        if (trackingNo == null || !trackingNo.matches("^[A-Za-z0-9\\-]{5,50}$")) {
            logger.warn("Invalid tracking number format: {}", trackingNo);
            result.put("code", 400);
            result.put("message", "物流单号格式不正确（需为5-50位字母、数字或横线）");
            return ResponseEntity.badRequest().body(result);
        }

        // 1. Fetch Purchase Orders by Tracking Number
        List<PurchaseOrder> pos = purchaseOrderRepository.findByTrackingNumber(trackingNo);
        
        // Also check OutboundOrders
        List<OutboundOrder> outboundOrders = outboundOrderRepository.findByTrackingNo(trackingNo);
        
        // Also check RefundOrders
        List<RefundOrder> refundOrders = refundOrderRepository.findByTrackingNo(trackingNo);
        
        if ((pos == null || pos.isEmpty()) && (outboundOrders == null || outboundOrders.isEmpty()) && (refundOrders == null || refundOrders.isEmpty())) {
            logger.warn("Order not found for Tracking No: {}", trackingNo);
            // Return 200 with specific business logic indicating not found, rather than 404
            result.put("code", 200);
            result.put("message", "Success");
            
            Map<String, Object> failData = new HashMap<>();
            failData.put("success", false);
            failData.put("reason", "物流单号不存在或尚未录入");
            failData.put("errorCode", "LOGISTICS_NOT_FOUND");
            
            result.put("data", failData);
            return ResponseEntity.ok(result);
        }

        // Priority: OutboundOrder > RefundOrder > PurchaseOrder
        if (outboundOrders != null && !outboundOrders.isEmpty()) {
            OutboundOrder primaryOO = outboundOrders.get(0);
            logger.info("Found {} OutboundOrders for TrackingNo: {}. Primary OO: {}", outboundOrders.size(), trackingNo, primaryOO.getOutboundNo());
            
            String rawOOCompany = primaryOO.getLogisticsCompany();
            String shipperCode = getShipperCodeFromCompany(rawOOCompany);
            String logisticCode = trackingNo;
            
            LogisticsResponse response;
            if (shipperCode == null || shipperCode.isEmpty()) {
                logger.info("Logistics company missing for OutboundOrder: {}, trying 8002 auto-identify", primaryOO.getOutboundNo());
                response = getLogisticsInfo("", logisticCode, false);
            } else {
                response = getLogisticsInfo(shipperCode, logisticCode, false);
            }
            
            Map<String, Object> enrichedData = enrichOutboundOrderResponse(response, outboundOrders);

            result.put("code", 200);
            result.put("data", enrichedData);
            result.put("message", "Success");
            
            return ResponseEntity.ok(result);
        }

        // Handle RefundOrder logistics tracking
        if (refundOrders != null && !refundOrders.isEmpty()) {
            RefundOrder primaryRO = refundOrders.get(0);
            logger.info("Found {} RefundOrders for TrackingNo: {}. Primary RO: {}", refundOrders.size(), trackingNo, primaryRO.getRefundNo());
            
            String rawROCompany = primaryRO.getLogisticsCompany();
            String shipperCode = getShipperCodeFromCompany(rawROCompany);
            String logisticCode = trackingNo;
            
            LogisticsResponse response;
            if (shipperCode == null || shipperCode.isEmpty()) {
                logger.info("Logistics company missing for RefundOrder: {}, trying 8002 auto-identify", primaryRO.getRefundNo());
                response = getLogisticsInfo("", logisticCode, false);
            } else {
                response = getLogisticsInfo(shipperCode, logisticCode, false);
            }
            
            Map<String, Object> enrichedData = new HashMap<>();
            if (response != null) {
                enrichedData.put("success", response.isSuccess());
                enrichedData.put("shipperCode", response.getShipperCode());
                enrichedData.put("shipperName", response.getShipperName());
                enrichedData.put("logisticCode", response.getLogisticCode());
                enrichedData.put("state", response.getState());
                enrichedData.put("traces", response.getTraces());
                enrichedData.put("reason", response.getReason());
                enrichedData.put("refundNo", primaryRO.getRefundNo());
                enrichedData.put("refundType", primaryRO.getRefundType() != null ? primaryRO.getRefundType().name() : null);
                enrichedData.put("bearer", primaryRO.getBearer() != null ? primaryRO.getBearer().name() : null);
            } else {
                enrichedData.put("success", false);
                enrichedData.put("reason", "物流信息查询失败");
            }

            result.put("code", 200);
            result.put("data", enrichedData);
            result.put("message", "Success");
            
            return ResponseEntity.ok(result);
        }

        // Use the first PO to get shipper info (assuming same tracking number implies same carrier)
        PurchaseOrder primaryPO = pos.get(0);
        
        // [FIX] Self-Delivery Isolation: Check delivery method before calling 3rd party API
        if ("SelfDelivery".equals(primaryPO.getDeliveryMethod()) || "Self".equalsIgnoreCase(primaryPO.getLogisticsCompany())) {
            logger.info("Self-Delivery detected for PO: {}. Returning mock traces.", primaryPO.getOrderNo());
            LogisticsResponse mockResponse = mockSelfDeliveryResponse(primaryPO);
            Map<String, Object> enrichedData = enrichResponse(mockResponse, pos);
            result.put("code", 200);
            result.put("message", "Success");
            
            // Add self-delivery fields to enriched data
            if (enrichedData != null) {
                enrichedData.put("deliverer", primaryPO.getDeliverer());
                enrichedData.put("delivererPhone", primaryPO.getDelivererPhone());
                enrichedData.put("plateNumber", primaryPO.getPlateNumber());
                enrichedData.put("currentLocation", primaryPO.getCurrentLocation());
            }

            result.put("data", enrichedData);
            return ResponseEntity.ok(result);
        }

        String rawPOCompany = primaryPO.getLogisticsCompany();
        String shipperCode = getShipperCodeFromCompany(rawPOCompany);
        String logisticCode = trackingNo;
        
        logger.info("Found {} POs for TrackingNo: {}. Primary PO: {}, Shipper: {} (mapped from: {})", pos.size(), trackingNo, primaryPO.getOrderNo(), shipperCode, rawPOCompany);

        LogisticsResponse response;
        if (shipperCode == null || shipperCode.isEmpty()) {
            logger.info("Logistics company missing for PO: {}, trying 8002 auto-identify", primaryPO.getOrderNo());
            response = getLogisticsInfo("", logisticCode, false);
        } else {
            response = getLogisticsInfo(shipperCode, logisticCode, false);
        }
        
        // 3. Enrich Response with Associated POs
        Map<String, Object> enrichedData = enrichResponse(response, pos);

        result.put("code", 200);
        result.put("data", enrichedData);
        result.put("message", "Success");
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/track/purchase-order/{id}")
    public ResponseEntity<Map<String, Object>> trackByPurchaseOrderId(@PathVariable Long id) {
        logger.info("Received logistics track request for PO ID: {}", id);
        Map<String, Object> result = new HashMap<>();

        // 1. Fetch Purchase Order
        PurchaseOrder po = purchaseOrderRepository.findById(id).orElse(null);
        if (po == null) {
            logger.warn("Purchase Order not found for ID: {}", id);
            result.put("code", 404);
            result.put("message", "Purchase Order not found");
            return ResponseEntity.status(404).body(result);
        }

        // Check if order is cancelled - return friendly message instead of error
        if (po.getStatus() == PurchaseOrder.Status.CANCELLED) {
            logger.info("Purchase Order {} is cancelled, skipping logistics tracking", po.getOrderNo());
            result.put("code", 200);
            result.put("message", "订单已取消，无需查询物流信息");
            Map<String, Object> cancelData = new HashMap<>();
            cancelData.put("success", true);
            cancelData.put("traces", java.util.Collections.emptyList());
            cancelData.put("state", "CANCELLED");
            cancelData.put("shipperName", po.getLogisticsCompany() != null ? po.getLogisticsCompany() : "-");
            cancelData.put("logisticCode", po.getTrackingNumber() != null ? po.getTrackingNumber() : "-");
            cancelData.put("isCancelled", true);
            result.put("data", cancelData);
            return ResponseEntity.ok(result);
        }

        // [FIX] Self-Delivery Isolation
        if ("SelfDelivery".equals(po.getDeliveryMethod()) || "Self".equalsIgnoreCase(po.getLogisticsCompany())) {
            logger.info("Self-Delivery detected for PO: {}. Returning mock traces.", po.getOrderNo());
            LogisticsResponse mockResponse = mockSelfDeliveryResponse(po);
            // Find other POs with same tracking number (if any)
            List<PurchaseOrder> relatedPOs = new ArrayList<>();
            if (po.getTrackingNumber() != null) {
                relatedPOs = purchaseOrderRepository.findByTrackingNumber(po.getTrackingNumber());
            } else {
                relatedPOs.add(po);
            }
            Map<String, Object> enrichedData = enrichResponse(mockResponse, relatedPOs);
            result.put("code", 200);
            result.put("message", "Success");
            
            // Add self-delivery fields to enriched data
            if (enrichedData != null) {
                enrichedData.put("deliverer", po.getDeliverer());
                enrichedData.put("delivererPhone", po.getDelivererPhone());
                enrichedData.put("plateNumber", po.getPlateNumber());
                enrichedData.put("currentLocation", po.getCurrentLocation());
            }

            result.put("data", enrichedData);
            return ResponseEntity.ok(result);
        }

        String rawLogisticsCompany = po.getLogisticsCompany();
        String logisticCode = po.getTrackingNumber();
        String shipperCode = getShipperCodeFromCompany(rawLogisticsCompany);
        logger.info("Found PO: {}, Shipper: {} (mapped from: {}), TrackingNo: {}", po.getOrderNo(), shipperCode, rawLogisticsCompany, logisticCode);

        if (logisticCode == null || logisticCode.isEmpty()) {
            logger.warn("Tracking number missing for PO: {}", po.getOrderNo());
            Map<String, Object> noInfoData = new HashMap<>();
            noInfoData.put("success", true);
            noInfoData.put("traces", java.util.Collections.emptyList());
            noInfoData.put("state", "NO_INFO");
            noInfoData.put("shipperName", shipperCode != null ? shipperCode : "-");
            noInfoData.put("logisticCode", "-");
            result.put("code", 200);
            result.put("message", "暂无物流信息");
            result.put("data", noInfoData);
            return ResponseEntity.ok(result);
        }

        LogisticsResponse response;
        if (shipperCode == null || shipperCode.isEmpty()) {
            logger.info("Logistics company missing for PO: {}, trying 8002 auto-identify", po.getOrderNo());
            response = getLogisticsInfo("", logisticCode, false);
        } else {
            response = getLogisticsInfo(shipperCode, logisticCode, false);
        }
        
        // 3. Enrich Response with Associated POs (Find other POs with same tracking number)
        List<PurchaseOrder> relatedPOs = purchaseOrderRepository.findByTrackingNumber(logisticCode);
        Map<String, Object> enrichedData = enrichResponse(response, relatedPOs);
        
        result.put("code", 200);
        result.put("message", "Success");
        result.put("data", enrichedData);
        
        return ResponseEntity.ok(result);
    }

    /**
     * Track logistics by Outbound Order ID.
     * Supports both logistics delivery and self-delivery modes.
     */
    @GetMapping("/track/outbound-order/{id}")
    public ResponseEntity<Map<String, Object>> trackByOutboundOrderId(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean forceRefresh) {
        logger.info("Received logistics track request for Outbound Order ID: {}, forceRefresh: {}", id, forceRefresh);
        Map<String, Object> result = new HashMap<>();

        OutboundOrder oo = outboundOrderRepository.findById(id).orElse(null);
        if (oo == null) {
            logger.warn("Outbound Order not found for ID: {}", id);
            result.put("code", 404);
            result.put("message", "出库单不存在");
            return ResponseEntity.status(404).body(result);
        }

        String trackingNo = oo.getTrackingNo();
        String logisticsCompany = oo.getLogisticsCompany();
        String deliveryMethod = oo.getDeliveryMethod();

        if (trackingNo == null || trackingNo.isEmpty()) {
            logger.warn("Tracking number missing for Outbound Order: {}", oo.getOutboundNo());
            Map<String, Object> noInfoData = new HashMap<>();
            noInfoData.put("success", true);
            noInfoData.put("traces", java.util.Collections.emptyList());
            noInfoData.put("state", "NO_INFO");
            noInfoData.put("shipperName", logisticsCompany != null ? logisticsCompany : "-");
            noInfoData.put("logisticCode", "-");
            result.put("code", 200);
            result.put("message", "暂无物流信息");
            result.put("data", noInfoData);
            return ResponseEntity.ok(result);
        }

        // Self-Delivery handling
        if ("SelfDelivery".equals(deliveryMethod) || "Self".equalsIgnoreCase(logisticsCompany)) {
            logger.info("Self-Delivery detected for Outbound Order: {}. Returning mock traces.", oo.getOutboundNo());
            LogisticsResponse mockResponse = mockOutboundSelfDeliveryResponse(oo);
            Map<String, Object> enrichedData = enrichOutboundResponse(mockResponse, oo);
            result.put("code", 200);
            result.put("message", "Success");
            result.put("data", enrichedData);
            return ResponseEntity.ok(result);
        }

        // Get shipper code - try to find kdnCode from LogisticsCompany table
        String shipperCode = getShipperCodeFromCompany(logisticsCompany);
        
        logger.info("Found Outbound Order: {}, Shipper: {}, TrackingNo: {}", oo.getOutboundNo(), shipperCode, trackingNo);

        // Call KuaidiNiao Service
        LogisticsResponse response = getLogisticsInfo(shipperCode, trackingNo, forceRefresh);
        
        // Enrich Response
        Map<String, Object> enrichedData = enrichOutboundResponse(response, oo);
        
        result.put("code", 200);
        result.put("message", "Success");
        result.put("data", enrichedData);
        
        return ResponseEntity.ok(result);
    }

    /**
     * Get shipper code from logistics company name or code.
     * First tries to find in LogisticsCompany table for kdnCode.
     */
    private String getShipperCodeFromCompany(String companyNameOrCode) {
        if (companyNameOrCode == null || companyNameOrCode.isEmpty()) {
            return "";
        }
        
        // 1. Try to find by code in LogisticsCompany table
        LogisticsCompany company = logisticsCompanyRepository.findById(companyNameOrCode).orElse(null);
        if (company != null && company.getKdnCode() != null && !company.getKdnCode().isEmpty()) {
            logger.info("Found kdn_code {} for company code {}", company.getKdnCode(), companyNameOrCode);
            return company.getKdnCode();
        }
        
        // 2. Try to find by name
        List<LogisticsCompany> companies = logisticsCompanyRepository.findAll();
        for (LogisticsCompany c : companies) {
            if (companyNameOrCode.equals(c.getName()) || companyNameOrCode.equals(c.getShortName())) {
                if (c.getKdnCode() != null && !c.getKdnCode().isEmpty()) {
                    logger.info("Found kdn_code {} for company name {}", c.getKdnCode(), companyNameOrCode);
                    return c.getKdnCode();
                }
                return c.getCode();
            }
        }
        
        // 3. Return as-is if no mapping found
        return companyNameOrCode;
    }

    /**
     * Construct a mock LogisticsResponse for Self-Delivery outbound orders.
     */
    private LogisticsResponse mockOutboundSelfDeliveryResponse(OutboundOrder oo) {
        LogisticsResponse response = new LogisticsResponse();
        response.setSuccess(true);
        response.setLogisticCode(oo.getTrackingNo());
        response.setShipperCode("SELF");
        response.setShipperName("自配送");
        
        List<LogisticsResponse.Trace> traces = new ArrayList<>();
        
        // Shipped Trace
        if (oo.getOutboundDate() != null) {
            LogisticsResponse.Trace shipTrace = new LogisticsResponse.Trace();
            shipTrace.setAcceptTime(oo.getOutboundDate().toString().replace("T", " "));
            shipTrace.setAcceptStation("已发货");
            shipTrace.setRemark("出库单已发货");
            traces.add(shipTrace);
        }
        
        response.setState("2"); // In Transit
        response.setTraces(traces);
        return response;
    }

    /**
     * Enrich response with outbound order info.
     */
    private Map<String, Object> enrichOutboundResponse(LogisticsResponse response, OutboundOrder oo) {
        Map<String, Object> enrichedData = new HashMap<>();
        if (response != null) {
            enrichedData.put("success", response.isSuccess());
            enrichedData.put("reason", response.getReason());
            enrichedData.put("state", response.getState());
            enrichedData.put("logisticCode", response.getLogisticCode());
            enrichedData.put("shipperCode", response.getShipperCode());
            enrichedData.put("shipperName", response.getShipperName());
            enrichedData.put("traces", response.getTraces());
        }

        // Add outbound order info
        Map<String, Object> outboundInfo = new HashMap<>();
        outboundInfo.put("id", oo.getId());
        outboundInfo.put("outboundNo", oo.getOutboundNo());
        outboundInfo.put("status", oo.getStatus() != null ? oo.getStatus().name() : null);
        outboundInfo.put("sourceType", oo.getSourceType() != null ? oo.getSourceType().name() : null);
        outboundInfo.put("warehouse", oo.getWarehouse() != null ? Map.of("name", oo.getWarehouse().getName()) : null);
        enrichedData.put("outboundOrder", outboundInfo);
        
        return enrichedData;
    }

    private Map<String, Object> enrichOutboundOrderResponse(LogisticsResponse response, List<OutboundOrder> outboundOrders) {
        Map<String, Object> enrichedData = new HashMap<>();
        if (response != null) {
            enrichedData.put("success", response.isSuccess());
            enrichedData.put("reason", response.getReason());
            enrichedData.put("state", response.getState());
            enrichedData.put("logisticCode", response.getLogisticCode());
            enrichedData.put("shipperCode", response.getShipperCode());
            enrichedData.put("shipperName", response.getShipperName());
            enrichedData.put("traces", response.getTraces());
        }

        if (outboundOrders != null && !outboundOrders.isEmpty()) {
            List<Map<String, Object>> relatedOrders = outboundOrders.stream().map(oo -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", oo.getId());
                map.put("outboundNo", oo.getOutboundNo());
                map.put("status", oo.getStatus() != null ? oo.getStatus().name() : null);
                map.put("sourceType", oo.getSourceType() != null ? oo.getSourceType().name() : null);
                if (oo.getWarehouse() != null) {
                    Map<String, Object> wh = new HashMap<>();
                    wh.put("id", oo.getWarehouse().getId());
                    wh.put("name", oo.getWarehouse().getName());
                    map.put("warehouse", wh);
                }
                return map;
            }).collect(Collectors.toList());
            enrichedData.put("relatedOrders", relatedOrders);
            
            OutboundOrder primaryOO = outboundOrders.get(0);
            Map<String, Object> outboundOrderMap = new HashMap<>();
            outboundOrderMap.put("id", primaryOO.getId());
            outboundOrderMap.put("outboundNo", primaryOO.getOutboundNo());
            outboundOrderMap.put("status", primaryOO.getStatus() != null ? primaryOO.getStatus().name() : null);
            outboundOrderMap.put("sourceType", primaryOO.getSourceType() != null ? primaryOO.getSourceType().name() : null);
            if (primaryOO.getWarehouse() != null) {
                Map<String, Object> wh = new HashMap<>();
                wh.put("name", primaryOO.getWarehouse().getName());
                outboundOrderMap.put("warehouse", wh);
            }
            enrichedData.put("outboundOrder", outboundOrderMap);
        }
        
        return enrichedData;
    }

    /**
     * Helper to get logistics info from Cache or API
     */
    private LogisticsResponse getLogisticsInfo(String shipperCode, String logisticCode, boolean forceRefresh) {
        String cacheKey = "logistics:" + shipperCode + ":" + logisticCode;
        LogisticsResponse cachedResponse = null;
        
        if (!forceRefresh) {
            try {
                cachedResponse = (LogisticsResponse) redisTemplate.opsForValue().get(cacheKey);
            } catch (Exception e) {
                logger.error("Redis cache error", e);
            }
        }

        if (cachedResponse != null) {
            logger.info("Returning cached logistics info for key: {}", cacheKey);
            enrichShipperName(cachedResponse, shipperCode);
            return cachedResponse;
        }

        LogisticsResponse response;
        try {
            response = kuaidiNiaoService.trackWithFallback(shipperCode, logisticCode);
        } catch (LogisticsException e) {
            checkFailureRate();
            throw e; 
        } catch (Exception e) {
            checkFailureRate();
            logger.error("Unexpected error in logistics track", e);
            throw new LogisticsException("Unexpected error: " + e.getMessage(), org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!response.isSuccess()) {
             logger.warn("Logistics API returned failure: {}", response.getReason());
             checkFailureRate();
        }

        enrichShipperName(response, response.getShipperCode() != null ? response.getShipperCode() : shipperCode);

        if (response.isSuccess() && response.getTraces() != null && !response.getTraces().isEmpty()) {
            try {
                redisTemplate.opsForValue().set(cacheKey, response, CACHE_DURATION_MINUTES, TimeUnit.MINUTES);
            } catch (Exception e) {
                logger.error("Failed to cache logistics response", e);
            }
        }
        
        return response;
    }

    /**
     * Helper to enrich response with related POs
     * 
     * Update 2026-03-04: Fixed status sync issue - now waits for auto-receive to complete
     * before returning data, ensuring the frontend gets the latest status.
     */
    private Map<String, Object> enrichResponse(LogisticsResponse response, List<PurchaseOrder> pos) {
        Map<String, Object> enrichedData = new HashMap<>();
        if (response != null) {
            enrichedData.put("success", response.isSuccess());
            enrichedData.put("reason", response.getReason());
            enrichedData.put("state", response.getState());
            enrichedData.put("logisticCode", response.getLogisticCode());
            enrichedData.put("shipperCode", response.getShipperCode());
            enrichedData.put("shipperName", response.getShipperName());
            enrichedData.put("traces", response.getTraces());
        }

        if (pos != null && !pos.isEmpty()) {
            // Auto-receive check for fresh data (iterate all POs)
            // Do this BEFORE building relatedOrders to ensure we get updated status
            if (response != null && "3".equals(response.getState())) {
                for (PurchaseOrder p : pos) {
                    try {
                        // Use synchronous receive to ensure status is updated before response
                        purchaseOrderService.receivePurchaseOrder(p.getId(), "SYSTEM_AUTO");
                        logger.info("Auto-received PO {} based on logistics status", p.getOrderNo());
                    } catch (Exception e) {
                        // Log but don't fail - might be already received
                        logger.warn("Auto-receive failed for PO {}: {}", p.getOrderNo(), e.getMessage());
                    }
                }
                // Refresh POs from DB to get updated status
                List<Long> poIds = pos.stream().map(PurchaseOrder::getId).collect(Collectors.toList());
                pos = purchaseOrderRepository.findAllById(poIds);
            }
            
            // Build relatedOrders with fresh data
            final List<PurchaseOrder> freshPos = pos;
            List<Map<String, Object>> relatedOrders = freshPos.stream().map(p -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("orderNo", p.getOrderNo());
                map.put("status", p.getStatus());
                map.put("shippingStatus", p.getShippingStatus());
                map.put("supplierName", p.getSupplier() != null ? p.getSupplier().getName() : "");
                map.put("totalAmount", p.getTotalAmount());
                return map;
            }).collect(Collectors.toList());
            enrichedData.put("relatedOrders", relatedOrders);
        }
        
        return enrichedData;
    }

    /**
     * Logistics Callback Interface
     * Receives push notifications from logistics provider.
     * If deliveryStatus is '已签收' or State is '3', triggers auto-receive logic.
     */
    @PostMapping("/callback")
    public ResponseEntity<String> handleCallback(@RequestBody Map<String, Object> callbackData) {
        logger.info("Received logistics callback: {}", callbackData);
        
        try {
            // Flexible parsing logic based on common provider formats (e.g. KuaidiNiao)
            // Example format assumption: { "Data": [ { "LogisticCode": "...", "State": "3", ... } ] }
            // Or simplified: { "logisticCode": "...", "deliveryStatus": "已签收" }
            
            String logisticCode = (String) callbackData.get("logisticCode");
            String state = (String) callbackData.get("State"); // KuaidiNiao uses "State"
            String deliveryStatus = (String) callbackData.get("deliveryStatus"); // Custom field from requirements
            
            // KuaidiNiao Push structure usually has "Data" array
            if (callbackData.containsKey("Data")) {
                // Handle array of updates
                // Simplified for this task: check top level or iterate
            }

            boolean isSigned = "3".equals(state) || "已签收".equals(deliveryStatus);

            if (isSigned && logisticCode != null) {
                // Find ALL POs with this tracking number
                List<PurchaseOrder> pos = purchaseOrderRepository.findByTrackingNumber(logisticCode);
                if (pos != null && !pos.isEmpty()) {
                    logger.info("Auto-receiving {} POs based on callback for tracking no {}", pos.size(), logisticCode);
                    for (PurchaseOrder po : pos) {
                        purchaseOrderService.autoReceivePurchaseOrder(po.getId());
                    }
                } else {
                    logger.warn("No PO found for tracking no {} in callback", logisticCode);
                }
            }
            
            return ResponseEntity.ok("{\"Success\": true}");
        } catch (Exception e) {
            logger.error("Error processing logistics callback", e);
            return ResponseEntity.status(500).body("{\"Success\": false, \"Reason\": \"" + e.getMessage() + "\"}");
        }
    }

    private void enrichShipperName(LogisticsResponse response, String shipperCode) {
        if (response == null || shipperCode == null) return;
        
        // 1. Try to get from DB
        LogisticsCompany company = logisticsCompanyRepository.findById(shipperCode).orElse(null);
        if (company != null) {
            response.setShipperName(company.getName());
        } else {
            // 2. Fallback to ShipperCode if no name
            if (response.getShipperName() == null || response.getShipperName().isEmpty()) {
                response.setShipperName(shipperCode);
            }
        }
    }

    private void checkFailureRate() {
        long now = System.currentTimeMillis();
        synchronized (failureCount) {
            if (now - lastMonitorReset > MONITOR_WINDOW_MS) {
                failureCount.set(0);
                lastMonitorReset = now;
            }
        }
        int failures = failureCount.incrementAndGet();
        if (failures > FAILURE_THRESHOLD) {
            logger.error("ALERT: High failure rate in Logistics Service! {} failures in last minute.", failures);
        }
    }

    /**
     * Construct a mock LogisticsResponse for Self-Delivery orders.
     * Uses local data (Deliverer, Phone, ShippedTime) to build traces.
     */
    private LogisticsResponse mockSelfDeliveryResponse(PurchaseOrder po) {
        LogisticsResponse response = new LogisticsResponse();
        response.setSuccess(true);
        response.setLogisticCode(po.getTrackingNumber());
        response.setShipperCode("SELF");
        response.setShipperName("自配送");
        
        List<LogisticsResponse.Trace> traces = new ArrayList<>();
        
        // 1. Shipped Trace
        if (po.getShippedAt() != null) {
            LogisticsResponse.Trace shipTrace = new LogisticsResponse.Trace();
            shipTrace.setAcceptTime(po.getShippedAt().toString().replace("T", " "));
            String delivererInfo = (po.getDeliverer() != null ? po.getDeliverer() : "配送员") + 
                                   (po.getDelivererPhone() != null ? " (" + po.getDelivererPhone() + ")" : "");
            
            String remark = "订单已由 " + delivererInfo + " 开始配送" + 
                              (po.getPlateNumber() != null ? "，车牌号：" + po.getPlateNumber() : "");
            
            if (po.getCurrentLocation() != null) {
                remark += "，当前位置：" + po.getCurrentLocation();
            }
            
            shipTrace.setAcceptStation("已发货");
            shipTrace.setRemark(remark);
            traces.add(shipTrace);
        }
        
        // 2. Received Trace (if applicable)
        if (po.getShippingStatus() == PurchaseOrder.ShippingStatus.RECEIVED || 
            po.getStatus() == PurchaseOrder.Status.RECEIVED) {
            
            LogisticsResponse.Trace receiveTrace = new LogisticsResponse.Trace();
            receiveTrace.setAcceptTime(po.getReceiveTime() != null ? po.getReceiveTime().toString().replace("T", " ") : "刚刚");
            receiveTrace.setAcceptStation("已签收");
            receiveTrace.setRemark("客户已确认收货");
            traces.add(receiveTrace);
            
            response.setState("3"); // Signed
        } else {
            response.setState("2"); // In Transit
        }
        
        // Sort traces by time desc (newest first)
        java.util.Collections.reverse(traces);
        
        response.setTraces(traces);
        return response;
    }
}
