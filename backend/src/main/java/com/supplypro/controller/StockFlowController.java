package com.supplypro.controller;

import com.supplypro.entity.StockFlow;
import com.supplypro.repository.StockFlowRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stock-flows")
@CrossOrigin(origins = "*")
public class StockFlowController {

    @Autowired
    private StockFlowRepository stockFlowRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String warehouseName,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String batchNo,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        Specification<StockFlow> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (warehouseName != null && !warehouseName.isEmpty()) {
                predicates.add(cb.like(root.get("warehouse").get("name"), "%" + warehouseName + "%"));
            }
            if (productName != null && !productName.isEmpty()) {
                predicates.add(cb.like(root.get("product").get("name"), "%" + productName + "%"));
            }
            if (batchNo != null && !batchNo.isEmpty()) {
                predicates.add(cb.like(root.get("batchNo"), "%" + batchNo + "%"));
            }
            if (startDate != null && !startDate.isEmpty()) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), LocalDate.parse(startDate).atStartOfDay()));
            }
            if (endDate != null && !endDate.isEmpty()) {
                 predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), LocalDate.parse(endDate).plusDays(1).atStartOfDay()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<StockFlow> pageResult = stockFlowRepository.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

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
