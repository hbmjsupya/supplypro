package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "logistics_provider_files")
public class LogisticsProviderFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logistics_provider_id", nullable = false)
    private LogisticsProvider logisticsProvider;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private FileCategory category;

    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;

    @Column(name = "stored_file_name", nullable = false)
    private String storedFileName;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime;

    @Column(name = "uploader")
    private String uploader;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "version")
    private Integer version = 1;

    @Column(name = "group_id", nullable = false)
    private String groupId;

    @Column(name = "is_latest")
    private Boolean isLatest = true;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    public enum FileCategory {
        QUALIFICATION, CONTRACT
    }
}
