package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "prepayment_payments")
public class PrepaymentPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prepayment_approval_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PrepaymentApproval prepaymentApproval;

    @Column(name = "payment_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal paymentAmount;

    @Column(name = "bank_receipt_no", length = 100)
    private String bankReceiptNo;

    @Column(name = "payment_voucher", columnDefinition = "TEXT")
    private String paymentVoucher;

    @Column(name = "payment_by", length = 100)
    private String paymentBy;

    @Column(name = "payment_at")
    private LocalDateTime paymentAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
