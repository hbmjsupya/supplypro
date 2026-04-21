package com.supplypro.controller;

import com.supplypro.entity.LogisticsCompany;
import com.supplypro.repository.LogisticsCompanyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/logistics-companies")
@CrossOrigin(origins = "*")
public class LogisticsCompanyController {

    @Autowired
    private LogisticsCompanyRepository logisticsCompanyRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(required = false) Boolean isDomestic,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "true") Boolean activeOnly) {
        
        List<LogisticsCompany> companies;
        
        if (keyword != null && !keyword.isEmpty()) {
            companies = logisticsCompanyRepository.findByKeyword(keyword);
        } else if (isDomestic != null) {
            companies = logisticsCompanyRepository.findByIsDomestic(isDomestic);
        } else {
            companies = logisticsCompanyRepository.findAllActive();
        }
        
        if (activeOnly) {
            companies = companies.stream()
                .filter(c -> c.getIsActive() == null || c.getIsActive())
                .collect(Collectors.toList());
        }
        
        companies = companies.stream()
            .sorted((a, b) -> {
                int orderA = a.getSortOrder() != null ? a.getSortOrder() : 999;
                int orderB = b.getSortOrder() != null ? b.getSortOrder() : 999;
                return orderA - orderB;
            })
            .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", companies);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{code}")
    public ResponseEntity<LogisticsCompany> getByCode(@PathVariable String code) {
        return logisticsCompanyRepository.findById(code)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<List<LogisticsCompany>> search(@RequestParam String keyword) {
        List<LogisticsCompany> companies = logisticsCompanyRepository.findByKeyword(keyword);
        return ResponseEntity.ok(companies);
    }
}
