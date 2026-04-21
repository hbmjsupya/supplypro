package com.supplypro.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class InboundOrderUpdateRequest {
    // Contact Info
    private String contactName;
    private String contactPhone;
    private String contactEmail;

    // Address Info
    private String province;
    private String city;
    private String district;
    private String detailAddress;
    private String warehouseCode;

    // Logistics Info
    private String logisticsCompany;
    private String trackingNo;
    private LocalDateTime shippedAt;
    private LocalDateTime expectedArrival;
    private LocalDateTime actualArrival;
}
