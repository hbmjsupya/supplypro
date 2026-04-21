package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "product_bundles")
public class ProductBundle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "parent_product_id", nullable = false)
    private Long parentProductId;

    @Column(name = "child_product_id", nullable = false)
    private Long childProductId;

    // Optional: bind to specific SKU if needed, for now just Product
    // @Column(name = "child_sku_id")
    // private Long childSkuId;

    @Column(nullable = false)
    private Integer quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_product_id", insertable = false, updatable = false)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Product parentProduct;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_product_id", insertable = false, updatable = false)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Product childProduct;
}
