package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Entity
@Table(name = "purchase_order_items")
public class PurchaseOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private PurchaseOrder purchaseOrder;

    @Column(name = "product_id")
    @NotNull(message = "Product ID cannot be null")
    @JsonProperty("productId")
    @com.fasterxml.jackson.annotation.JsonAlias("product_id")
    private Long productId;

    @ManyToOne
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    @JsonIgnore
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    @Column(name = "spec")
    @JsonProperty("spec")
    private String spec;

    @Transient
    private String productName;

    @Transient
    private String skuCode;

    @Transient
    private String specName;

    @Transient
    @JsonProperty("productName")
    public String getProductName() {
        if (this.productName != null) return this.productName;
        try {
            return product != null ? product.getName() : null;
        } catch (Exception e) {
            // Handle case where product record is missing (EntityNotFoundException)
            return "Unknown Product (ID: " + productId + ")";
        }
    }

    @JsonProperty("productName")
    public void setProductName(String productName) {
        this.productName = productName;
    }

    @Transient
    @JsonProperty("skuCode")
    public String getSkuCode() {
        if (this.skuCode != null) return this.skuCode;
        try {
            return product != null ? product.getSkuCode() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("skuCode")
    public void setSkuCode(String skuCode) {
        this.skuCode = skuCode;
    }

    @Transient
    @JsonProperty("specName")
    public String getSpecName() {
        if (this.specName != null) return this.specName;
        return spec != null ? spec : "Standard";
    }

    @JsonProperty("specName")
    public void setSpecName(String specName) {
        this.specName = specName;
    }

    @Transient
    private String productImage;

    @Transient
    @JsonProperty("productImage")
    public String getProductImage() {
        if (this.productImage != null) return this.productImage;
        try {
            return product != null ? product.getPromoFile() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("productImage")
    public void setProductImage(String productImage) {
        this.productImage = productImage;
    }
}
