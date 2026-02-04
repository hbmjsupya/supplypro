package com.supplypro.service;

import com.supplypro.entity.Supplier;
import com.supplypro.entity.SupplierFile;
import com.supplypro.repository.SupplierFileRepository;
import com.supplypro.repository.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class SupplierFileMigrationService implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(SupplierFileMigrationService.class);

    private final SupplierRepository supplierRepository;
    private final SupplierFileRepository supplierFileRepository;

    public SupplierFileMigrationService(SupplierRepository supplierRepository,
                                        SupplierFileRepository supplierFileRepository) {
        this.supplierRepository = supplierRepository;
        this.supplierFileRepository = supplierFileRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        logger.info("Starting Supplier File Migration...");
        List<Supplier> suppliers = supplierRepository.findAll();
        
        for (Supplier supplier : suppliers) {
            migrateFiles(supplier, supplier.getQualificationFile(), SupplierFile.FileCategory.QUALIFICATION);
            migrateFiles(supplier, supplier.getContractFile(), SupplierFile.FileCategory.CONTRACT);
        }
        logger.info("Supplier File Migration Completed.");
    }

    private void migrateFiles(Supplier supplier, List<String> filePaths, SupplierFile.FileCategory category) {
        if (filePaths == null || filePaths.isEmpty()) return;

        for (String path : filePaths) {
            if (!StringUtils.hasText(path)) continue;

            // Check if already migrated (by path) to avoid duplicates on restart
            boolean exists = supplierFileRepository.findBySupplierIdAndCategoryAndIsDeletedFalse(supplier.getId(), category)
                    .stream().anyMatch(f -> f.getFilePath().equals(path));
            
            if (exists) continue;

            try {
                SupplierFile file = new SupplierFile();
                file.setSupplier(supplier);
                file.setCategory(category);
                
                // Extract filename from path
                // path might be URL like /uploads/xyz.png or absolute path
                String fileName = new File(path).getName();
                file.setOriginalFileName(fileName); 
                file.setStoredFileName(fileName);
                file.setFilePath(path);
                
                String ext = StringUtils.getFilenameExtension(fileName);
                file.setFileType(ext != null ? "application/" + ext : "application/octet-stream");
                
                file.setFileSize(0L); 
                file.setUploadTime(LocalDateTime.now());
                file.setUploader("migration");
                file.setDescription("Migrated from legacy system");
                file.setVersion(1);
                file.setGroupId(UUID.randomUUID().toString());
                file.setIsLatest(true);
                file.setIsDeleted(false);
                
                supplierFileRepository.save(file);
                logger.info("Migrated file {} for supplier {}", fileName, supplier.getId());
            } catch (Exception e) {
                logger.error("Failed to migrate file {} for supplier {}", path, supplier.getId(), e);
            }
        }
    }
}
