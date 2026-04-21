package com.supplypro.entity;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "prepayment_approvals")
public class PrepaymentApproval {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "approval_no", unique = true, nullable = false, length = 30)
    private String approvalNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logistics_provider_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private LogisticsProvider logisticsProvider;

    @Column(name = "owner_type", length = 20)
    private String ownerType;

    @Column(name = "applied_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal appliedAmount;

    @Column(name = "actual_amount", precision = 19, scale = 2)
    private BigDecimal actualAmount;

    @Column(name = "payer_name", length = 100)
    private String payerName;

    @Column(name = "payer_account", length = 100)
    private String payerAccount;

    @Column(name = "payer_bank", length = 100)
    private String payerBank;

    @Column(name = "payee_name", length = 100)
    private String payeeName;

    @Column(name = "payee_account", length = 100)
    private String payeeAccount;

    @Column(name = "payee_bank", length = 100)
    private String payeeBank;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(columnDefinition = "TEXT")
    private String attachments;

    @Column(name = "apply_remark", columnDefinition = "TEXT")
    private String applyRemark;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Status status;

    @Column(name = "bank_receipt_no", length = 100)
    private String bankReceiptNo;

    @Column(name = "payment_voucher", columnDefinition = "TEXT")
    private String paymentVoucher;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "cashier_by", length = 100)
    private String cashierBy;

    @Column(name = "cashier_at")
    private LocalDateTime cashierAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "cost_invoice_amount", precision = 19, scale = 2)
    private BigDecimal costInvoiceAmount;

    @Column(name = "cost_invoice_received", precision = 19, scale = 2)
    private BigDecimal costInvoiceReceived;

    @Column(name = "cost_invoice_status", length = 20)
    private String costInvoiceStatus;

    @Column(name = "cost_invoice_files", columnDefinition = "TEXT")
    private String costInvoiceFiles;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING, APPROVED, PAID, REJECTED, WITHDRAWN, PARTIAL_PAID
    }
}
