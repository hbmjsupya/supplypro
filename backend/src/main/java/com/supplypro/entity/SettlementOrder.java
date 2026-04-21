package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "settlement_orders")
public class SettlementOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "settlement_no", unique = true)
    private String settlementNo; // 结算单号，待结算配送单创建时为null，发起结算时生成

    @Column(name = "delivery_no")
    private String deliveryNo; // 配送单号，待结算配送单创建时生成

    @Column(name = "delivery_ids", columnDefinition = "TEXT")
    private String deliveryIds; // 关联的配送单ID列表（JSON格式），结算单创建时记录关联的配送单

    @Column(name = "settlement_items", columnDefinition = "TEXT")
    private String settlementItems; // 结算的业务变动记录列表（JSON格式），包含bizType, rawId, amount等

    @ManyToOne
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne
    @JoinColumn(name = "logistics_provider_id")
    private LogisticsProvider logisticsProvider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(name = "related_order_no")
    private String relatedOrderNo;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "tax_amount")
    private BigDecimal taxAmount;

    @Column(name = "net_amount")
    private BigDecimal netAmount;

    @Column(name = "auditor")
    private String auditor;

    @Column(name = "audit_time")
    private LocalDateTime auditTime;

    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "payment_date")
    private LocalDateTime paymentDate;

    @Column(name = "payment_method")
    private String paymentMethod;
    
    @Column(name = "payment_proof")
    private String paymentProof;
    
    @Column(name = "delivery_method")
    private String deliveryMethod;
    
    @Column(name = "logistics_company", length = 100)
    private String logisticsCompany;

    @Column(name = "tracking_no", length = 100)
    private String trackingNo; // 物流单号/运单号

    @Column(name = "shipping_status")
    private String shippingStatus; // SHIPPED, RECEIVED

    @Column(name = "remark", length = 500)
    private String remark; // 备注

    @Column(name = "revoke_remark", length = 500)
    private String revokeRemark; // 撤销备注

    @Column(name = "source_type")
    private String sourceType; // 来源类型：配送单、采购单等

    @Column(name = "settlement_period")
    private Integer settlementPeriod; // 结算周期（天数）

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSettlementNo() { return settlementNo; }
    public void setSettlementNo(String settlementNo) { this.settlementNo = settlementNo; }
    public String getDeliveryNo() { return deliveryNo; }
    public void setDeliveryNo(String deliveryNo) { this.deliveryNo = deliveryNo; }
    public String getDeliveryIds() { return deliveryIds; }
    public void setDeliveryIds(String deliveryIds) { this.deliveryIds = deliveryIds; }
    public String getSettlementItems() { return settlementItems; }
    public void setSettlementItems(String settlementItems) { this.settlementItems = settlementItems; }
    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }
    public LogisticsProvider getLogisticsProvider() { return logisticsProvider; }
    public void setLogisticsProvider(LogisticsProvider logisticsProvider) { this.logisticsProvider = logisticsProvider; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public String getRelatedOrderNo() { return relatedOrderNo; }
    public void setRelatedOrderNo(String relatedOrderNo) { this.relatedOrderNo = relatedOrderNo; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentProof() { return paymentProof; }
    public void setPaymentProof(String paymentProof) { this.paymentProof = paymentProof; }
    public String getDeliveryMethod() { return deliveryMethod; }
    public void setDeliveryMethod(String deliveryMethod) { this.deliveryMethod = deliveryMethod; }
    public String getLogisticsCompany() { return logisticsCompany; }
    public void setLogisticsCompany(String logisticsCompany) { this.logisticsCompany = logisticsCompany; }
    public String getTrackingNo() { return trackingNo; }
    public void setTrackingNo(String trackingNo) { this.trackingNo = trackingNo; }
    public String getShippingStatus() { return shippingStatus; }
    public void setShippingStatus(String shippingStatus) { this.shippingStatus = shippingStatus; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public Integer getSettlementPeriod() { return settlementPeriod; }
    public void setSettlementPeriod(Integer settlementPeriod) { this.settlementPeriod = settlementPeriod; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }
    public String getAuditor() { return auditor; }
    public void setAuditor(String auditor) { this.auditor = auditor; }
    public LocalDateTime getAuditTime() { return auditTime; }
    public void setAuditTime(LocalDateTime auditTime) { this.auditTime = auditTime; }

    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }

    public String getRevokeRemark() { return revokeRemark; }
    public void setRevokeRemark(String revokeRemark) { this.revokeRemark = revokeRemark; }

    public BigDecimal getCostInvoiceAmount() { return costInvoiceAmount; }
    public void setCostInvoiceAmount(BigDecimal costInvoiceAmount) { this.costInvoiceAmount = costInvoiceAmount; }
    public BigDecimal getCostInvoiceReceived() { return costInvoiceReceived; }
    public void setCostInvoiceReceived(BigDecimal costInvoiceReceived) { this.costInvoiceReceived = costInvoiceReceived; }
    public String getCostInvoiceStatus() { return costInvoiceStatus; }
    public void setCostInvoiceStatus(String costInvoiceStatus) { this.costInvoiceStatus = costInvoiceStatus; }
    public String getCostInvoiceFiles() { return costInvoiceFiles; }
    public void setCostInvoiceFiles(String costInvoiceFiles) { this.costInvoiceFiles = costInvoiceFiles; }

    @Column(name = "cost_invoice_amount")
    private BigDecimal costInvoiceAmount; // 应收成本票金额

    @Column(name = "cost_invoice_received")
    private BigDecimal costInvoiceReceived; // 已收成本票金额

    @Column(name = "cost_invoice_status")
    private String costInvoiceStatus; // 成本票状态： 未上传/部分上传/已上传

    @Column(name = "cost_invoice_files", columnDefinition = "TEXT")
    private String costInvoiceFiles; // 成本票文件列表（JSON格式）

    public enum Type {
        PURCHASE, LOGISTICS
    }

    @Column(name = "payee_account_type", length = 50)
    private String payeeAccountType;

    @Column(name = "payee_account_name", length = 100)
    private String payeeAccountName;

    @Column(name = "payee_bank", length = 100)
    private String payeeBank;

    @Column(name = "payee_account", length = 100)
    private String payeeAccount;

    public enum Status {
        PENDING,    
        SETTLED,    
        PAID,       
        REVOKED,    
        REJECTED    
    }
}
