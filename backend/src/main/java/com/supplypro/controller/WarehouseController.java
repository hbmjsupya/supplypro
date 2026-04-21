package com.supplypro.controller;

import com.supplypro.entity.Warehouse;
import com.supplypro.entity.StockBatch;
import com.supplypro.entity.Product;
import com.supplypro.entity.User;
import com.supplypro.entity.StockFlow;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.repository.StockFlowRepository;
import com.supplypro.repository.StockBatchRepository;
import com.supplypro.service.WarehouseService;
import com.supplypro.dto.BatchDistributeRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import javax.persistence.criteria.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/warehouses")
@CrossOrigin(origins = "*")
public class WarehouseController {

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private StockFlowRepository stockFlowRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword, // Name or Code
            @RequestParam(required = false) String provinceCode,
            @RequestParam(required = false) String cityCode,
            @RequestParam(required = false) String districtCode,
            @RequestParam(required = false) String productKeyword, // Name, SKU, Category
            @RequestParam(required = false) String managerKeyword, // Name, ID, Phone
            @RequestParam(required = false) List<Warehouse.Status> statuses,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        // Sort by created_at DESC
        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt");
        
        org.springframework.data.jpa.domain.Specification<Warehouse> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // 1. Keyword (Name or Code)
            if (keyword != null && !keyword.trim().isEmpty()) {
                String likePattern = "%" + keyword.trim() + "%";
                predicates.add(cb.or(
                    cb.like(root.get("name"), likePattern),
                    cb.like(root.get("code"), likePattern)
                ));
            }
            
            // 2. Region
            if (provinceCode != null && !provinceCode.isEmpty()) {
                predicates.add(cb.equal(root.get("provinceCode"), provinceCode));
            }
            if (cityCode != null && !cityCode.isEmpty()) {
                predicates.add(cb.equal(root.get("cityCode"), cityCode));
            }
            if (districtCode != null && !districtCode.isEmpty()) {
                predicates.add(cb.equal(root.get("districtCode"), districtCode));
            }
            
            // 3. Product Search (Subquery)
            if (productKeyword != null && !productKeyword.trim().isEmpty()) {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<StockBatch> batchRoot = subquery.from(StockBatch.class);
                Join<StockBatch, Product> productJoin = batchRoot.join("product");
                
                String prodLike = "%" + productKeyword.trim() + "%";
                subquery.select(batchRoot.get("warehouse").get("id"))
                        .where(cb.or(
                            cb.like(productJoin.get("name"), prodLike),
                            cb.like(productJoin.get("skuCode"), prodLike), // Assuming skuCode exists in Product
                            cb.like(productJoin.get("categoryName"), prodLike) // Assuming categoryName exists
                        ));
                
                predicates.add(root.get("id").in(subquery));
            }
            
            // 4. Manager Search (Join)
            if (managerKeyword != null && !managerKeyword.trim().isEmpty()) {
                Join<Warehouse, User> managerJoin = root.join("managers", JoinType.LEFT);
                String mgrLike = "%" + managerKeyword.trim() + "%";
                predicates.add(cb.or(
                    cb.like(managerJoin.get("username"), mgrLike),
                    cb.like(managerJoin.get("phone"), mgrLike)
                    // Add other fields if necessary
                ));
                query.distinct(true);
            }
            
            // 5. Status
            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }

            // Date Range
            if (startDate != null && !startDate.isEmpty()) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), java.time.LocalDateTime.parse(startDate + "T00:00:00")));
            }
            if (endDate != null && !endDate.isEmpty()) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), java.time.LocalDateTime.parse(endDate + "T23:59:59")));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Warehouse> pageResult = warehouseRepository.findAll(spec, PageRequest.of(page, size, sort));
        
        // 计算每个仓库的成本合计（从StockFlow流水记录计算最后结存成本之和）
        List<StockFlow> allFlows = stockFlowRepository.findAll();
        
        // 按仓库分组，计算每个仓库每个商品的最新结存成本
        Map<Long, Map<Long, BigDecimal>> warehouseProductCostMap = new HashMap<>();
        
        // 先按时间排序计算每个商品的累计结存成本
        allFlows.stream()
            .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
            .forEach(flow -> {
                if (flow.getWarehouse() != null && flow.getProduct() != null) {
                    Long warehouseId = flow.getWarehouse().getId();
                    Long productId = flow.getProduct().getId();
                    
                    warehouseProductCostMap.computeIfAbsent(warehouseId, k -> new HashMap<>());
                    Map<Long, BigDecimal> productCostMap = warehouseProductCostMap.get(warehouseId);
                    
                    // 累计结存成本
                    BigDecimal currentCost = productCostMap.getOrDefault(productId, BigDecimal.ZERO);
                    BigDecimal costChange = flow.getCostChange() != null ? flow.getCostChange() : BigDecimal.ZERO;
                    productCostMap.put(productId, currentCost.add(costChange));
                }
            });
        
        // 计算每个仓库的总成本
        Map<Long, BigDecimal> warehouseCostMap = new HashMap<>();
        for (Map.Entry<Long, Map<Long, BigDecimal>> entry : warehouseProductCostMap.entrySet()) {
            Long warehouseId = entry.getKey();
            BigDecimal totalCost = entry.getValue().values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            warehouseCostMap.put(warehouseId, totalCost);
        }
        
        // 构建返回数据
        List<Map<String, Object>> recordsWithCost = new ArrayList<>();
        for (Warehouse warehouse : pageResult.getContent()) {
            Map<String, Object> warehouseMap = new HashMap<>();
            warehouseMap.put("id", warehouse.getId());
            warehouseMap.put("name", warehouse.getName());
            warehouseMap.put("code", warehouse.getCode());
            warehouseMap.put("province", warehouse.getProvince());
            warehouseMap.put("city", warehouse.getCity());
            warehouseMap.put("district", warehouse.getDistrict());
            warehouseMap.put("provinceCode", warehouse.getProvinceCode());
            warehouseMap.put("cityCode", warehouse.getCityCode());
            warehouseMap.put("districtCode", warehouse.getDistrictCode());
            warehouseMap.put("address", warehouse.getAddress());
            warehouseMap.put("managers", warehouse.getManagers());
            warehouseMap.put("managerIds", warehouse.getManagers() != null ? 
                warehouse.getManagers().stream().map(User::getId).collect(java.util.stream.Collectors.toList()) : null);
            warehouseMap.put("status", warehouse.getStatus());
            warehouseMap.put("createdAt", warehouse.getCreatedAt());
            warehouseMap.put("updatedAt", warehouse.getUpdatedAt());
            warehouseMap.put("totalCost", warehouseCostMap.getOrDefault(warehouse.getId(), BigDecimal.ZERO));
            
            recordsWithCost.add(warehouseMap);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", recordsWithCost,
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/next-code")
    public ResponseEntity<Map<String, Object>> getNextCode() {
        String code = warehouseService.generateNextCode();
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", code);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable long id) {
        return warehouseRepository.findById(id).map(warehouse -> {
             // Populate transient managerIds for frontend
             if (warehouse.getManagers() != null) {
                 warehouse.setManagerIds(warehouse.getManagers().stream().map(com.supplypro.entity.User::getId).collect(java.util.stream.Collectors.toList()));
             }
             Map<String, Object> response = new HashMap<>();
             response.put("code", 200);
             response.put("data", warehouse);
             return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Warehouse warehouse) {
        if (warehouse == null) return ResponseEntity.badRequest().build();
        Warehouse saved = warehouseService.createWarehouse(warehouse, warehouse.getManagerIds());
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody Warehouse warehouse) {
        try {
            Warehouse saved = warehouseService.updateWarehouse(id, warehouse, warehouse.getManagerIds());
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Success");
            response.put("data", saved);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable long id, @RequestBody Map<String, String> payload) {
        try {
            String statusStr = payload.get("status");
            if (statusStr == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Status is required"));
            }
            Warehouse.Status status = Warehouse.Status.valueOf(statusStr);
            warehouseService.updateStatus(id, status);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Status updated successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid status"));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable long id) {
        warehouseService.deleteWarehouse(id);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/batch-distribute")
    public ResponseEntity<Map<String, Object>> batchDistribute(@RequestBody BatchDistributeRequest request) {
        Map<String, Object> result = warehouseService.batchDistributeProducts(request);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", result);
        return ResponseEntity.ok(response);
    }
}
