package com.supplypro.controller;

import com.supplypro.entity.*;
import com.supplypro.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/inbound-orders")
@CrossOrigin(origins = "*")
public class InboundOrderController {

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    @Autowired
    private StockFlowRepository stockFlowRepository;
    
    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<InboundOrder> pageResult = inboundOrderRepository.findAll(PageRequest.of(page, size));
        
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
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Long> payload) {
        Long purchaseOrderId = payload.get("purchaseOrderId");
        Long warehouseId = payload.get("warehouseId");

        if (purchaseOrderId == null) {
            throw new RuntimeException("Purchase Order ID is required");
        }
        if (warehouseId == null) {
            throw new RuntimeException("Warehouse ID is required");
        }

        PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        InboundOrder inboundOrder = new InboundOrder();
        inboundOrder.setInboundNo("IN-" + System.currentTimeMillis());
        inboundOrder.setPurchaseOrder(po);
        inboundOrder.setWarehouse(warehouse);
        inboundOrder.setStatus(InboundOrder.Status.PENDING);
        
        InboundOrder saved = inboundOrderRepository.save(inboundOrder);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable long id) {
        InboundOrder inboundOrder = inboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inbound Order not found"));

        if (inboundOrder.getStatus() != InboundOrder.Status.PENDING) {
            throw new RuntimeException("Inbound Order is not in PENDING status");
        }

        PurchaseOrder po = inboundOrder.getPurchaseOrder();
        if (po == null) {
             throw new RuntimeException("Associated Purchase Order not found");
        }

        for (PurchaseOrderItem item : po.getItems()) {
             Product product = item.getProduct();
             if (product == null && item.getProductId() != null) {
                 long pid = item.getProductId();
                 product = productRepository.findById(pid).orElse(null);
             }
             
             if (product == null) continue;

             StockBatch batch = new StockBatch();
             batch.setBatchNo("BATCH-" + System.currentTimeMillis() + "-" + item.getId());
             batch.setProduct(product);
             batch.setWarehouse(inboundOrder.getWarehouse());
             batch.setQuantity(item.getQuantity());
             batch.setAvailableQuantity(item.getQuantity());
             batch.setUnitCost(item.getUnitPrice());
             batch.setTotalCost(item.getTotalPrice());
             batch.setProductionDate(LocalDate.now());
             batch.setExpiryDate(LocalDate.now().plusYears(1));
             batch.setStatus(StockBatch.Status.ACTIVE);
             
             StockBatch savedBatch = stockBatchRepository.save(batch);

             StockFlow flow = new StockFlow();
             flow.setStockBatch(savedBatch);
             flow.setWarehouse(inboundOrder.getWarehouse());
             flow.setProduct(product);
             flow.setBatchNo(savedBatch.getBatchNo());
             flow.setFlowType(StockFlow.FlowType.INBOUND);
             flow.setQuantity(item.getQuantity());
             flow.setBalanceAfter(item.getQuantity());
             flow.setReferenceNo(inboundOrder.getInboundNo());
             flow.setReason("Purchase Inbound");
             flow.setOperator("System");
             
             stockFlowRepository.save(flow);
        }

        inboundOrder.setStatus(InboundOrder.Status.RECEIVED);
        inboundOrder.setInboundDate(LocalDateTime.now());
        inboundOrderRepository.save(inboundOrder);
        
        po.setStatus(PurchaseOrder.Status.RECEIVED);
        purchaseOrderRepository.save(po);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Confirmed successfully");
        return ResponseEntity.ok(response);
    }
}
