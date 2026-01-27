package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no", unique = true, nullable = false)
    private String orderNo;

    @ManyToOne
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "delivery_date")
    private LocalDateTime deliveryDate;

    @Column(name = "warehouse_id")
    private Long warehouseId;
    
    @Column(name = "biz_type")
    private String bizType; // PURCHASE, REPLENISHMENT

    @Column(columnDefinition = "TEXT")
    private String remark;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderItem> items = new ArrayList<>();

    // Settlement Fields
    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status")
    private SettlementStatus settlementStatus = SettlementStatus.UNSETTLED;

    @ManyToOne
    @JoinColumn(name = "settlement_id")
    private SettlementOrder settlementOrder;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum Type {
        STANDARD, DROPSHIP, JIT
    }

    public enum Status {
        PENDING, CONFIRMED, SHIPPED, RECEIVED, COMPLETED, CANCELLED
    }

    public enum SettlementStatus {
        UNSETTLED, PARTIALLY_SETTLED, SETTLED
    }
}
