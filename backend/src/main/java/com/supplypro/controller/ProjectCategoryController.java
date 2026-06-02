package com.supplypro.controller;

import com.supplypro.entity.ProjectCategory;
import com.supplypro.service.ProjectCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/project-categories")
@CrossOrigin(origins = "*")
public class ProjectCategoryController {
    @Autowired
    private ProjectCategoryService projectCategoryService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getProjectCategories(@RequestParam String salesProjectId) {
        List<ProjectCategory> categories = projectCategoryService.getProjectCategories(salesProjectId);
        return ResponseEntity.ok(Map.of("code", 200, "message", "Success", "data", categories));
    }

    @GetMapping("/leaves")
    public ResponseEntity<Map<String, Object>> getLeafCategories(@RequestParam String salesProjectId) {
        List<ProjectCategory> categories = projectCategoryService.getLeafCategories(salesProjectId);
        return ResponseEntity.ok(Map.of("code", 200, "message", "Success", "data", categories));
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadAndExtract(@RequestParam("file") MultipartFile file) {
        List<Map<String, Object>> extractedData = projectCategoryService.uploadAndExtract(file);
        return ResponseEntity.ok(Map.of("code", 200, "message", "Success", "data", extractedData));
    }

    @PostMapping("/parse-with-ai")
    public ResponseEntity<Map<String, Object>> saveParsedCategories(@RequestBody Map<String, Object> requestBody) {
        String salesProjectId = (String) requestBody.get("salesProjectId");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parsedData = (List<Map<String, Object>>) requestBody.get("parsedData");
        List<ProjectCategory> savedCategories = projectCategoryService.saveParsedCategories(salesProjectId, parsedData);
        return ResponseEntity.ok(Map.of("code", 200, "message", "Success", "data", savedCategories));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteBySalesProjectId(@RequestParam String salesProjectId) {
        projectCategoryService.deleteBySalesProjectId(salesProjectId);
        return ResponseEntity.ok(Map.of("code", 200, "message", "Success", "data", "Deleted"));
    }
}
