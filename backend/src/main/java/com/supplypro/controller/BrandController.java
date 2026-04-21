package com.supplypro.controller;

import com.supplypro.common.annotation.OperationLog;
import com.supplypro.entity.Brand;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/brands")
@CrossOrigin(origins = "*")
public class BrandController {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList("png", "jpg", "jpeg", "svg", "gif", "webp");

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String firstLetter,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {
        
        Pageable pageable = PageRequest.of(page, size);
        
        Brand.Status brandStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                brandStatus = Brand.Status.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Invalid status, ignore or handle
            }
        }
        
        // Determine search keyword
        String searchKey = keyword;
        if (searchKey == null || searchKey.isEmpty()) {
            searchKey = name;
        }
        if (searchKey == null || searchKey.isEmpty()) {
            searchKey = firstLetter;
        }
        
        // Permission Control Removed - All users can see all brands
        List<Long> permittedIds = null;
        
        Page<Brand> pageResult = brandRepository.search(searchKey, brandStatus, permittedIds, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
            "records", pageResult.getContent(),
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable long id) {
        // Permission Check Removed
        
        return brandRepository.findById(id)
                .map(brand -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("data", brand);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/supplier/{supplierId}")
    public ResponseEntity<Map<String, Object>> getBySupplierId(@PathVariable long supplierId) {
        List<Brand> brands = brandRepository.findBySuppliers_Id(supplierId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", brands);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @OperationLog(module = "Brand", operation = "Create Brand")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Brand brand) {
        Brand saved = brandRepository.save(brand);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @OperationLog(module = "Brand", operation = "Update Brand")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody Brand brand) {
        return brandRepository.findById(id)
                .map(existing -> {
                    existing.setName(brand.getName());
                    existing.setTrademarkNo(brand.getTrademarkNo());
                    if (brand.getIcon() != null) {
                        existing.setIcon(brand.getIcon());
                    }
                    existing.setStatus(brand.getStatus());
                    
                    if (brand.getSuppliers() != null) {
                        existing.setSuppliers(brand.getSuppliers());
                    }
                    
                    Brand saved = brandRepository.save(existing);
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Updated successfully");
                    response.put("data", saved);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/suppliers/{supplierId}")
    public ResponseEntity<Map<String, Object>> addSupplier(@PathVariable long id, @PathVariable long supplierId) {
        return brandRepository.findById(id).map(brand -> {
            return supplierRepository.findById(supplierId).map(supplier -> {
                brand.getSuppliers().add(supplier);
                brandRepository.save(brand);
                Map<String, Object> response = new HashMap<>();
                response.put("code", 200);
                response.put("message", "Supplier added");
                return ResponseEntity.ok(response);
            }).orElse(ResponseEntity.notFound().build());
        }).orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}/suppliers/{supplierId}")
    public ResponseEntity<Map<String, Object>> removeSupplier(@PathVariable long id, @PathVariable long supplierId) {
        return brandRepository.findById(id).map(brand -> {
            brand.getSuppliers().removeIf(supplier -> supplier.getId().equals(supplierId));
            brandRepository.save(brand);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Supplier removed");
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-supplier/{supplierId}")
    public ResponseEntity<Map<String, Object>> getBrandsBySupplier(@PathVariable long supplierId) {
        List<Brand> brands = brandRepository.findBySuppliers_Id(supplierId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", brands);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload-icon")
    public ResponseEntity<Map<String, Object>> uploadBrandIcon(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (file.isEmpty()) {
                response.put("code", 400);
                response.put("message", "请选择要上传的文件");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (file.getSize() > MAX_FILE_SIZE) {
                response.put("code", 400);
                response.put("message", "文件大小超过限制，最大允许5MB");
                return ResponseEntity.badRequest().body(response);
            }
            
            String originalFileName = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFileName != null && originalFileName.contains(".")) {
                fileExtension = originalFileName.substring(originalFileName.lastIndexOf(".") + 1).toLowerCase();
            }
            
            if (!ALLOWED_IMAGE_TYPES.contains(fileExtension)) {
                response.put("code", 400);
                response.put("message", "不支持的文件格式，仅支持PNG、JPG、SVG、GIF、WEBP格式");
                return ResponseEntity.badRequest().body(response);
            }
            
            String fileName = fileStorageService.storeFile(file);
            String fileUrl = "/uploads/" + fileName;
            
            response.put("code", 200);
            response.put("message", "图标上传成功");
            response.put("data", Map.of(
                "fileName", fileName,
                "fileUrl", fileUrl
            ));
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("code", 500);
            response.put("message", "文件上传失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
