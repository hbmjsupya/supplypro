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
@Table(name = "project_categories")
@EntityListeners(AuditingEntityListener.class)
public class ProjectCategory implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_category_id", unique = true, nullable = false)
    private String projectCategoryId;

    @Column(name = "parent_id")
    private String parentId;

    @Column(nullable = false)
    private Integer level;

    @Column(nullable = false)
    private String name;

    @Column(name = "full_path")
    private String fullPath;

    @Column(name = "sales_project_id", nullable = false)
    private String salesProjectId;

    @Column(name = "is_leaf")
    private Boolean isLeaf = false;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
