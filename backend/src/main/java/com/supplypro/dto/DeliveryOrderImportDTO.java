package com.supplypro.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DeliveryOrderImportDTO {
    private Integer rowNum;
    private String orderNo;
    private String tag;
    private String supplierName;
    private String productInfo;
    private String productSpec;
    private Integer quantity;
    private BigDecimal costUnitPrice;
    private BigDecimal costTotalPrice;
    private String orderTime;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String expectedArrivalTime;
    private String orderRemark;
    private String logisticsSupplier;
    private String deliveryMethod;
    private String logisticsCompany;
    private String trackingNumber;
    private String logisticsRemark;
    private String deliverer;
    private String delivererPhone;
    private String plateNumber;
    private BigDecimal fee;
    
    private boolean success;
    private String errorMessage;
    private String warningMessage;
    
    public String getDeliveryMethodNormalized() {
        if (deliveryMethod == null || deliveryMethod.trim().isEmpty()) {
            return null;
        }
        String trimmed = deliveryMethod.trim();
        if (trimmed.contains("物流") || trimmed.equals("物流配送") || trimmed.equalsIgnoreCase("Logistics")) {
            return "Logistics";
        }
        if (trimmed.contains("自配") || trimmed.equals("自配送") || trimmed.equalsIgnoreCase("SelfDelivery")) {
            return "SelfDelivery";
        }
        return null;
    }
}
