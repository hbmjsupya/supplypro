package com.supplypro.controller;

import com.supplypro.common.annotation.OperationLog;
import com.supplypro.entity.Brand;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.SupplierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/brands")
@CrossOrigin(origins = "*")
public class BrandController {

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private SupplierRepository supplierRepository;

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
        
        // Permission Control
        List<Long> permittedIds = null;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetails) {
                UserDetails user = (UserDetails) auth.getPrincipal();
                boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
                
                if (!isAdmin) {
                    permittedIds = brandRepository.findBrandIdsByPurchaser(user.getUsername());
                    if (permittedIds == null || permittedIds.isEmpty()) {
                        permittedIds = new ArrayList<>();
                        permittedIds.add(-1L); // Force empty result
                    }
                }
            }
        } catch (Exception e) {
            // Ignore if security not set up
        }
        
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
        // Permission Check
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetails) {
                UserDetails user = (UserDetails) auth.getPrincipal();
                boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_MODERATOR"));
                
                if (!isAdmin) {
                    boolean hasAccess = brandRepository.hasPermission(id, user.getUsername());
                    if (!hasAccess) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                }
            }
        } catch (Exception e) {
            // Ignore
        }

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
                    existing.setIcon(brand.getIcon());
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
}
