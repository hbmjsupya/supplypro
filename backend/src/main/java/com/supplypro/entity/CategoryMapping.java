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
@Table(name = "category_mappings")
@EntityListeners(AuditingEntityListener.class)
public class CategoryMapping implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "system_category_id", nullable = false)
    private String systemCategoryId;

    @Column(name = "system_category_name", nullable = false)
    private String systemCategoryName;

    @Column(name = "system_category_full_path")
    private String systemCategoryFullPath;

    @Column(name = "system_category_level", nullable = false)
    private Integer systemCategoryLevel;

    @Column(name = "project_category_id", nullable = false)
    private String projectCategoryId;

    @Column(name = "project_category_name", nullable = false)
    private String projectCategoryName;

    @Column(name = "project_category_full_path")
    private String projectCategoryFullPath;

    @Column(name = "sales_project_id", nullable = false)
    private String salesProjectId;

    @Column(name = "match_score")
    private String matchScore;

    @Column(name = "match_method")
    private String matchMethod;

    @Column(name = "match_status", nullable = false)
    private String matchStatus = "精准匹配";

    @Column(name = "created_by")
    private String createdBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
