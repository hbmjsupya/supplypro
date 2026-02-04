package com.supplypro.controller;

import com.supplypro.dto.LogisticsProviderFileDTO;
import com.supplypro.entity.LogisticsProviderFile;
import com.supplypro.service.LogisticsProviderFileService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/logistics-files")
public class LogisticsProviderFileController {

    private final LogisticsProviderFileService logisticsProviderFileService;

    public LogisticsProviderFileController(LogisticsProviderFileService logisticsProviderFileService) {
        this.logisticsProviderFileService = logisticsProviderFileService;
    }

    @PostMapping("/{providerId}/upload")
    public ResponseEntity<LogisticsProviderFileDTO> uploadFile(
            @PathVariable Long providerId,
            @RequestParam("category") String category,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        
        LogisticsProviderFileDTO result = logisticsProviderFileService.uploadFile(providerId, category, file, description);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/temp/upload")
    public ResponseEntity<LogisticsProviderFileDTO> uploadTempFile(
            @RequestParam("category") String category,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        
        LogisticsProviderFileDTO result = logisticsProviderFileService.uploadTempFile(category, file, description);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/temp/{fileName:.+}")
    public ResponseEntity<Resource> getTempFile(@PathVariable String fileName) {
        Resource resource = logisticsProviderFileService.loadFileAsResource(fileName);
        
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

    @GetMapping("/{providerId}")
    public ResponseEntity<List<LogisticsProviderFileDTO>> getFiles(
            @PathVariable Long providerId,
            @RequestParam(value = "category", required = false) String category) {
        
        List<LogisticsProviderFileDTO> files = logisticsProviderFileService.getFiles(providerId, category);
        return ResponseEntity.ok(files);
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long fileId) {
        logisticsProviderFileService.deleteFile(fileId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{fileId}")
    public ResponseEntity<LogisticsProviderFileDTO> updateFileMetadata(
            @PathVariable Long fileId,
            @RequestParam("description") String description) {
        LogisticsProviderFileDTO result = logisticsProviderFileService.updateFileMetadata(fileId, description);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{fileId}/version")
    public ResponseEntity<LogisticsProviderFileDTO> updateFileVersion(
            @PathVariable Long fileId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        LogisticsProviderFileDTO result = logisticsProviderFileService.updateFileVersion(fileId, file, description);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/history/{groupId}")
    public ResponseEntity<List<LogisticsProviderFileDTO>> getFileHistory(@PathVariable String groupId) {
        List<LogisticsProviderFileDTO> history = logisticsProviderFileService.getFileHistory(groupId);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileId) throws IOException {
        LogisticsProviderFile fileEntity = logisticsProviderFileService.getFileEntity(fileId);
        Resource resource = logisticsProviderFileService.loadFileAsResource(fileEntity.getStoredFileName());

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
