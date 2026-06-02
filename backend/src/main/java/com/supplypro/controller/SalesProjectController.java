package com.supplypro.controller;

import com.supplypro.entity.SalesProject;
import com.supplypro.repository.SalesProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales-projects")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SalesProjectController {
    @Autowired
    private SalesProjectRepository salesProjectRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSalesProjects() {
        List<SalesProject> projects = salesProjectRepository.findByIsEnabledTrue();
        return ResponseEntity.ok(Map.of("code", 200, "message", "Success", "data", projects));
    }
}
