package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.CategoryMapping;
import com.supplypro.service.CategoryMappingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/category-mappings")
@CrossOrigin(origins = "*")
public class CategoryMappingController {

    @Autowired
    private CategoryMappingService categoryMappingService;

    @Autowired
    private ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMappings(@RequestParam String salesProjectId) {
        List<CategoryMapping> mappings = categoryMappingService.getMappings(salesProjectId);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", mappings);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/auto-map")
    public ResponseEntity<Map<String, Object>> autoMap(@RequestBody Map<String, Object> request) {
        String salesProjectId = (String) request.get("salesProjectId");
        boolean useAi = Boolean.TRUE.equals(request.get("useAi"));
        List<CategoryMapping> mappings = categoryMappingService.autoMap(salesProjectId, useAi);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "自动映射完成");
        response.put("data", mappings);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createManualMapping(@RequestBody CategoryMapping mapping) {
        try {
            CategoryMapping saved = categoryMappingService.createManualMapping(mapping);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "创建成功");
            response.put("data", saved);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateMapping(@PathVariable Long id, @RequestBody CategoryMapping mapping) {
        try {
            CategoryMapping updated = categoryMappingService.updateMapping(id, mapping);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "更新成功");
            response.put("data", updated);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 400);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteMapping(@PathVariable Long id) {
        categoryMappingService.deleteMapping(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "删除成功");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/batch-save")
    public ResponseEntity<Map<String, Object>> batchSave(@RequestBody Map<String, Object> request) {
        String salesProjectId = (String) request.get("salesProjectId");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawMappings = (List<Map<String, Object>>) request.get("mappings");
        // Convert LinkedHashMap to CategoryMapping entity (Jackson deserializes JSON objects as LinkedHashMap)
        List<CategoryMapping> mappings = new ArrayList<>();
        for (Map<String, Object> raw : rawMappings) {
            mappings.add(objectMapper.convertValue(raw, CategoryMapping.class));
        }
        categoryMappingService.batchSave(salesProjectId, mappings);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "批量保存成功");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/re-compare")
    public ResponseEntity<Map<String, Object>> reCompare(@RequestBody Map<String, Object> request) {
        String salesProjectId = (String) request.get("salesProjectId");
        boolean useAi = Boolean.TRUE.equals(request.get("useAi"));
        List<CategoryMapping> mappings = categoryMappingService.reCompare(salesProjectId, useAi);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "二次比对完成");
        response.put("data", mappings);
        return ResponseEntity.ok(response);
    }
}
