package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "products")
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sku_code", unique = true, nullable = false)
    private String skuCode; // Product Code / SPU Code

    @Column(nullable = false)
    private String name;

    // Brand Info
    @Column(name = "brand_id")
    private Long brandId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", insertable = false, updatable = false)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Brand brand;

    @Column(name = "brand_zh_name")
    private String brandZhName;

    @Column(name = "brand_en_name")
    private String brandEnName;

    @Column(name = "brand_logo")
    private String brandLogo;

    @Transient
    public String getDisplayBrandName() {
        return brand != null ? brand.getName() : brandZhName;
    }

    // Category Info
    @Column(name = "category_code")
    private String categoryCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_code", referencedColumnName = "category_id", insertable = false, updatable = false)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private ProductCategory productCategory;

    @Column(name = "category_name")
    private String categoryName;

    @Column(name = "category_version")
    private String categoryVersion;

    // Tax Info
    @Column(name = "tax_class")
    private String taxClass; // Name

    @Column(name = "tax_rate")
    private BigDecimal taxRate;

    @Column(name = "tax_code")
    private String taxCode; // Code

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tax_code", referencedColumnName = "category_code", insertable = false, updatable = false)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private TaxCategory taxCategory;

    @Column(name = "tax_effective_date")
    private LocalDateTime taxEffectiveDate;

    @Column(name = "logistics_template")
    private String logisticsTemplate;

    @Column(name = "promo_file")
    private String promoFile;

    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING_SELECTION;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private List<Sku> skus = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    @CreatedBy
    private String createdBy;

    @Column(name = "updated_by")
    @LastModifiedBy
    private String updatedBy;

    public enum Status {
        PENDING_SELECTION, SELECTED, ON_SHELF, OFF_SHELF, ACTIVE;

        @com.fasterxml.jackson.annotation.JsonCreator
        public static Status fromString(String value) {
            if (value == null) {
                return null;
            }
            // Standardize to uppercase
            String upper = value.toUpperCase();
            
            // Try direct match
            try {
                return Status.valueOf(upper);
            } catch (IllegalArgumentException e) {
                // Try common camelCase to SNAKE_CASE mappings if direct match fails
                if ("PENDINGSELECTION".equals(upper)) return PENDING_SELECTION;
                if ("ONSHELF".equals(upper)) return ON_SHELF;
                if ("OFFSHELF".equals(upper)) return OFF_SHELF;
                
                // Fallback: iterate and check if name matches ignoring underscores (fuzzy match)
                String normalizedInput = upper.replace("_", "");
                for (Status status : Status.values()) {
                    if (status.name().replace("_", "").equals(normalizedInput)) {
                        return status;
                    }
                }
                
                throw new IllegalArgumentException("Invalid status: " + value);
            }
        }
    }
}
