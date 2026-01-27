package com.supplypro.controller;

import com.supplypro.entity.LogisticsProvider;
import com.supplypro.repository.LogisticsProviderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/logistics")
@CrossOrigin(origins = "*")
public class LogisticsProviderController {

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<LogisticsProvider> pageResult = logisticsProviderRepository.findAll(PageRequest.of(page, size));
        
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
    public ResponseEntity<Map<String, Object>> create(@RequestBody LogisticsProvider provider) {
        provider.setStatus("ACTIVE");
        LogisticsProvider saved = logisticsProviderRepository.save(provider);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody LogisticsProvider provider) {
        return logisticsProviderRepository.findById(id).map(existing -> {
            existing.setName(provider.getName());
            existing.setContactPerson(provider.getContactPerson());
            existing.setContactPhone(provider.getContactPhone());
            existing.setStatus(provider.getStatus());
            LogisticsProvider saved = logisticsProviderRepository.save(existing);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Updated successfully");
            response.put("data", saved);
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }
}
