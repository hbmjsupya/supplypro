package com.supplypro.controller;

import com.supplypro.entity.Product;
import com.supplypro.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductBundleService productBundleService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name) {
        
        Page<Product> pageResult;
        if (name != null && !name.isEmpty()) {
            pageResult = productRepository.findByNameContaining(name, PageRequest.of(page, size));
        } else {
            pageResult = productRepository.findAll(PageRequest.of(page, size));
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", pageResult.getContent(),
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Product product) {
        if (product == null) return ResponseEntity.badRequest().build();
        Product saved = productRepository.save(product);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody Product product) {
        if (!productRepository.existsById(id)) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 404);
            response.put("message", "Product not found");
            return ResponseEntity.status(404).body(response);
        }
        product.setId(id);
        Product updated = productRepository.save(product);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Updated successfully");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable long id) {
        if (!productRepository.existsById(id)) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 404);
            response.put("message", "Product not found");
            return ResponseEntity.status(404).body(response);
        }
        productRepository.deleteById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/bundle")
    public ResponseEntity<Map<String, Object>> getBundleItems(@PathVariable Long id) {
        List<?> items = productBundleService.getBundleItems(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", items);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/bundle")
    public ResponseEntity<Map<String, Object>> updateBundleItems(
            @PathVariable Long id, 
            @RequestBody List<Map<String, Object>> items) {
        productBundleService.updateBundleItems(id, items);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Bundle updated successfully");
        return ResponseEntity.ok(response);
    }
}
