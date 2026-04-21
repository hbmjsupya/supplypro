package com.supplypro.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "purchase_order_snapshots")
@EntityListeners(AuditingEntityListener.class)
public class PurchaseOrderSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purchase_order_id", nullable = false)
    private Long purchaseOrderId;

    @Column(nullable = false)
    private Integer version;

    @Column(name = "snapshot_hash", nullable = false, length = 64)
    private String snapshotHash;

    @Column(name = "snapshot_data", nullable = false, columnDefinition = "LONGTEXT")
    private String snapshotData;

    // Searchable fields (Denormalized)
    @Column(name = "order_no", nullable = false)
    private String orderNo;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "status")
    private String status;

    @Column(name = "shipping_status")
    private String shippingStatus;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt; // PO creation time

    @Column(name = "created_by")
    private String createdBy; // PO creator

    @Column(name = "snapshot_created_at", nullable = false, updatable = false)
    @CreatedDate
    private LocalDateTime snapshotCreatedAt;

    @Column(name = "snapshot_created_by")
    private String snapshotCreatedBy;

    @Column(name = "is_latest")
    private Boolean isLatest = true;
    
    @Column(name = "is_from_stock_in")
    private Boolean isFromStockIn = false;

    @Column(name = "project")
    private String project;

    @Column(name = "settlement_status")
    private String settlementStatus;

    @Column(name = "biz_type")
    private String bizType;

    @Column(name = "type")
    private String type;

    @Column(name = "platform_order_no")
    private String platformOrderNo;

    @Column(name = "platform_name")
    private String platformName;

    @Column(name = "third_party_no")
    private String thirdPartyNo;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "biz_no")
    private String bizNo;

    @Column(name = "delivery_date")
    private java.time.LocalDate deliveryDate;

    @Column(name = "inbound_order_no")
    private String inboundOrderNo;

    @Column(name = "inbound_order_id")
    private Long inboundOrderId;

    @Column(name = "snapshot_type", nullable = false)
    private String snapshotType = "NORMAL"; // NORMAL, BACKFILL

    @Column(name = "product_names", columnDefinition = "TEXT")
    private String productNames;

    @Column(name = "product_specs", columnDefinition = "TEXT")
    private String productSpecs;

    public String getPlatformName() { return platformName; }
    public void setPlatformName(String platformName) { this.platformName = platformName; }
    public String getThirdPartyNo() { return thirdPartyNo; }
    public void setThirdPartyNo(String thirdPartyNo) { this.thirdPartyNo = thirdPartyNo; }
    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }
}
