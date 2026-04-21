package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "inbound_orders")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InboundOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inbound_no", unique = true, nullable = false)
    private String inboundNo;

    @ManyToOne
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    @OneToMany(mappedBy = "inboundOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<InboundOrderItem> items;

    @ManyToOne
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "inbound_date")
    private LocalDateTime inboundDate;

    // Delivery Info
    @Column(name = "province")
    private String province;
    @Column(name = "city")
    private String city;
    @Column(name = "district")
    private String district;
    @Column(name = "detail_address")
    private String detailAddress;
    @Column(name = "warehouse_code")
    private String warehouseCode;

    // Contact Info
    @Column(name = "contact_name")
    private String contactName;
    @Column(name = "contact_phone")
    private String contactPhone;
    @Column(name = "contact_email")
    private String contactEmail;

    // Logistics Info
    @Column(name = "logistics_company")
    private String logisticsCompany;
    @Column(name = "tracking_no")
    private String trackingNo;
    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;
    @Column(name = "expected_arrival")
    private LocalDateTime expectedArrival;
    @Column(name = "actual_arrival")
    private LocalDateTime actualArrival;

    @Column(name = "deliverer")
    private String deliverer;

    @Column(name = "deliverer_phone")
    private String delivererPhone;

    @Column(name = "plate_number")
    private String plateNumber;

    @Column(name = "logistics_fee")
    private java.math.BigDecimal logisticsFee;

    @Column(name = "confirmed_by")
    private String confirmedBy;

    @Column(name = "confirmed_ip")
    private String confirmedIp;

    // Snapshot of delivery info from Warehouse or Manual Override
    // Deprecated but kept for backward compatibility if needed, though we should migrate
    @Column(name = "delivery_address")
    private String deliveryAddress;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public enum Status {
        PENDING, RECEIVED, CANCELLED
    }

    @Transient
    public PurchaseOrder.ShippingStatus getShippingStatus() {
        return purchaseOrder != null ? purchaseOrder.getShippingStatus() : null;
    }
}
