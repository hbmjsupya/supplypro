package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "outbound_orders")
public class OutboundOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "outbound_no", unique = true, nullable = false)
    private String outboundNo;

    @ManyToOne
    @JoinColumn(name = "sales_order_id")
    private SalesOrder salesOrder;

    @Column(name = "source_type")
    @Enumerated(EnumType.STRING)
    private SourceType sourceType;

    @Column(name = "source_ref_no")
    private String sourceRefNo;

    @ManyToOne
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "outbound_date")
    private LocalDateTime outboundDate;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "confirmed_by")
    private String confirmedBy;

    @ManyToOne
    @JoinColumn(name = "logistics_provider_id")
    private LogisticsProvider logisticsProvider;

    @Column(name = "logistics_fee")
    private BigDecimal logisticsFee;

    @Column(name = "logistics_company")
    private String logisticsCompany;

    @Column(name = "tracking_no")
    private String trackingNo;

    @Column(name = "delivery_method")
    private String deliveryMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status")
    private SettlementStatus settlementStatus;

    @Column(name = "outbound_items", columnDefinition = "TEXT")
    private String outboundItems;

    @Column(name = "consignee")
    private String consignee;

    @Column(name = "consignee_phone")
    private String consigneePhone;

    @Column(name = "consignee_address")
    private String consigneeAddress;

    @Column(name = "expected_arrival")
    private LocalDateTime expectedArrival;

    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING, SHIPPED, RECEIVED, COMPLETED, CANCELLED
    }

    public enum SettlementStatus {
        UNSETTLED, PARTIALLY_SETTLED, SETTLED
    }

    public enum SourceType {
        SALES, DROPSHIP, PURCHASE
    }
}
