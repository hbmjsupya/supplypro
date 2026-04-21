package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.service.PurchaseOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/inboundPurchaseOrder")
@CrossOrigin(origins = "*")
public class InboundPurchaseOrderController {

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestBody PurchaseOrder purchaseOrder) {
        // Idempotency check can be added here (e.g., using a request token)
        
        try {
            PurchaseOrder result = purchaseOrderService.generateInboundPurchaseOrder(purchaseOrder);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Success");
            response.put("data", result);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("code", 400);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/batch-generate")
    public ResponseEntity<Map<String, Object>> batchGenerate(@RequestBody List<PurchaseOrder> purchaseOrders) {
        List<PurchaseOrder> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        
        for (PurchaseOrder po : purchaseOrders) {
            try {
                results.add(purchaseOrderService.generateInboundPurchaseOrder(po));
            } catch (Exception e) {
                errors.add("Failed PO: " + (po.getOrderNo() != null ? po.getOrderNo() : "Unknown") + " Reason: " + e.getMessage());
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", errors.isEmpty() ? 200 : 206);
        response.put("message", errors.isEmpty() ? "Success" : "Partial Success");
        response.put("data", results);
        if (!errors.isEmpty()) {
            response.put("errors", errors);
        }
        
        return ResponseEntity.ok(response);
    }
}
