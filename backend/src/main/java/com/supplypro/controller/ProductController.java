package com.supplypro.controller;

import com.supplypro.common.annotation.OperationLog;
import com.supplypro.entity.Product;
import com.supplypro.entity.ProductBrand;
import com.supplypro.entity.Brand;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.ProductBrandRepository;
import com.supplypro.service.ProductSyncProducer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;

import com.supplypro.entity.Sku;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.web.multipart.MultipartFile;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private ProductBrandRepository productBrandRepository;

    @Autowired
    private ProductSyncProducer productSyncProducer;
    
    @Autowired
    private com.supplypro.service.ProductTaxLogService productTaxLogService;

    @GetMapping("/validation/name")
    public ResponseEntity<Map<String, Object>> checkName(
            @RequestParam String name, 
            @RequestParam(required = false) Long excludeId) {
        // Debug log to verify endpoint hit
        // System.out.println("Checking name: " + name + ", excludeId: " + excludeId);
        boolean exists;
        if (excludeId != null) {
            exists = productRepository.existsByNameAndIdNot(name, excludeId);
        } else {
            exists = productRepository.existsByName(name);
        }
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String taxClass,
            @RequestParam(required = false) List<Product.Status> status,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String createdAfter,
            @RequestParam(required = false) String createdBefore) {
        
        try {
            PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
            
            Specification<Product> spec = (root, query, cb) -> {
                // Eagerly fetch Brand to optimize display and avoid N+1
                if (Long.class != query.getResultType()) { // Avoid fetch in count query
                    root.fetch("brand", JoinType.LEFT);
                }
                
                List<Predicate> predicates = new ArrayList<>();
                
                if (keyword != null && !keyword.isEmpty()) {
                    String likePattern = "%" + keyword + "%";
                    Predicate nameMatch = cb.like(root.get("name"), likePattern);
                    Predicate idMatch = cb.like(root.get("id").as(String.class), likePattern);
                    Predicate spuMatch = cb.like(root.get("skuCode"), likePattern);
                    
                    // Join skus for SKU Code search
                    // Use distinct to avoid duplicate products in result
                    if (Long.class != query.getResultType()) {
                        query.distinct(true);
                    }
                    // Using a subquery for SKU match is safer to avoid Cartesian product issues
                    
                    javax.persistence.criteria.Subquery<Long> skuSub = query.subquery(Long.class);
                    javax.persistence.criteria.Root<Sku> skuRoot = skuSub.from(Sku.class);
                    skuSub.select(skuRoot.get("product").get("id"));
                    skuSub.where(cb.like(skuRoot.get("skuCode"), likePattern));
                    
                    Predicate skuMatch = root.get("id").in(skuSub);
                    
                    predicates.add(cb.or(nameMatch, idMatch, spuMatch, skuMatch));
                }

                if (categoryCode != null && !categoryCode.isEmpty()) {
                     predicates.add(cb.like(root.get("categoryCode"), categoryCode + "%"));
                }

                if (taxClass != null && !taxClass.isEmpty()) {
                    predicates.add(cb.equal(root.get("taxClass"), taxClass));
                }

                if (status != null && !status.isEmpty()) {
                    predicates.add(root.get("status").in(status));
                }

                // New Filters
                if (brandId != null) {
                    predicates.add(cb.equal(root.get("brandId"), brandId));
                }

                if (createdAfter != null && !createdAfter.isEmpty()) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), LocalDateTime.parse(createdAfter)));
                }

                if (createdBefore != null && !createdBefore.isEmpty()) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), LocalDateTime.parse(createdBefore)));
                }

                if (minPrice != null || maxPrice != null || supplierId != null) {
                    javax.persistence.criteria.Subquery<Long> skuSub = query.subquery(Long.class);
                    javax.persistence.criteria.Root<Sku> skuRoot = skuSub.from(Sku.class);
                    skuSub.select(skuRoot.get("product").get("id"));
                    
                    List<Predicate> skuPredicates = new ArrayList<>();
                    if (minPrice != null) {
                        skuPredicates.add(cb.greaterThanOrEqualTo(skuRoot.get("costPrice"), minPrice));
                    }
                    if (maxPrice != null) {
                        skuPredicates.add(cb.lessThanOrEqualTo(skuRoot.get("costPrice"), maxPrice));
                    }
                    if (supplierId != null) {
                        skuPredicates.add(cb.equal(skuRoot.get("supplier").get("id"), supplierId));
                    }
                    
                    skuSub.where(cb.and(skuPredicates.toArray(new Predicate[0])));
                    predicates.add(root.get("id").in(skuSub));
                }
                
                return cb.and(predicates.toArray(new Predicate[0]));
            };

            Page<Product> pageResult = productRepository.findAll(spec, pageRequest);
            
            // Ensure brand name is populated for display if redundant field is missing
            pageResult.getContent().forEach(p -> {
                if (p.getBrandZhName() == null && p.getBrand() != null) {
                    p.setBrandZhName(p.getBrand().getName());
                }
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Success");
            response.put("data", Map.of(
                "records", pageResult.getContent(),
                "total", pageResult.getTotalElements()
            ));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace(); // Log the full stack trace
            throw e; // Let GlobalExceptionHandler handle it
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        if (!productRepository.existsById(id)) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 404);
            response.put("message", "Product not found");
            return ResponseEntity.status(404).body(response);
        }
        // Use findWithBrandById to fetch Brand eagerly
        Product product = productRepository.findWithBrandById(id).orElse(null);
        
        // Ensure brandZhName is consistent with Brand relation for display
        if (product != null && product.getBrand() != null) {
            product.setBrandZhName(product.getBrand().getName());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", product);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @OperationLog(module = "Product", operation = "Create Product")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Product product) {
        if (product == null) return ResponseEntity.badRequest().build();
        
        // Global Deduplication Check
        if (product.getName() != null && productRepository.existsByName(product.getName())) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 400);
            response.put("message", "商品名称已存在");
            return ResponseEntity.badRequest().body(response);
        }

        // Generate SKU Code if missing
        if (product.getSkuCode() == null || product.getSkuCode().isEmpty()) {
            product.setSkuCode(generateSkuCode());
        }

        // Validate Brand
        if (product.getBrandId() != null) {
            // Fetch Brand to populate name fields
            Brand brand = brandRepository.findById(product.getBrandId()).orElse(null);
            if (brand == null || brand.getStatus() != Brand.Status.ENABLED) {
                Map<String, Object> response = new HashMap<>();
                response.put("code", 400);
                response.put("message", "Selected brand is invalid or disabled");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Populate redundant fields for display performance
            product.setBrandZhName(brand.getName());
            // Brand entity doesn't have English Name, leaving it null or using name
            product.setBrandEnName(null); 
            product.setBrandLogo(brand.getIcon());
            
            // Check permission
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetails) {
                UserDetails user = (UserDetails) auth.getPrincipal();
                boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
                
                if (!isAdmin) {
                    boolean hasPermission = brandRepository.hasPermission(product.getBrandId(), user.getUsername());
                    if (!hasPermission) {
                        Map<String, Object> response = new HashMap<>();
                        response.put("code", 403);
                        response.put("message", "You do not have permission to use this brand");
                        return ResponseEntity.status(403).body(response);
                    }
                }
            }
        }

        // Set default status if missing (though entity has default, explicit is safer)
        if (product.getStatus() == null) {
            product.setStatus(Product.Status.PENDING_SELECTION);
        }

        // Maintain bidirectional relationship for Skus
        if (product.getSkus() != null) {
            product.getSkus().forEach(sku -> {
                sku.setProduct(product);
                // Generate SKU Code for Item if missing (e.g. new SKU added)
                if (sku.getSkuCode() == null || sku.getSkuCode().isEmpty()) {
                    sku.setSkuCode(generateItemSkuCode());
                }
            });
        }

        Product saved = productRepository.save(product);

        // Save ProductBrand association
        if (saved.getBrandId() != null) {
            ProductBrand pb = productBrandRepository.findByProductIdAndBrandId(saved.getId(), saved.getBrandId())
                    .orElse(new ProductBrand());
            if (pb.getId() == null) {
                pb.setProductId(saved.getId());
                pb.setBrandId(saved.getBrandId());
                pb.setBindingTime(LocalDateTime.now());
                productBrandRepository.save(pb);
            }
        }
        
        // Sync to ES via MQ
        productSyncProducer.sendSyncMessage(saved.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @Transactional
    @OperationLog(module = "Product", operation = "Update Product")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody Product product) {
        if (!productRepository.existsById(id)) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 404);
            response.put("message", "Product not found");
            return ResponseEntity.status(404).body(response);
        }
        
        // Global Deduplication Check
        if (product.getName() != null && productRepository.existsByNameAndIdNot(product.getName(), id)) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 400);
            response.put("message", "商品名称已存在");
            return ResponseEntity.badRequest().body(response);
        }
        
        // Validate Tax Rate
        if (product.getTaxRate() != null) {
            if (product.getTaxRate().compareTo(BigDecimal.ZERO) < 0 || product.getTaxRate().compareTo(BigDecimal.ONE) > 0) {
                 Map<String, Object> response = new HashMap<>();
                 response.put("code", 400);
                 response.put("message", "Tax rate must be between 0 and 1 (0-100%)");
                 return ResponseEntity.badRequest().body(response);
            }
        }
        
        Product existingProduct = productRepository.findById(id).orElse(null);
        
        // Track Tax Rate Change
        if (existingProduct != null) {
            BigDecimal oldRate = existingProduct.getTaxRate();
            BigDecimal newRate = product.getTaxRate();
            
            // If both null, no change. If one null, changed. If different, changed.
            boolean changed = false;
            if (oldRate == null && newRate != null) changed = true;
            else if (oldRate != null && newRate == null) changed = true;
            else if (oldRate != null && newRate != null && oldRate.compareTo(newRate) != 0) changed = true;
            
            if (changed) {
                // Use separate service to ensure transaction isolation (REQUIRES_NEW)
                // This prevents "Transaction silently rolled back" errors if logging fails
                productTaxLogService.logTaxChange(id, oldRate, newRate, "Manual Update");
            }
        }

        // Validate Brand if provided
        if (product.getBrandId() != null) {
            // Fetch Brand to populate name fields
            Brand brand = brandRepository.findById(product.getBrandId()).orElse(null);
            if (brand == null || brand.getStatus() != Brand.Status.ENABLED) {
                Map<String, Object> response = new HashMap<>();
                response.put("code", 400);
                response.put("message", "Selected brand is invalid or disabled");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Populate redundant fields for display performance
            product.setBrandZhName(brand.getName());
            product.setBrandEnName(null); 
            product.setBrandLogo(brand.getIcon());

            // Check permission
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetails) {
                UserDetails user = (UserDetails) auth.getPrincipal();
                boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
                
                if (!isAdmin) {
                    boolean hasPermission = brandRepository.hasPermission(product.getBrandId(), user.getUsername());
                    if (!hasPermission) {
                            Map<String, Object> response = new HashMap<>();
                            response.put("code", 403);
                            response.put("message", "You do not have permission to use this brand");
                            return ResponseEntity.status(403).body(response);
                    }
                }
            }
        }

        product.setId(id);

        // Preserve SKU Code if missing
        if ((product.getSkuCode() == null || product.getSkuCode().isEmpty()) && existingProduct != null) {
            if (existingProduct.getSkuCode() != null) {
                product.setSkuCode(existingProduct.getSkuCode());
            } else {
                product.setSkuCode(generateSkuCode());
            }
        }
        
        // Maintain bidirectional relationship for Skus
        if (product.getSkus() != null) {
            product.getSkus().forEach(sku -> {
                sku.setProduct(product);
                // Generate SKU Code for Item if missing (e.g. new SKU added)
                if (sku.getSkuCode() == null || sku.getSkuCode().isEmpty()) {
                    sku.setSkuCode(generateItemSkuCode());
                }
            });
        }

        Product updated = productRepository.save(product);

        // Update ProductBrand association
        if (updated.getBrandId() != null) {
            // Check if the specific association already exists to avoid duplicate entry error
            // (caused by deleteByProductId + save in same transaction with IDENTITY generation)
            java.util.Optional<ProductBrand> existingPb = productBrandRepository.findByProductIdAndBrandId(updated.getId(), updated.getBrandId());
            
            if (existingPb.isEmpty()) {
                // Remove old associations
                productBrandRepository.deleteByProductId(updated.getId());
                productBrandRepository.flush(); // Ensure delete is executed before insert
                
                // Create new association
                ProductBrand pb = new ProductBrand();
                pb.setProductId(updated.getId());
                pb.setBrandId(updated.getBrandId());
                pb.setBindingTime(LocalDateTime.now());
                productBrandRepository.save(pb);
            }
        }
        
        // Sync to ES via MQ
        // Note: If MQ fails, we might not want to rollback the whole transaction. 
        // But catching it might cause Silent Rollback if the exception is thrown from a transactional resource.
        // ProductSyncProducer uses RabbitTemplate which might be transactional. 
        // To be safe, we catch ONLY if we are sure it doesn't mark rollback-only, OR we accept failure.
        // Here we choose to log error. If RabbitTemplate throws AmqpException (RuntimeException), 
        // it marks rollback-only. So we must NOT catch it inside @Transactional if we want to return success.
        // However, if we want "Best Effort", we should execute this AFTER transaction commit.
        // For now, we remove try-catch to expose errors instead of silent failures.
        productSyncProducer.sendSyncMessage(updated.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Updated successfully");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @Transactional
    @OperationLog(module = "Product", operation = "Update Status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable Long id, @RequestParam Product.Status status) {
        // System.out.println("Update Status Request: ID=" + id + ", Status=" + status); // Debug log
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 404);
            response.put("message", "商品不存在");
            return ResponseEntity.status(404).body(response);
        }

        // Global Deduplication Check (Prevent status change if name is duplicate)
        if (productRepository.existsByNameAndIdNot(product.getName(), id)) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 400);
            response.put("message", "商品名称已存在，请先修改名称");
            return ResponseEntity.badRequest().body(response);
        }

        // Check permission
        if (product.getBrandId() != null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetails) {
                UserDetails user = (UserDetails) auth.getPrincipal();
                boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
                
                if (!isAdmin) {
                    boolean hasPermission = brandRepository.hasPermission(product.getBrandId(), user.getUsername());
                    if (!hasPermission) {
                        Map<String, Object> response = new HashMap<>();
                        response.put("code", 403);
                        response.put("message", "You do not have permission to manage products of this brand");
                        return ResponseEntity.status(403).body(response);
                    }
                }
            }
        }

        // Validate mandatory fields when moving to SELECTED or ON_SHELF
        if (status == Product.Status.SELECTED || status == Product.Status.ON_SHELF) {
            List<String> missingFields = new ArrayList<>();
            // Brand and Tax are optional for Selection (as per requirement)
            // if (product.getBrandId() == null) missingFields.add("品牌");
            if (product.getName() == null || product.getName().isEmpty()) missingFields.add("商品名称");
            if (product.getCategoryCode() == null) missingFields.add("商品分类");
            // Tax info is optional
            // if (product.getTaxCode() == null) missingFields.add("税务分类");
            if (product.getSkus() == null || product.getSkus().isEmpty()) missingFields.add("规格");
            
            if (!missingFields.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("code", 400);
                response.put("message", "选品通过需补全以下必填项: " + String.join(", ", missingFields));
                return ResponseEntity.badRequest().body(response);
            }
        }

        // Auto-fix SKU Code if missing (Fixes ConstraintViolationException)
        if (product.getSkuCode() == null || product.getSkuCode().isEmpty()) {
            product.setSkuCode(generateSkuCode());
        }

        Product.Status oldStatus = product.getStatus();
        product.setStatus(status);
        productRepository.save(product);
        
        // Sync to ES via MQ
        try {
            productSyncProducer.sendSyncMessage(product.getId());
        } catch (Exception e) {
            e.printStackTrace();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "状态更新成功");
        response.put("data", Map.of("id", id, "oldStatus", oldStatus, "newStatus", status));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/import")
    @OperationLog(module = "Product", operation = "Batch Import Products")
    public ResponseEntity<Map<String, Object>> importProducts(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "File is empty"));
        }

        List<String> errors = new ArrayList<>();
        int successCount = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser csvParser = CSVFormat.Builder.create(CSVFormat.DEFAULT)
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            for (CSVRecord record : csvParser) {
                String name = record.isMapped("name") ? record.get("name") : null;
                
                if (name == null || name.isEmpty()) {
                    errors.add("Row " + record.getRecordNumber() + ": Product name is missing");
                    continue;
                }

                if (productRepository.existsByName(name)) {
                    errors.add("Row " + record.getRecordNumber() + ": Product name '" + name + "' already exists");
                    continue;
                }

                // If name is unique, proceed to create product (Simplified for this requirement)
                try {
                    Product product = new Product();
                    product.setName(name);
                    product.setSkuCode(generateSkuCode());
                    product.setStatus(Product.Status.PENDING_SELECTION); // Default status
                    
                    // Optional: Map other fields if present in CSV
                    if (record.isMapped("brandId")) {
                         String brandIdStr = record.get("brandId");
                         if (brandIdStr != null && !brandIdStr.isEmpty()) {
                             try {
                                 product.setBrandId(Long.parseLong(brandIdStr));
                             } catch (NumberFormatException e) {
                                 // Ignore or log
                             }
                         }
                    }
                    
                    productRepository.save(product);
                    successCount++;
                    
                    // Sync to ES
                    try {
                        productSyncProducer.sendSyncMessage(product.getId());
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    
                } catch (Exception e) {
                    errors.add("Row " + record.getRecordNumber() + ": Failed to save product '" + name + "' - " + e.getMessage());
                }
            }

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("code", 500, "message", "Failed to parse CSV file: " + e.getMessage()));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", errors.isEmpty() ? 200 : 206); // 206 Partial Content if there are errors
        response.put("message", "Import completed with " + successCount + " successes and " + errors.size() + " errors");
        response.put("data", Map.of(
            "successCount", successCount,
            "errorCount", errors.size(),
            "errors", errors
        ));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/batch/delete")
    @OperationLog(module = "Product", operation = "Batch Delete Products")
    @Transactional
    public ResponseEntity<Map<String, Object>> batchDelete(@RequestBody List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 400);
            response.put("message", "No IDs provided");
            return ResponseEntity.badRequest().body(response);
        }
        productRepository.deleteAllById(ids);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Deleted " + ids.size() + " products");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/batch/status")
    @OperationLog(module = "Product", operation = "Batch Update Product Status")
    @Transactional
    public ResponseEntity<Map<String, Object>> batchUpdateStatus(@RequestBody Map<String, Object> payload) {
        List<Integer> idInts = (List<Integer>) payload.get("ids");
        if (idInts == null || idInts.isEmpty()) {
             Map<String, Object> response = new HashMap<>();
            response.put("code", 400);
            response.put("message", "No IDs provided");
            return ResponseEntity.badRequest().body(response);
        }
        List<Long> ids = new ArrayList<>();
        for(Integer i : idInts) ids.add(Long.valueOf(i));

        String statusStr = (String) payload.get("status");
        if (statusStr == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 400);
            response.put("message", "No status provided");
            return ResponseEntity.badRequest().body(response);
        }
        Product.Status status = Product.Status.fromString(statusStr);
        List<Product> products = productRepository.findAllById(ids);
        products.forEach(p -> p.setStatus(status));
        productRepository.saveAll(products);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Updated " + products.size() + " products to " + status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    @OperationLog(module = "Product", operation = "Export Products")
    public ResponseEntity<byte[]> exportProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String taxClass,
            @RequestParam(required = false) List<Product.Status> status,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String createdAfter,
            @RequestParam(required = false) String createdBefore
    ) {
        Specification<Product> spec = (root, query, cb) -> {
                if (Long.class != query.getResultType()) {
                    root.fetch("brand", JoinType.LEFT);
                }
                List<Predicate> predicates = new ArrayList<>();
                if (keyword != null && !keyword.isEmpty()) {
                    String likePattern = "%" + keyword + "%";
                    Predicate nameMatch = cb.like(root.get("name"), likePattern);
                    Predicate idMatch = cb.like(root.get("id").as(String.class), likePattern);
                    Predicate spuMatch = cb.like(root.get("skuCode"), likePattern);
                    javax.persistence.criteria.Subquery<Long> skuSub = query.subquery(Long.class);
                    javax.persistence.criteria.Root<Sku> skuRoot = skuSub.from(Sku.class);
                    skuSub.select(skuRoot.get("product").get("id"));
                    skuSub.where(cb.like(skuRoot.get("skuCode"), likePattern));
                    Predicate skuMatch = root.get("id").in(skuSub);
                    predicates.add(cb.or(nameMatch, idMatch, spuMatch, skuMatch));
                }
                if (categoryCode != null && !categoryCode.isEmpty()) predicates.add(cb.like(root.get("categoryCode"), categoryCode + "%"));
                if (taxClass != null && !taxClass.isEmpty()) predicates.add(cb.equal(root.get("taxClass"), taxClass));
                if (status != null && !status.isEmpty()) predicates.add(root.get("status").in(status));
                if (brandId != null) predicates.add(cb.equal(root.get("brandId"), brandId));
                if (createdAfter != null && !createdAfter.isEmpty()) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), LocalDateTime.parse(createdAfter)));
                if (createdBefore != null && !createdBefore.isEmpty()) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), LocalDateTime.parse(createdBefore)));
                if (minPrice != null || maxPrice != null || supplierId != null) {
                     javax.persistence.criteria.Subquery<Long> skuSub = query.subquery(Long.class);
                     javax.persistence.criteria.Root<Sku> skuRoot = skuSub.from(Sku.class);
                     skuSub.select(skuRoot.get("product").get("id"));
                     List<Predicate> skuPredicates = new ArrayList<>();
                     if (minPrice != null) skuPredicates.add(cb.greaterThanOrEqualTo(skuRoot.get("costPrice"), minPrice));
                     if (maxPrice != null) skuPredicates.add(cb.lessThanOrEqualTo(skuRoot.get("costPrice"), maxPrice));
                     if (supplierId != null) skuPredicates.add(cb.equal(skuRoot.get("supplier").get("id"), supplierId));
                     skuSub.where(cb.and(skuPredicates.toArray(new Predicate[0])));
                     predicates.add(root.get("id").in(skuSub));
                }
                return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Product> products = productRepository.findAll(spec);
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Name,SKU Code,Brand,Category,Status,Created At\n");
        for (Product p : products) {
            csv.append(p.getId()).append(",")
               .append(escapeCsv(p.getName())).append(",")
               .append(escapeCsv(p.getSkuCode())).append(",")
               .append(escapeCsv(p.getDisplayBrandName())).append(",")
               .append(escapeCsv(p.getCategoryName())).append(",")
               .append(p.getStatus()).append(",")
               .append(p.getCreatedAt()).append("\n");
        }
        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=products.csv")
                .header("Content-Type", "text/csv")
                .body(bytes);
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        return "\"" + val.replace("\"", "\"\"") + "\"";
    }

    @DeleteMapping("/all")
    @OperationLog(module = "Product", operation = "Delete All Products")
    public ResponseEntity<Map<String, Object>> deleteAll() {
        try {
            long count = productRepository.count();
            // Delete all associations first
            productBrandRepository.deleteAll();
            // Delete products (cascades to skus)
            productRepository.deleteAll();
            
            // Sync to ES (clear all - conceptually)
            // In a real scenario, we might want to send a "clear all" message or iterate.
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Deleted all " + count + " products");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("code", 500, "message", "Failed to delete all products: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    @OperationLog(module = "Product", operation = "Delete Product")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable long id) {
        if (!productRepository.existsById(id)) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 404);
            response.put("message", "Product not found");
            return ResponseEntity.status(404).body(response);
        }
        
        // Delete associations
        productBrandRepository.deleteByProductId(id);
        
        // Delete product
        productRepository.deleteById(id);
        
        // Sync to ES via MQ (Remove)
        try {
            productSyncProducer.sendSyncMessage(id);
        } catch (Exception e) {
            e.printStackTrace();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Deleted successfully");
        return ResponseEntity.ok(response);
    }

    private String generateSkuCode() {
        // Format: P + yyyyMMddHHmmss + 3 random digits
        return "P" + java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now()) 
             + String.format("%03d", new java.util.Random().nextInt(1000));
    }

    private String generateItemSkuCode() {
        // Format: S + yyyyMMddHHmmss + 3 random digits
        // Sleep 1ms to ensure uniqueness if called in loop (basic approach)
        try { Thread.sleep(1); } catch (InterruptedException e) {}
        return "S" + java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS").format(LocalDateTime.now()) 
             + String.format("%03d", new java.util.Random().nextInt(1000));
    }
}
