package com.supplypro.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "cost_adjustment_sheets")
@EntityListeners(AuditingEntityListener.class)
public class CostAdjustmentSheet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sheet_no", nullable = false, unique = true)
    private String sheetNo;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "item_count")
    private Integer itemCount;

    @Column(name = "total_quantity")
    private Integer totalQuantity;

    @Column(name = "total_old_cost", precision = 19, scale = 2)
    private BigDecimal totalOldCost;

    @Column(name = "total_new_cost", precision = 19, scale = 2)
    private BigDecimal totalNewCost;

    @Column(name = "total_diff", precision = 19, scale = 2)
    private BigDecimal totalDiff;

    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Status status = Status.PENDING;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "reject_reason")
    private String rejectReason;

    @CreatedBy
    @Column(name = "created_by")
    private String createdBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    private List<CostAdjustmentItem> items;

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED,
        REVOKED
    }
}
