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

@Data
@Entity
@Table(name = "cost_adjustment_items")
@EntityListeners(AuditingEntityListener.class)
public class CostAdjustmentItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sheet_id", nullable = false)
    private Long sheetId;

    @Column(name = "purchase_order_id", nullable = false)
    private Long purchaseOrderId;

    @Column(name = "po_no", nullable = false)
    private String poNo;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "sku_code")
    private String skuCode;

    @Column(name = "sku_id")
    private Long skuId;

    @Column(name = "spec_name")
    private String specName;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "old_cost", precision = 19, scale = 2)
    private BigDecimal oldCost;

    @Column(name = "new_cost", precision = 19, scale = 2)
    private BigDecimal newCost;

    @Column(name = "unit_diff", precision = 19, scale = 2)
    private BigDecimal unitDiff;

    @Column(name = "total_diff", precision = 19, scale = 2)
    private BigDecimal totalDiff;

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
    private String sheetNo;

    @Transient
    private CostAdjustmentSheet.Status status;

    @Transient
    private String reason;
}
