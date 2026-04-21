package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "refund_orders")
public class RefundOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "refund_no", unique = true, nullable = false, length = 30)
    private String refundNo;

    @Column(name = "platform_refund_no", length = 50)
    private String platformRefundNo;

    @Column(name = "platform_order_no", length = 50)
    private String platformOrderNo;

    @Column(name = "platform_sub_order_no", length = 50)
    private String platformSubOrderNo;

    @Enumerated(EnumType.STRING)
    @Column(name = "biz_type", nullable = false, length = 20)
    private BizType bizType;

    @Column(name = "related_order_no", length = 50)
    private String relatedOrderNo;

    @Column(name = "related_order_id")
    private Long relatedOrderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_type", nullable = false, length = 20)
    private RefundType refundType;

    @Enumerated(EnumType.STRING)
    @Column(name = "bearer", nullable = false, length = 20)
    private Bearer bearer;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "applicant", length = 100)
    private String applicant;

    @Column(name = "refund_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name", length = 200)
    private String productName;

    @Column(name = "sku_id")
    private Long skuId;

    @Column(name = "spec_name", length = 100)
    private String specName;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "return_address", length = 500)
    private String returnAddress;

    @Column(name = "return_consignee", length = 100)
    private String returnConsignee;

    @Column(name = "return_phone", length = 20)
    private String returnPhone;

    @Column(name = "logistics_company", length = 100)
    private String logisticsCompany;

    @Column(name = "tracking_no", length = 100)
    private String trackingNo;

    @Column(name = "logistics_shipped_at")
    private LocalDateTime logisticsShippedAt;

    @Column(name = "confirm_received_by", length = 100)
    private String confirmReceivedBy;

    @Column(name = "confirm_received_at")
    private LocalDateTime confirmReceivedAt;

    @Column(name = "approval_remark", length = 500)
    private String approvalRemark;

    @Column(name = "approval_time")
    private LocalDateTime approvalTime;

    @Column(name = "remark", length = 500)
    private String remark;

    @Column(name = "settlement_status", length = 20)
    private String settlementStatus;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum BizType {
        PURCHASE, OUTBOUND
    }

    public enum RefundType {
        REFUND_ONLY, REFUND_RETURN
    }

    public enum Bearer {
        SUPPLIER, PLATFORM
    }

    public enum Status {
        PENDING, RETURNING, RECEIVED, COMPLETED, CANCELLED
    }
}
