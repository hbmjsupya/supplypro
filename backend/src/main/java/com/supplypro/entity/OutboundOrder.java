package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
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
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "outbound_date")
    private LocalDateTime outboundDate;

    @Column(name = "confirmed_by")
    private String confirmedBy;

    @ManyToOne
    @JoinColumn(name = "logistics_provider_id")
    private LogisticsProvider logisticsProvider;

    @Column(name = "logistics_fee")
    private java.math.BigDecimal logisticsFee;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status")
    private SettlementStatus settlementStatus;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING, SHIPPED, COMPLETED, CANCELLED
    }

    public enum SettlementStatus {
        UNSETTLED, PARTIALLY_SETTLED, SETTLED
    }

    public enum SourceType {
        SALES, DROPSHIP
    }
}
