package com.supplypro.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class LogisticsProviderFileDTO {
    private Long id;
    private Long logisticsProviderId;
    private String category;
    private String originalFileName;
    private String storedFileName;
    private String fileType;
    private Long fileSize;
    private LocalDateTime uploadTime;
    private String uploader;
    private String description;
    private Integer version;
    private String groupId;
    private Boolean isLatest;
    private String url;
}
