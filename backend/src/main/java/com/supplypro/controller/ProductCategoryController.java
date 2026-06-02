package com.supplypro.controller;

import com.supplypro.entity.ProductCategory;
import com.supplypro.service.ProductCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/product-categories")
@CrossOrigin(origins = "*")
public class ProductCategoryController {
    @Autowired
    private ProductCategoryService service;

    @GetMapping
    public ResponseEntity<List<ProductCategory>> getCategories(
            @RequestParam(required = false, defaultValue = "0") String parentId) {
        return ResponseEntity.ok(service.getCategoriesByParentId(parentId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<ProductCategory>> getAllCategories() {
        return ResponseEntity.ok(service.getAllCategories());
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProductCategory>> search(@RequestParam String keyword) {
        return ResponseEntity.ok(service.searchCategories(keyword));
    }

    @GetMapping("/{categoryId}/path")
    public ResponseEntity<List<ProductCategory>> getCategoryPath(@PathVariable String categoryId) {
        return ResponseEntity.ok(service.getCategoryPath(categoryId));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String parentId = (String) body.getOrDefault("parentId", "0");
        int level = body.get("level") != null ? ((Number) body.get("level")).intValue() : 3;
        String fullPath = (String) body.getOrDefault("fullPath", name);

        ProductCategory created = service.createCategory(name, parentId, level, fullPath);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "创建成功");
        response.put("data", created);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sync")
    public ResponseEntity<Void> sync() {
        service.syncCategories();
        return ResponseEntity.ok().build();
    }
}
