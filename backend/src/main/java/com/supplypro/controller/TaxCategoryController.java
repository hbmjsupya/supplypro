package com.supplypro.controller;

import com.supplypro.entity.TaxCategory;
import com.supplypro.service.TaxCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tax-categories")
@CrossOrigin(origins = "*")
public class TaxCategoryController {
    @Autowired
    private TaxCategoryService service;

    @GetMapping
    public ResponseEntity<List<TaxCategory>> getTaxCategories(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(service.search(keyword));
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncTaxCategories() {
        service.syncTaxData();
        return ResponseEntity.ok().body(Map.of("message", "Tax categories synced successfully"));
    }
}
