package com.supplypro.controller;

import com.supplypro.entity.Brand;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.SupplierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam(required = false) String name) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Brand> pageResult;
        
        if (name != null && !name.isEmpty()) {
            pageResult = brandRepository.findByNameContaining(name, pageable);
        } else {
            pageResult = brandRepository.findAll(pageable);
        }
        
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
        return brandRepository.findById(id)
                .map(brand -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("data", brand);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Brand brand) {
        Brand saved = brandRepository.save(brand);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody Brand brand) {
        return brandRepository.findById(id)
                .map(existing -> {
                    existing.setName(brand.getName());
                    existing.setTrademarkNo(brand.getTrademarkNo());
                    existing.setIcon(brand.getIcon());
                    existing.setStatus(brand.getStatus());
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
