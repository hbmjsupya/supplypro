package com.supplypro.service;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface PurchaseOrderService {
    
    Page<PurchaseOrder> getPurchaseOrders(Specification<PurchaseOrder> spec, Pageable pageable);

    PurchaseOrder generateInboundPurchaseOrder(PurchaseOrder poData);

    /**
     * Create a general purchase order (non-inbound).
     * @param order The purchase order data
     * @return The created purchase order
     */
    PurchaseOrder createGeneralPurchaseOrder(PurchaseOrder order);

    /**
     * Create purchase order from platform confirmation
     * @param request Platform confirm data
     * @return Created purchase order
     */
    PurchaseOrder createFromPlatformConfirm(com.supplypro.dto.PlatformConfirmRequest request);

    /**
     * Save a Purchase Order entity
     * @param savedPo The saved Purchase Order entity (must have ID and items)
     * @return The created Inbound Order
     */
    InboundOrder createInboundOrder(PurchaseOrder savedPo);

    void shipPurchaseOrder(Long id);

    void updateLogisticsInfo(Long id, String company, String trackingNo, java.time.LocalDateTime shippedAt, java.time.LocalDateTime expectedArrival, String deliverer, String delivererPhone, String plateNumber, java.math.BigDecimal logisticsFee, Long logisticsProviderId, String deliveryMethod);

    /**
     * Ship order with logistics info - for first time shipping.
     * This method allows shipping from PENDING/TO_SHIP status with logistics info.
     */
    void shipWithLogisticsInfo(Long id, String company, String trackingNo, java.time.LocalDateTime shippedAt, java.time.LocalDateTime expectedArrival, String deliverer, String delivererPhone, String plateNumber, java.math.BigDecimal logisticsFee, Long logisticsProviderId, String deliveryMethod);

    /**
     * Check if a waybill number is duplicated with existing fee > 0.
     * @param waybillNo The tracking number
     * @param deliveryType The delivery method (Logistics/SelfDelivery)
     * @param excludePurchaseNo The current purchase order number to exclude
     * @return Result map with hasDuplicate, duplicatePurchaseNo, duplicateAmount
     */
    java.util.Map<String, Object> checkWaybill(String waybillNo, String deliveryType, String excludePurchaseNo);

    /**
     * Batch adjust cost for purchase orders.
     * @param adjustments List of adjustment data (poNo, newCost, reason)
     * @return Result summary
     */
    java.util.Map<String, Object> batchAdjustCost(java.util.List<java.util.Map<String, Object>> adjustments);

    /**
     * Automatically mark Purchase Order as RECEIVED based on logistics status.
     * Triggered when logistics tracking indicates "Signed".
     * @param purchaseOrderId The ID of the Purchase Order
     */
    void autoReceivePurchaseOrder(Long purchaseOrderId);

    /**
     * Manually mark Purchase Order as RECEIVED by user.
     * @param id The ID of the Purchase Order
     * @param operator The operator name (User ID or Name)
     */
    void receivePurchaseOrder(Long id, String operator);
}
