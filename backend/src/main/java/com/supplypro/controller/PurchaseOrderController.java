package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.jpa.domain.Specification;
import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase-orders")
@CrossOrigin(origins = "*")
public class PurchaseOrderController {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String settlementStatus,
            @RequestParam(required = false) String bizType
            ) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        
        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (keyword != null && !keyword.isEmpty()) {
                predicates.add(cb.like(root.get("orderNo"), "%" + keyword + "%"));
            }
            if (supplierName != null && !supplierName.isEmpty()) {
                predicates.add(cb.like(root.get("supplier").get("name"), "%" + supplierName + "%"));
            }
            if (project != null && !project.isEmpty()) {
                predicates.add(cb.equal(root.get("project"), project));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), PurchaseOrder.Status.valueOf(status)));
            }
            if (settlementStatus != null && !settlementStatus.isEmpty()) {
                predicates.add(cb.equal(root.get("settlementStatus"), PurchaseOrder.SettlementStatus.valueOf(settlementStatus)));
            }
            if (bizType != null && !bizType.isEmpty()) {
                predicates.add(cb.equal(root.get("bizType"), bizType));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<PurchaseOrder> pageResult = purchaseOrderRepository.findAll(spec, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", pageResult.getContent(),
            "total", pageResult.getTotalElements(),
            "pageNum", pageResult.getNumber() + 1,
            "pageSize", pageResult.getSize(),
            "pages", pageResult.getTotalPages()
        ));
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable long id) {
        return purchaseOrderRepository.findById(id)
                .map(order -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("data", order);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody PurchaseOrder order) {
        // Basic validation and setup
        if (order.getOrderNo() == null || order.getOrderNo().isEmpty()) {
            order.setOrderNo("PO" + System.currentTimeMillis());
        }
        if (order.getStatus() == null) {
            order.setStatus(PurchaseOrder.Status.PENDING);
        }
        if (order.getCreatedBy() == null) {
            order.setCreatedBy("SYSTEM"); // or from context
        }
        
        // Link items
        if (order.getItems() != null) {
            for (var item : order.getItems()) {
                item.setPurchaseOrder(order);
            }
        }
        
        PurchaseOrder saved = purchaseOrderRepository.save(order);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable long id, @RequestBody Map<String, String> payload) {
        return purchaseOrderRepository.findById(id)
                .map(order -> {
                    String statusStr = payload.get("status");
                    if (statusStr != null) {
                        try {
                            order.setStatus(PurchaseOrder.Status.valueOf(statusStr));
                            purchaseOrderRepository.save(order);
                            Map<String, Object> response = new HashMap<>();
                            response.put("code", 200);
                            response.put("message", "Status updated");
                            return ResponseEntity.ok(response);
                        } catch (IllegalArgumentException e) {
                            return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Invalid status"));
                        }
                    }
                    return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Status required"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable long id, @RequestBody PurchaseOrder order) {
        return purchaseOrderRepository.findById(id)
                .map(existing -> {
                    if (existing.getStatus() != PurchaseOrder.Status.PENDING) {
                        return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Only pending orders can be updated"));
                    }
                    
                    existing.setSupplier(order.getSupplier());
                    existing.setType(order.getType());
                    existing.setDeliveryDate(order.getDeliveryDate());
                    existing.setRemark(order.getRemark());
                    existing.setTotalAmount(order.getTotalAmount());
                    existing.setWarehouseId(order.getWarehouseId());
                    
                    // Update items
                    if (order.getItems() != null) {
                        existing.getItems().clear();
                        for (var item : order.getItems()) {
                            item.setPurchaseOrder(existing);
                            existing.getItems().add(item);
                        }
                    }
                    
                    PurchaseOrder saved = purchaseOrderRepository.save(existing);
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Updated successfully");
                    response.put("data", saved);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable long id) {
        return purchaseOrderRepository.findById(id)
                .map(order -> {
                    if (order.getStatus() != PurchaseOrder.Status.PENDING) {
                        return ResponseEntity.badRequest().<Map<String, Object>>body(Map.of("message", "Only pending orders can be deleted"));
                    }
                    purchaseOrderRepository.delete(order);
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("message", "Deleted successfully");
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
