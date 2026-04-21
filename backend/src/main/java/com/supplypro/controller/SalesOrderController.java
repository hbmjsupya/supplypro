package com.supplypro.controller;

import com.supplypro.entity.SalesOrder;
import com.supplypro.entity.SalesOrderItem;
import com.supplypro.repository.SalesOrderRepository;
import com.supplypro.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/sales-orders")
@CrossOrigin(origins = "*")
public class SalesOrderController {

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<SalesOrder> pageResult = salesOrderRepository.findAll(
            PageRequest.of(page, size, Sort.by("id").descending())
        );
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", pageResult.getContent(),
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable long id) {
        return salesOrderRepository.findById(id)
                .map(order -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("code", 200);
                    response.put("data", order);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody SalesOrder order) {
        // Generate Order No if missing
        if (order.getOrderNo() == null || order.getOrderNo().isEmpty()) {
            order.setOrderNo("SO" + System.currentTimeMillis());
        }

        double totalAmount = 0.0;
        if (order.getItems() != null) {
            for (SalesOrderItem item : order.getItems()) {
                // Validate Product ID
                if (item.getProductId() == null) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("code", 400);
                    error.put("message", "Product ID cannot be null for item");
                    return ResponseEntity.badRequest().body(error);
                }
                // Validate Product Existence
                if (!productRepository.existsById(item.getProductId())) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("code", 400);
                    error.put("message", "Product not found with ID: " + item.getProductId());
                    return ResponseEntity.badRequest().body(error);
                }
                
                // Calculate item total price if missing
                if (item.getTotalPrice() == null) {
                    item.setTotalPrice(item.getUnitPrice().multiply(new java.math.BigDecimal(item.getQuantity())));
                }
                totalAmount += item.getTotalPrice().doubleValue();

                item.setSalesOrder(order);
            }
        }
        
        // Set total amount if missing
        if (order.getTotalAmount() == null) {
            order.setTotalAmount(new java.math.BigDecimal(totalAmount));
        }

        order.setStatus(SalesOrder.Status.PENDING);
        order.setCreatedBy("System"); // Placeholder
        
        SalesOrder saved = salesOrderRepository.save(order);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }
}
