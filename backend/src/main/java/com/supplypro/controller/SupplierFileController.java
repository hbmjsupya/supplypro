package com.supplypro.controller;

import com.supplypro.dto.SupplierFileDTO;
import com.supplypro.entity.SupplierFile;
import com.supplypro.service.SupplierFileService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/supplier-files")
public class SupplierFileController {

    private final SupplierFileService supplierFileService;

    public SupplierFileController(SupplierFileService supplierFileService) {
        this.supplierFileService = supplierFileService;
    }

    @PostMapping("/{supplierId}/upload")
    public ResponseEntity<SupplierFileDTO> uploadFile(
            @PathVariable Long supplierId,
            @RequestParam("category") String category,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        
        SupplierFileDTO result = supplierFileService.uploadFile(supplierId, category, file, description);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/temp/upload")
    public ResponseEntity<SupplierFileDTO> uploadTempFile(
            @RequestParam("category") String category,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        
        SupplierFileDTO result = supplierFileService.uploadTempFile(category, file, description);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/temp/{fileName:.+}")
    public ResponseEntity<Resource> getTempFile(@PathVariable String fileName) {
        Resource resource = supplierFileService.loadFileAsResource(fileName);
        
        String contentType = "application/octet-stream";
        try {
            contentType = resource.getURL().openConnection().getContentType();
        } catch (IOException ex) {
            // fallback
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .body(resource);
    }

    @GetMapping("/{supplierId}")
    public ResponseEntity<List<SupplierFileDTO>> getFiles(
            @PathVariable Long supplierId,
            @RequestParam(value = "category", required = false) String category) {
        
        List<SupplierFileDTO> files = supplierFileService.getFiles(supplierId, category);
        return ResponseEntity.ok(files);
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long fileId) {
        supplierFileService.deleteFile(fileId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{fileId}")
    public ResponseEntity<SupplierFileDTO> updateFileMetadata(
            @PathVariable Long fileId,
            @RequestParam("description") String description) {
        SupplierFileDTO result = supplierFileService.updateFileMetadata(fileId, description);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{fileId}/version")
    public ResponseEntity<SupplierFileDTO> updateFileVersion(
            @PathVariable Long fileId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        SupplierFileDTO result = supplierFileService.updateFileVersion(fileId, file, description);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/history/{groupId}")
    public ResponseEntity<List<SupplierFileDTO>> getFileHistory(@PathVariable String groupId) {
        List<SupplierFileDTO> history = supplierFileService.getFileHistory(groupId);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId) throws IOException {
        SupplierFile fileEntity = supplierFileService.getFileEntity(fileId);
        Resource resource = supplierFileService.loadFileAsResource(fileEntity.getStoredFileName());

        String contentType = fileEntity.getFileType();
        if(contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileEntity.getOriginalFileName() + "\"")
                .body(resource);
    }
}
