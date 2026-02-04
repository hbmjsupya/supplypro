package com.supplypro.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "product_categories")
@EntityListeners(AuditingEntityListener.class)
public class ProductCategory implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", unique = true, nullable = false)
    private String categoryId;

    @Column(name = "parent_id")
    private String parentId;

    @Column(nullable = false)
    private Integer level;

    @Column(nullable = false)
    private String name;

    private String code;

    @Column(name = "full_path")
    private String fullPath;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "is_enabled")
    private Boolean isEnabled = true;

    @CreatedDate
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @LastModifiedDate
    @Column(name = "update_time")
    private LocalDateTime updateTime;
}
