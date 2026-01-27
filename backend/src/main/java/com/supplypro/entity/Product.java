package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sku_code", unique = true, nullable = false)
    private String skuCode;

    @Column(nullable = false)
    private String name;

    private String brand;
    private String category;
    private String spec;

    @Column(name = "cost_price", nullable = false)
    private BigDecimal costPrice;

    @Column(name = "tax_class")
    private String taxClass;

    @Column(name = "tax_rate")
    private BigDecimal taxRate;

    @Column(name = "tax_code")
    private String taxCode;

    @Column(name = "logistics_template")
    private String logisticsTemplate;

    @Column(name = "promo_file")
    private String promoFile;

    @Column(name = "is_bundle")
    private Boolean isBundle = false;

    @Enumerated(EnumType.STRING)
    private Status status;

    @ManyToOne
    @JoinColumn(name = "default_supplier_id")
    private Supplier defaultSupplier;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING_SELECTION, SELECTED, ON_SHELF, OFF_SHELF
    }
}
