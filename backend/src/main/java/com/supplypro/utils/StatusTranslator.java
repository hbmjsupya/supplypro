package com.supplypro.utils;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.InboundOrder;
import java.util.HashMap;
import java.util.Map;

public class StatusTranslator {
    
    private static final Map<String, String> ORDER_STATUS_MAP = new HashMap<>();
    private static final Map<String, String> SHIPPING_STATUS_MAP = new HashMap<>();
    private static final Map<String, String> INBOUND_STATUS_MAP = new HashMap<>();
    private static final Map<String, String> DELIVERY_METHOD_MAP = new HashMap<>();
    
    static {
        ORDER_STATUS_MAP.put("PENDING", "待处理");
        ORDER_STATUS_MAP.put("CONFIRMED", "待发货");
        ORDER_STATUS_MAP.put("SHIPPED", "已发货");
        ORDER_STATUS_MAP.put("RECEIVED", "已收货");
        ORDER_STATUS_MAP.put("CANCELLED", "已取消");
        ORDER_STATUS_MAP.put("COMPLETED", "已完成");
        ORDER_STATUS_MAP.put("PENDING_SETTLEMENT", "待结算");
        ORDER_STATUS_MAP.put("PARTIAL_SETTLED", "部分结算");
        ORDER_STATUS_MAP.put("SETTLED", "已结算");
        
        SHIPPING_STATUS_MAP.put("PENDING", "待发货");
        SHIPPING_STATUS_MAP.put("SHIPPED", "已发货");
        SHIPPING_STATUS_MAP.put("IN_TRANSIT", "运输中");
        SHIPPING_STATUS_MAP.put("DELIVERED", "已送达");
        SHIPPING_STATUS_MAP.put("RECEIVED", "已收货");
        SHIPPING_STATUS_MAP.put("RETURNED", "已退货");
        
        INBOUND_STATUS_MAP.put("PENDING", "待处理");
        INBOUND_STATUS_MAP.put("SHIPPED", "已发货");
        INBOUND_STATUS_MAP.put("RECEIVED", "已收货");
        INBOUND_STATUS_MAP.put("CANCELLED", "已取消");
        
        // 配送类型中文映射
        DELIVERY_METHOD_MAP.put("SelfDelivery", "自配送");
        DELIVERY_METHOD_MAP.put("Logistics", "物流配送");
        DELIVERY_METHOD_MAP.put("Express", "快递配送");
        DELIVERY_METHOD_MAP.put("Self", "自配送");
    }
    
    public static String translateOrderStatus(PurchaseOrder.Status status) {
        if (status == null) return "未知";
        return ORDER_STATUS_MAP.getOrDefault(status.name(), status.name());
    }
    
    public static String translateOrderStatus(String statusName) {
        if (statusName == null || "NULL".equals(statusName)) return "无";
        return ORDER_STATUS_MAP.getOrDefault(statusName, statusName);
    }
    
    public static String translateShippingStatus(PurchaseOrder.ShippingStatus status) {
        if (status == null) return "未知";
        return SHIPPING_STATUS_MAP.getOrDefault(status.name(), status.name());
    }
    
    public static String translateShippingStatus(String statusName) {
        if (statusName == null || "NULL".equals(statusName)) return "无";
        return SHIPPING_STATUS_MAP.getOrDefault(statusName, statusName);
    }
    
    public static String translateInboundStatus(InboundOrder.Status status) {
        if (status == null) return "未知";
        return INBOUND_STATUS_MAP.getOrDefault(status.name(), status.name());
    }
    
    public static String translateInboundStatus(String statusName) {
        if (statusName == null || "NULL".equals(statusName)) return "无";
        return INBOUND_STATUS_MAP.getOrDefault(statusName, statusName);
    }
    
    public static String translateStatus(String statusName) {
        if (statusName == null || "NULL".equals(statusName)) return "无";
        String translated = ORDER_STATUS_MAP.get(statusName);
        if (translated != null) return translated;
        translated = SHIPPING_STATUS_MAP.get(statusName);
        if (translated != null) return translated;
        translated = INBOUND_STATUS_MAP.get(statusName);
        if (translated != null) return translated;
        return statusName;
    }
    
    public static String translateDeliveryMethod(String deliveryMethod) {
        if (deliveryMethod == null || "NULL".equals(deliveryMethod)) return "未知";
        return DELIVERY_METHOD_MAP.getOrDefault(deliveryMethod, deliveryMethod);
    }
    
    private StatusTranslator() {}
}
