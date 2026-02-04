package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "product_brands", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "brand_id"}))
public class ProductBrand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Column(name = "binding_time", nullable = false)
    private LocalDateTime bindingTime;

    @Column(name = "create_time", updatable = false)
    private LocalDateTime createTime;

    @PrePersist
    protected void onCreate() {
        if (bindingTime == null) {
            bindingTime = LocalDateTime.now();
        }
        createTime = LocalDateTime.now();
    }
}
