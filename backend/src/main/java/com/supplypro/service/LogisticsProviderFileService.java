package com.supplypro.service;

import com.supplypro.dto.LogisticsProviderFileDTO;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.LogisticsProviderFile;
import com.supplypro.repository.LogisticsProviderFileRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LogisticsProviderFileService {

    private static final Logger logger = LoggerFactory.getLogger(LogisticsProviderFileService.class);

    private final LogisticsProviderFileRepository logisticsProviderFileRepository;
    private final LogisticsProviderRepository logisticsProviderRepository;
    private final FileStorageService fileStorageService;

    public LogisticsProviderFileService(LogisticsProviderFileRepository logisticsProviderFileRepository,
                                        LogisticsProviderRepository logisticsProviderRepository,
                                        FileStorageService fileStorageService) {
        this.logisticsProviderFileRepository = logisticsProviderFileRepository;
        this.logisticsProviderRepository = logisticsProviderRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public LogisticsProviderFileDTO uploadFile(Long providerId, String categoryStr, MultipartFile file, String description) {
        try {
            LogisticsProvider provider = logisticsProviderRepository.findById(providerId)
                    .orElseThrow(() -> new RuntimeException("Logistics Provider not found"));

            LogisticsProviderFile.FileCategory category = LogisticsProviderFile.FileCategory.valueOf(categoryStr.toUpperCase());
            String storedFileName = fileStorageService.storeFile(file);
            
            LogisticsProviderFile providerFile = new LogisticsProviderFile();
            providerFile.setLogisticsProvider(provider);
            providerFile.setCategory(category);
            providerFile.setOriginalFileName(file.getOriginalFilename());
            providerFile.setStoredFileName(storedFileName);
            providerFile.setFilePath("/uploads/" + storedFileName);
            providerFile.setFileType(file.getContentType());
            providerFile.setFileSize(file.getSize());
            providerFile.setUploadTime(LocalDateTime.now());
            providerFile.setDescription(description);
            providerFile.setGroupId(UUID.randomUUID().toString());
            providerFile.setVersion(1);
            providerFile.setIsLatest(true);
            providerFile.setIsDeleted(false);
            providerFile.setUploader("system");

            LogisticsProviderFile saved = logisticsProviderFileRepository.save(providerFile);
            return convertToDTO(saved);
        } catch (Exception e) {
            logger.error("Failed to upload file for provider: {}", providerId, e);
            throw new RuntimeException("File upload failed: " + e.getMessage(), e);
        }
    }

    public LogisticsProviderFileDTO uploadTempFile(String categoryStr, MultipartFile file, String description) {
        try {
            // Ensure storage directory exists (redundant check but safe for 404 prevention)
            fileStorageService.init();
            fileStorageService.healthCheck();
            
            LogisticsProviderFile.FileCategory category = LogisticsProviderFile.FileCategory.valueOf(categoryStr.toUpperCase());
            String storedFileName = fileStorageService.storeFile(file);
            
            LogisticsProviderFileDTO dto = new LogisticsProviderFileDTO();
            dto.setCategory(category.name());
            dto.setOriginalFileName(file.getOriginalFilename());
            dto.setStoredFileName(storedFileName);
            dto.setFileType(file.getContentType());
            dto.setFileSize(file.getSize());
            dto.setUploadTime(LocalDateTime.now());
            dto.setDescription(description);
            dto.setVersion(1);
            dto.setGroupId(UUID.randomUUID().toString());
            dto.setIsLatest(true);
            dto.setUrl("/api/logistics-files/temp/" + storedFileName);
            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Temp file upload failed", e);
        }
    }

    @Transactional
    public void syncTempFiles(Long providerId, List<LogisticsProviderFileDTO> files) {
        LogisticsProvider provider = logisticsProviderRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Logistics Provider not found"));

        for (LogisticsProviderFileDTO fileDto : files) {
            LogisticsProviderFile file = new LogisticsProviderFile();
            file.setLogisticsProvider(provider);
            file.setCategory(LogisticsProviderFile.FileCategory.valueOf(fileDto.getCategory()));
            file.setOriginalFileName(fileDto.getOriginalFileName());
            file.setStoredFileName(fileDto.getStoredFileName());
            file.setFilePath("/uploads/" + fileDto.getStoredFileName());
            file.setFileType(fileDto.getFileType());
            file.setFileSize(fileDto.getFileSize());
            file.setUploadTime(LocalDateTime.now());
            file.setUploader("system");
            file.setDescription(fileDto.getDescription());
            file.setGroupId(fileDto.getGroupId());
            file.setVersion(1);
            file.setIsLatest(true);
            file.setIsDeleted(false);
            
            logisticsProviderFileRepository.save(file);
        }
    }

    public List<LogisticsProviderFileDTO> getFiles(Long providerId, String category) {
        List<LogisticsProviderFile> files;
        if (category != null && !category.isEmpty()) {
            files = logisticsProviderFileRepository.findByLogisticsProviderIdAndCategoryAndIsDeletedFalseAndIsLatestTrue(providerId, LogisticsProviderFile.FileCategory.valueOf(category.toUpperCase()));
        } else {
            files = logisticsProviderFileRepository.findByLogisticsProviderIdAndIsDeletedFalseAndIsLatestTrue(providerId);
        }
        return files.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<LogisticsProviderFileDTO> getFileHistory(String groupId) {
        return logisticsProviderFileRepository.findByGroupIdOrderByVersionDesc(groupId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public LogisticsProviderFile getFileEntity(Long fileId) {
        return logisticsProviderFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
    }

    public org.springframework.core.io.Resource loadFileAsResource(String storedFileName) {
        return fileStorageService.loadFileAsResource(storedFileName);
    }

    @Transactional
    public void deleteFile(Long fileId) {
        LogisticsProviderFile file = logisticsProviderFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        file.setIsDeleted(true);
        logisticsProviderFileRepository.save(file);
    }

    @Transactional
    public LogisticsProviderFileDTO updateFileMetadata(Long fileId, String description) {
        LogisticsProviderFile file = logisticsProviderFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        file.setDescription(description);
        LogisticsProviderFile saved = logisticsProviderFileRepository.save(file);
        return convertToDTO(saved);
    }

    @Transactional
    public LogisticsProviderFileDTO updateFileVersion(Long fileId, MultipartFile file, String description) {
        LogisticsProviderFile currentFile = logisticsProviderFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        
        List<LogisticsProviderFile> versions = logisticsProviderFileRepository.findByGroupIdOrderByVersionDesc(currentFile.getGroupId());
        LogisticsProviderFile latestFile = versions.stream()
                .filter(f -> f.getIsLatest() != null && f.getIsLatest())
                .findFirst()
                .orElse(versions.get(0));

        latestFile.setIsLatest(false);
        logisticsProviderFileRepository.save(latestFile);

        String storedFileName = fileStorageService.storeFile(file);
        
        LogisticsProviderFile newVersion = new LogisticsProviderFile();
        newVersion.setLogisticsProvider(latestFile.getLogisticsProvider());
        newVersion.setCategory(latestFile.getCategory());
        newVersion.setOriginalFileName(file.getOriginalFilename());
        newVersion.setStoredFileName(storedFileName);
        newVersion.setFilePath("/uploads/" + storedFileName);
        newVersion.setFileType(file.getContentType());
        newVersion.setFileSize(file.getSize());
        newVersion.setUploadTime(LocalDateTime.now());
        newVersion.setUploader(latestFile.getUploader());
        newVersion.setDescription(description != null ? description : latestFile.getDescription());
        newVersion.setGroupId(latestFile.getGroupId());
        newVersion.setVersion(latestFile.getVersion() + 1);
        newVersion.setIsLatest(true);
        newVersion.setIsDeleted(false);

        LogisticsProviderFile saved = logisticsProviderFileRepository.save(newVersion);
        return convertToDTO(saved);
    }

    private LogisticsProviderFileDTO convertToDTO(LogisticsProviderFile entity) {
        LogisticsProviderFileDTO dto = new LogisticsProviderFileDTO();
        BeanUtils.copyProperties(entity, dto);
        dto.setLogisticsProviderId(entity.getLogisticsProvider().getId());
        dto.setCategory(entity.getCategory().name());
        dto.setUrl("/api/logistics-files/" + entity.getId() + "/download");
        return dto;
    }
}
