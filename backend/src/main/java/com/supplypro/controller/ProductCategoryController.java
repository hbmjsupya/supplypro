package com.supplypro.controller;

import com.supplypro.entity.ProductCategory;
import com.supplypro.service.ProductCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/search")
    public ResponseEntity<List<ProductCategory>> search(@RequestParam String keyword) {
        return ResponseEntity.ok(service.searchCategories(keyword));
    }

    @GetMapping("/{categoryId}/path")
    public ResponseEntity<List<ProductCategory>> getCategoryPath(@PathVariable String categoryId) {
        return ResponseEntity.ok(service.getCategoryPath(categoryId));
    }

    @PostMapping("/sync")
    public ResponseEntity<Void> sync() {
        service.syncCategories();
        return ResponseEntity.ok().build();
    }
}
