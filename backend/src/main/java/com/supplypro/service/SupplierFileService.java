package com.supplypro.service;

import com.supplypro.dto.SupplierFileDTO;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.SupplierFile;
import com.supplypro.repository.SupplierFileRepository;
import com.supplypro.repository.SupplierRepository;
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
public class SupplierFileService {

    private static final Logger logger = LoggerFactory.getLogger(SupplierFileService.class);

    private final SupplierFileRepository supplierFileRepository;
    private final SupplierRepository supplierRepository;
    private final FileStorageService fileStorageService;

    public SupplierFileService(SupplierFileRepository supplierFileRepository,
                               SupplierRepository supplierRepository,
                               FileStorageService fileStorageService) {
        this.supplierFileRepository = supplierFileRepository;
        this.supplierRepository = supplierRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public SupplierFileDTO uploadFile(Long supplierId, String categoryStr, MultipartFile file, String description) {
        logger.info("Uploading file for supplier: {}, category: {}, filename: {}, size: {}", 
                supplierId, categoryStr, file.getOriginalFilename(), file.getSize());
        try {
            Supplier supplier = supplierRepository.findById(supplierId)
                    .orElseThrow(() -> new RuntimeException("Supplier not found"));

            SupplierFile.FileCategory category = SupplierFile.FileCategory.valueOf(categoryStr.toUpperCase());

            String storedFileName = fileStorageService.storeFile(file);
            logger.info("File stored successfully: {}", storedFileName);
            
            String originalFileName = file.getOriginalFilename();
            
            SupplierFile supplierFile = new SupplierFile();
            supplierFile.setSupplier(supplier);
            supplierFile.setCategory(category);
            supplierFile.setOriginalFileName(originalFileName);
            supplierFile.setStoredFileName(storedFileName);
            // Using relative path for serving via static resources
            supplierFile.setFilePath("/uploads/" + storedFileName); 
            supplierFile.setFileType(file.getContentType());
            supplierFile.setFileSize(file.getSize());
            supplierFile.setUploadTime(LocalDateTime.now());
            supplierFile.setDescription(description);
            supplierFile.setGroupId(UUID.randomUUID().toString()); // New file, new group
            supplierFile.setVersion(1);
            supplierFile.setIsLatest(true);
            supplierFile.setIsDeleted(false);
            
            // In a real app, extract user from SecurityContextHolder
            supplierFile.setUploader("system"); 

            SupplierFile saved = supplierFileRepository.save(supplierFile);
            logger.info("File metadata saved. ID: {}", saved.getId());
            return convertToDTO(saved);
        } catch (Exception e) {
            logger.error("Failed to upload file for supplier: {}", supplierId, e);
            throw new RuntimeException("File upload failed: " + e.getMessage(), e);
        }
    }

    public SupplierFileDTO uploadTempFile(String categoryStr, MultipartFile file, String description) {
        logger.info("Uploading temp file. Category: {}, filename: {}, size: {}", 
                categoryStr, file.getOriginalFilename(), file.getSize());
        try {
            SupplierFile.FileCategory category = SupplierFile.FileCategory.valueOf(categoryStr.toUpperCase());
            String storedFileName = fileStorageService.storeFile(file);
            logger.info("Temp file stored successfully: {}", storedFileName);
            
            SupplierFileDTO dto = new SupplierFileDTO();
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
            
            // Temp URL for preview if needed
            dto.setUrl("/api/supplier-files/temp/" + storedFileName);
            return dto;
        } catch (Exception e) {
            logger.error("Failed to upload temp file", e);
            throw new RuntimeException("Temp file upload failed: " + e.getMessage(), e);
        }
    }

    public List<SupplierFileDTO> getFiles(Long supplierId, String category) {
        List<SupplierFile> files;
        if (category != null && !category.isEmpty()) {
            files = supplierFileRepository.findBySupplierIdAndCategoryAndIsDeletedFalseAndIsLatestTrue(supplierId, SupplierFile.FileCategory.valueOf(category.toUpperCase()));
        } else {
            files = supplierFileRepository.findBySupplierIdAndIsDeletedFalseAndIsLatestTrue(supplierId);
        }
        return files.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<SupplierFileDTO> getFileHistory(String groupId) {
        return supplierFileRepository.findByGroupIdOrderByVersionDesc(groupId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public SupplierFile getFileEntity(Long fileId) {
        return supplierFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
    }

    public org.springframework.core.io.Resource loadFileAsResource(String storedFileName) {
        return fileStorageService.loadFileAsResource(storedFileName);
    }

    @Transactional
    public SupplierFileDTO updateFileVersion(Long fileId, MultipartFile file, String description) {
        SupplierFile currentFile = supplierFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        
        // Find the actual latest version for this group to ensure continuity
        List<SupplierFile> versions = supplierFileRepository.findByGroupIdOrderByVersionDesc(currentFile.getGroupId());
        SupplierFile latestFile = versions.stream()
                .filter(f -> f.getIsLatest() != null && f.getIsLatest())
                .findFirst()
                .orElse(versions.get(0)); // Fallback to top version if flag missing

        // Mark previous latest as not latest
        latestFile.setIsLatest(false);
        supplierFileRepository.save(latestFile);

        // Store new file
        String storedFileName = fileStorageService.storeFile(file);
        
        SupplierFile newVersion = new SupplierFile();
        newVersion.setSupplier(latestFile.getSupplier());
        newVersion.setCategory(latestFile.getCategory());
        newVersion.setOriginalFileName(file.getOriginalFilename());
        newVersion.setStoredFileName(storedFileName);
        newVersion.setFilePath("/uploads/" + storedFileName);
        newVersion.setFileType(file.getContentType());
        newVersion.setFileSize(file.getSize());
        newVersion.setUploadTime(LocalDateTime.now());
        newVersion.setUploader(latestFile.getUploader()); // Should be current user in real app
        newVersion.setDescription(description != null ? description : latestFile.getDescription());
        newVersion.setGroupId(latestFile.getGroupId());
        newVersion.setVersion(latestFile.getVersion() + 1);
        newVersion.setIsLatest(true);
        newVersion.setIsDeleted(false);

        SupplierFile saved = supplierFileRepository.save(newVersion);
        return convertToDTO(saved);
    }

    @Transactional
    public void deleteFile(Long fileId) {
        SupplierFile file = supplierFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        file.setIsDeleted(true);
        supplierFileRepository.save(file);
    }

    @Transactional
    public SupplierFileDTO updateFileMetadata(Long fileId, String description) {
        SupplierFile file = supplierFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        file.setDescription(description);
        SupplierFile saved = supplierFileRepository.save(file);
        return convertToDTO(saved);
    }

    private SupplierFileDTO convertToDTO(SupplierFile entity) {
        SupplierFileDTO dto = new SupplierFileDTO();
        BeanUtils.copyProperties(entity, dto);
        dto.setSupplierId(entity.getSupplier().getId());
        dto.setCategory(entity.getCategory().name());
        
        // Generate download URL pointing to the controller endpoint
        // Frontend must append ?token=... for authentication
        String fileDownloadUri = "/api/supplier-files/" + entity.getId() + "/download";
        dto.setUrl(fileDownloadUri);
        
        return dto;
    }
}
