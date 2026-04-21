package com.supplypro.controller;

import com.supplypro.entity.StockBatch;
import com.supplypro.repository.StockBatchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/batches")
@CrossOrigin(origins = "*")
public class BatchController {

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @PutMapping("/{id}/purchase-order")
    public ResponseEntity<Map<String, Object>> updatePurchaseOrderId(
            @PathVariable Long id,
            @RequestBody Map<String, Long> request) {
        
        Long purchaseOrderId = request.get("purchaseOrderId");
        
        StockBatch batch = stockBatchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Batch not found"));
        
        batch.setPurchaseOrderId(purchaseOrderId);
        stockBatchRepository.save(batch);
        
        return ResponseEntity.ok(Map.of(
            "code", 200,
            "message", "Updated successfully",
            "data", batch
        ));
    }

    @PutMapping("/{id}/unit-cost")
    public ResponseEntity<Map<String, Object>> updateUnitCost(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        
        BigDecimal unitCost = new BigDecimal(request.get("unitCost").toString());
        
        StockBatch batch = stockBatchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Batch not found"));
        
        batch.setUnitCost(unitCost);
        batch.setTotalCost(unitCost.multiply(BigDecimal.valueOf(batch.getQuantity())));
        stockBatchRepository.save(batch);
        
        return ResponseEntity.ok(Map.of(
            "code", 200,
            "message", "Updated successfully",
            "data", batch
        ));
    }
}
