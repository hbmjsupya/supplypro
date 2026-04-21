package com.supplypro.controller;

import com.supplypro.entity.DeliveryExportRecord;
import com.supplypro.repository.DeliveryExportRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/delivery-export-records")
@CrossOrigin(origins = "*")
public class DeliveryExportRecordController {

    @Autowired
    private DeliveryExportRecordRepository deliveryExportRecordRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getExportRecords(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "exportedAt"));
        Page<DeliveryExportRecord> records = deliveryExportRecordRepository.findAllByOrderByExportedAtDesc(pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", records.getContent());
        response.put("totalElements", records.getTotalElements());
        response.put("totalPages", records.getTotalPages());
        response.put("currentPage", records.getNumber());
        response.put("pageSize", records.getSize());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadExportRecord(@PathVariable Long id) {
        DeliveryExportRecord record = deliveryExportRecordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Export record not found with id: " + id));
        
        try {
            Path filePath = Paths.get(record.getFilePath()).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .header(HttpHeaders.CONTENT_DISPOSITION, 
                                "attachment; filename=\"" + record.getFileName() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
