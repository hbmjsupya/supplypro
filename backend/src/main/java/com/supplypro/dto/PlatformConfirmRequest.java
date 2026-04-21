package com.supplypro.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PlatformConfirmRequest {
    private String orderNo; // 平台单号
    private String supplierName; // 供应商名称
    private Long supplierId;
    private String businessType; // OrderPurchase, ReplenishPurchase
    private Long productId;
    private Long skuId;
    private String specName; // 规格名称
    private Integer quantity;
    private BigDecimal cost; // 成本单价
    private String costType; // 成本承担方: Platform, Supplier
    private String expectedReceiveTime;
    private String remark;
    private String receiver; // 收货人姓名及电话
    private String address; // 收货地址
    
    // 新增透传字段
    private String bizNo;
    private String platformName;
    private String platformOrderNo; // 平台订单号
    private String thirdPartyNo; // 三方单号
    private String projectName;
}
