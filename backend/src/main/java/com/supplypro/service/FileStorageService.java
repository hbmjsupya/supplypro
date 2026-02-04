package com.supplypro.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);

    private final Path fileStorageLocation;
    private final List<String> allowedFileTypes;

    public FileStorageService(@Value("${file.upload-dir}") String uploadDir,
                              @Value("${file.allowed-types}") String allowedTypes) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        logger.info("File storage location initialized at: {}", this.fileStorageLocation);
        this.allowedFileTypes = Arrays.stream(allowedTypes.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .collect(Collectors.toList());

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public void init() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Could not initialize storage location", ex);
        }
    }

    public void healthCheck() {
        if (!Files.exists(this.fileStorageLocation)) {
             throw new RuntimeException("Storage directory does not exist: " + this.fileStorageLocation);
        }
        if (!Files.isWritable(this.fileStorageLocation)) {
             throw new RuntimeException("Storage directory is not writable: " + this.fileStorageLocation);
        }
    }

    public String storeFile(MultipartFile file) {
        // Normalize file name
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());

        // Validate file type
        String fileExtension = "";
        int i = originalFileName.lastIndexOf('.');
        if (i > 0) {
            fileExtension = originalFileName.substring(i + 1).toLowerCase();
        }
        
        if (!allowedFileTypes.contains(fileExtension)) {
             throw new RuntimeException("Invalid file type. Allowed types: " + allowedFileTypes);
        }
        
        // Generate a unique file name to avoid collisions
        String fileName = UUID.randomUUID().toString() + "_" + originalFileName;

        try {
            // Check if the file's name contains invalid characters
            if(fileName.contains("..")) {
                throw new RuntimeException("Sorry! Filename contains invalid path sequence " + fileName);
            }
            
            // Perform virus scan (Stub)
            scanFile(file);

            // Copy file to the target location (Replacing existing file with the same name)
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            // TODO: For Object Storage integration (AWS S3, Aliyun OSS, MinIO), 
            // replace this local file copy with the respective SDK putObject call.
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }
    
    private void scanFile(MultipartFile file) {
        // TODO: Integrate with ClamAV or external virus scanning API
        // For now, we assume all files are safe in this development environment.
        // In production, throw RuntimeException if virus detected.
    }
    
    public Path loadFile(String fileName) {
        return this.fileStorageLocation.resolve(fileName).normalize();
    }

    public org.springframework.core.io.Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            if(resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + fileName);
            }
        } catch (java.net.MalformedURLException ex) {
            throw new RuntimeException("File not found " + fileName, ex);
        }
    }
}
