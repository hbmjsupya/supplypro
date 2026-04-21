package com.supplypro.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "purchase_orders")
@EntityListeners(AuditingEntityListener.class)
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PurchaseOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @javax.persistence.Version
    private Long version;

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }


    @Column(name = "order_no", unique = true, nullable = false)
    private String orderNo;

    @Column(name = "cost_type", length = 20)
    private String costType; // PLATFORM or SUPPLIER

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_snapshot_id")
    private PurchaseOrderSnapshot currentSnapshot;

    @ManyToOne
    @JoinColumn(name = "supplier_id", nullable = false)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Supplier supplier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "delivery_date")
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd")
    // Requirement 4: Expected delivery time must be displayed raw (YYYY-MM-DD) without timezone conversion
    // 期望收货时间字段必须直接读取并显示用户录入的“预计到货时间”，不允许做任何格式转换或时区处理
    private java.time.LocalDate deliveryDate;

    @Column(name = "warehouse_id", nullable = true)
    private Long warehouseId;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("supplierId")
    private Long supplierId;

    public Long getSupplierId() {
        if (this.supplierId != null) {
            return this.supplierId;
        }
        return this.supplier != null ? this.supplier.getId() : null;
    }

    public void setSupplierId(Long supplierId) {
        this.supplierId = supplierId;
        if (supplierId != null) {
            if (this.supplier == null) {
                this.supplier = new Supplier();
            }
            this.supplier.setId(supplierId);
        }
    }
    
    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("supplierName")
    private String supplierName;

    public String getSupplierName() {
        if (this.supplierName != null) {
            return this.supplierName;
        }
        return this.supplier != null ? this.supplier.getName() : null;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }
    
    @Enumerated(EnumType.STRING)
    @Column(name = "biz_type")
    private BizType bizType; // INBOUND, PLATFORM, REPLENISHMENT

    @Column(name = "biz_no")
    private String bizNo;

    @Column(name = "platform_order_no")
    private String platformOrderNo;

    @Column(name = "platform_name")
    private String platformName;

    @Column(name = "third_party_no")
    private String thirdPartyNo;

    @Column(name = "project_name")
    private String projectName;

    @Column(columnDefinition = "TEXT")
    private String remark;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private List<PurchaseOrderItem> items = new ArrayList<>();

    // Settlement Fields
    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status")
    private SettlementStatus settlementStatus = SettlementStatus.UNSETTLED;

    @Column(name = "adjust_status")
    private String adjustStatus = "None"; // None, Pending, Approved

    @ManyToOne
    @JoinColumn(name = "settlement_id")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private SettlementOrder settlementOrder;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("inboundOrderNo")
    private String inboundOrderNo;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("inboundOrderId")
    private Long inboundOrderId;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("payableAmount")
    private BigDecimal payableAmount;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("settledAmount")
    private BigDecimal settledAmount;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("inboundOrderStatus")
    private String inboundOrderStatus;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("stockInNo")
    private String stockInNo;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("logisticsSupplierName")
    private String logisticsSupplierName;

    public String getLogisticsSupplierName() { return logisticsSupplierName; }
    public void setLogisticsSupplierName(String logisticsSupplierName) { this.logisticsSupplierName = logisticsSupplierName; }

    @Column(name = "is_from_stock_in")
    private Boolean isFromStockIn = false;

    public String getInboundOrderStatus() { return inboundOrderStatus; }
    public void setInboundOrderStatus(String inboundOrderStatus) { this.inboundOrderStatus = inboundOrderStatus; }

    public BigDecimal getPayableAmount() {
        if (this.payableAmount != null) {
            return this.payableAmount;
        }
        // 商品应结金额 = 采购单成本（不含运费）
        // 运费单独结算，不纳入商品结算金额
        return this.totalAmount != null ? this.totalAmount : BigDecimal.ZERO;
    }
    public void setPayableAmount(BigDecimal payableAmount) { this.payableAmount = payableAmount; }

    public BigDecimal getSettledAmount() { return settledAmount; }
    public void setSettledAmount(BigDecimal settledAmount) { this.settledAmount = settledAmount; }

    @Column(name = "created_by")
    @CreatedBy
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }
    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public java.time.LocalDate getDeliveryDate() { return deliveryDate; }
    public void setDeliveryDate(java.time.LocalDate deliveryDate) { this.deliveryDate = deliveryDate; }
    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }
    public BizType getBizType() { return bizType; }
    public void setBizType(BizType bizType) { this.bizType = bizType; }
    public String getBizNo() { return bizNo; }
    public void setBizNo(String bizNo) { this.bizNo = bizNo; }
    public String getPlatformOrderNo() { return platformOrderNo; }
    public void setPlatformOrderNo(String platformOrderNo) { this.platformOrderNo = platformOrderNo; }
    public String getPlatformName() { return platformName; }
    public void setPlatformName(String platformName) { this.platformName = platformName; }
    public String getThirdPartyNo() { return thirdPartyNo; }
    public void setThirdPartyNo(String thirdPartyNo) { this.thirdPartyNo = thirdPartyNo; }
    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public List<PurchaseOrderItem> getItems() { return items; }
    public void setItems(List<PurchaseOrderItem> items) { this.items = items; }
    public SettlementStatus getSettlementStatus() { return settlementStatus; }
    public void setSettlementStatus(SettlementStatus settlementStatus) { this.settlementStatus = settlementStatus; }
    public SettlementOrder getSettlementOrder() { return settlementOrder; }
    public void setSettlementOrder(SettlementOrder settlementOrder) { this.settlementOrder = settlementOrder; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "contact_phone")
    private String contactPhone;

    private String province;
    private String city;
    private String district;

    @Column(name = "detail_address")
    private String detailAddress;

    @Column(name = "is_manual_address")
    private Boolean isManualAddress = false;

    @Column(columnDefinition = "TEXT")
    private String attachments; // JSON list of file URLs (Contract, Quotation, etc.)

    @Column(columnDefinition = "TEXT", name = "shipping_proof")
    private String shippingProof; // JSON list of shipping proof file URLs

    @Column(name = "logistics_company")
    private String logisticsCompany;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "expected_arrival")
    private LocalDateTime expectedArrival;

    @Column(name = "deliverer")
    private String deliverer;

    @Column(name = "deliverer_phone")
    private String delivererPhone;

    @Column(name = "plate_number")
    private String plateNumber;

    @Column(name = "current_location")
    private String currentLocation;

    @Column(name = "logistics_state")
    private String logisticsState;

    @Column(name = "logistics_state_ex")
    private String logisticsStateEx;

    @Column(name = "logistics_traces", columnDefinition = "TEXT")
    private String logisticsTraces;

    @Column(name = "logistics_synced_at")
    private LocalDateTime logisticsSyncedAt;

    @Column(name = "logistics_fee")
    private BigDecimal logisticsFee;

    @Column(name = "freight_payable")
    private BigDecimal freightPayable;

    @Column(name = "freight_settled")
    private BigDecimal freightSettled;

    @Column(name = "delivery_method")
    private String deliveryMethod; // Logistics, SelfDelivery

    @ManyToOne
    @JoinColumn(name = "logistics_provider_id")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private LogisticsProvider logisticsProvider;

    public String getLogisticsCompany() { return logisticsCompany; }
    public void setLogisticsCompany(String logisticsCompany) { this.logisticsCompany = logisticsCompany; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public LocalDateTime getShippedAt() { return shippedAt; }
    public void setShippedAt(LocalDateTime shippedAt) { this.shippedAt = shippedAt; }

    public LocalDateTime getExpectedArrival() { return expectedArrival; }
    public void setExpectedArrival(LocalDateTime expectedArrival) { this.expectedArrival = expectedArrival; }

    public String getDeliverer() { return deliverer; }
    public void setDeliverer(String deliverer) { this.deliverer = deliverer; }

    public String getDelivererPhone() { return delivererPhone; }
    public void setDelivererPhone(String delivererPhone) { this.delivererPhone = delivererPhone; }

    public String getPlateNumber() { return plateNumber; }
    public void setPlateNumber(String plateNumber) { this.plateNumber = plateNumber; }

    public String getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(String currentLocation) { this.currentLocation = currentLocation; }

    public String getLogisticsState() { return logisticsState; }
    public void setLogisticsState(String logisticsState) { this.logisticsState = logisticsState; }

    public String getLogisticsStateEx() { return logisticsStateEx; }
    public void setLogisticsStateEx(String logisticsStateEx) { this.logisticsStateEx = logisticsStateEx; }

    public String getLogisticsTraces() { return logisticsTraces; }
    public void setLogisticsTraces(String logisticsTraces) { this.logisticsTraces = logisticsTraces; }

    public LocalDateTime getLogisticsSyncedAt() { return logisticsSyncedAt; }
    public void setLogisticsSyncedAt(LocalDateTime logisticsSyncedAt) { this.logisticsSyncedAt = logisticsSyncedAt; }

    public BigDecimal getLogisticsFee() { return logisticsFee; }
    public void setLogisticsFee(BigDecimal logisticsFee) { this.logisticsFee = logisticsFee; }

    public BigDecimal getFreightPayable() { 
        if (freightPayable != null) return freightPayable;
        return logisticsFee != null ? logisticsFee : BigDecimal.ZERO;
    }
    public void setFreightPayable(BigDecimal freightPayable) { this.freightPayable = freightPayable; }

    public BigDecimal getFreightSettled() { 
        return freightSettled != null ? freightSettled : BigDecimal.ZERO;
    }
    public void setFreightSettled(BigDecimal freightSettled) { this.freightSettled = freightSettled; }

    public String getDeliveryMethod() { return deliveryMethod; }
    public void setDeliveryMethod(String deliveryMethod) { this.deliveryMethod = deliveryMethod; }

    public LogisticsProvider getLogisticsProvider() { return logisticsProvider; }
    public void setLogisticsProvider(LogisticsProvider logisticsProvider) { this.logisticsProvider = logisticsProvider; }

    @Column(name = "receive_time")
    private LocalDateTime receiveTime;

    @Column(name = "receive_user_id")
    private Long receiveUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "receive_type")
    private ReceiveType receiveType;

    public LocalDateTime getReceiveTime() { return receiveTime; }
    public void setReceiveTime(LocalDateTime receiveTime) { this.receiveTime = receiveTime; }
    public Long getReceiveUserId() { return receiveUserId; }
    public void setReceiveUserId(Long receiveUserId) { this.receiveUserId = receiveUserId; }
    public ReceiveType getReceiveType() { return receiveType; }
    public void setReceiveType(ReceiveType receiveType) { this.receiveType = receiveType; }

    @Enumerated(EnumType.STRING)
    @Column(name = "shipping_status")
    private ShippingStatus shippingStatus = ShippingStatus.PENDING;

    public ShippingStatus getShippingStatus() { return shippingStatus; }
    public void setShippingStatus(ShippingStatus shippingStatus) { this.shippingStatus = shippingStatus; }

    public enum Type {
        STANDARD, DROPSHIP, JIT, INBOUND, REPLENISHMENT
    }

    public enum BizType {
        INBOUND("入库单"),
        PLATFORM("平台单"),
        REPLENISHMENT("补货单");

        private final String description;
        BizType(String description) { this.description = description; }
        public String getDescription() { return description; }
    }

    public enum Status {
        PENDING, CONFIRMED, SHIPPED, RECEIVED, CANCELLED, PENDING_SETTLEMENT
    }

    public enum ShippingStatus {
        PENDING,    // 待处理 - 采购单生成后，尚未执行任何发货相关操作
        TO_SHIP,    // 待发货 - 已创建发货单，但尚未导入物流信息
        SHIPPED,    // 已发货 - 已填写完整收货信息或已回填物流信息
        RECEIVED    // 已收货 - 物流显示已签收或手动确认收货
    }
    
    public enum ReceiveType {
        MANUAL, AUTO
    }

    public enum SettlementStatus {
        UNSETTLED, PARTIALLY_SETTLED, SETTLED
    }

    public Long getInboundOrderId() { return inboundOrderId; }
    public void setInboundOrderId(Long inboundOrderId) { this.inboundOrderId = inboundOrderId; }

    public PurchaseOrderSnapshot getCurrentSnapshot() { return currentSnapshot; }
    public void setCurrentSnapshot(PurchaseOrderSnapshot currentSnapshot) { this.currentSnapshot = currentSnapshot; }
}
