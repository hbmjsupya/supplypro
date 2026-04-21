package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "stock_flows")
public class StockFlow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "stock_batch_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private StockBatch stockBatch;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sku_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Sku sku;

    @ManyToOne
    @JoinColumn(name = "warehouse_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Warehouse warehouse;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    @Column(name = "batch_no")
    private String batchNo;

    @Column(name = "spec_name", length = 100)
    private String specName;

    @Enumerated(EnumType.STRING)
    @Column(name = "flow_type", nullable = false)
    private FlowType flowType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "balance_after")
    private Integer balanceAfter;

    @Column(name = "reference_no")
    private String referenceNo;

    private String reason;
    private String operator;

    @Column(name = "unit_cost", precision = 19, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "total_cost", precision = 19, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "cost_change", precision = 19, scale = 2)
    private BigDecimal costChange;

    @Column(name = "related_sheet_no")
    private String relatedSheetNo;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum FlowType {
        INBOUND, OUTBOUND, ADJUSTMENT_IN, ADJUSTMENT_OUT, COST_ADJUSTMENT, RETURN_IN
    }
}
