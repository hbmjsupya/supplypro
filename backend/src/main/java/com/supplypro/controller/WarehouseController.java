package com.supplypro.controller;

import com.supplypro.entity.Warehouse;
import com.supplypro.repository.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/warehouses")
@CrossOrigin(origins = "*")
public class WarehouseController {

    @Autowired
    private WarehouseRepository warehouseRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<Warehouse> pageResult = warehouseRepository.findAll(PageRequest.of(page, size));
        
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
    public ResponseEntity<Map<String, Object>> create(@RequestBody Warehouse warehouse) {
        if (warehouse == null) return ResponseEntity.badRequest().build();
        Warehouse saved = warehouseRepository.save(warehouse);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody Warehouse warehouse) {
        return warehouseRepository.findById(id).map(existing -> {
            existing.setName(warehouse.getName());
            existing.setCode(warehouse.getCode());
            existing.setProvince(warehouse.getProvince());
            existing.setCity(warehouse.getCity());
            existing.setDistrict(warehouse.getDistrict());
            existing.setAddress(warehouse.getAddress());
            existing.setManager(warehouse.getManager());
            existing.setAdmins(warehouse.getAdmins());
            existing.setStatus(warehouse.getStatus());
            Warehouse saved = warehouseRepository.save(existing);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Success");
            response.put("data", saved);
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable long id) {
        warehouseRepository.deleteById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        return ResponseEntity.ok(response);
    }
}
