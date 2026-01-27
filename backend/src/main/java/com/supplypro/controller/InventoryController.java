package com.supplypro.controller;

import com.supplypro.entity.StockBatch;
import com.supplypro.repository.StockBatchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(required = false) String warehouseCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String batchNo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        
        Specification<StockBatch> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (warehouseCode != null && !warehouseCode.isEmpty()) {
                predicates.add(cb.equal(root.get("warehouse").get("code"), warehouseCode));
            }
            if (productName != null && !productName.isEmpty()) {
                predicates.add(cb.like(root.get("product").get("name"), "%" + productName + "%"));
            }
            if (batchNo != null && !batchNo.isEmpty()) {
                predicates.add(cb.like(root.get("batchNo"), "%" + batchNo + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        Page<StockBatch> pageResult = stockBatchRepository.findAll(spec, PageRequest.of(page, size));
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", pageResult.getContent(),
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }
}
