package com.supplypro.controller;

import com.supplypro.entity.*;
import com.supplypro.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/outbound-orders")
@CrossOrigin(origins = "*")
public class OutboundOrderController {

    @Autowired
    private OutboundOrderRepository outboundOrderRepository;

    @Autowired
    private SalesOrderRepository salesOrderRepository;

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
        
        Page<OutboundOrder> pageResult = outboundOrderRepository.findAll(
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

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody OutboundOrder outboundOrder) {
        if (outboundOrder.getSalesOrder() != null && outboundOrder.getSalesOrder().getId() != null) {
            long soId = outboundOrder.getSalesOrder().getId();
            SalesOrder so = salesOrderRepository.findById(soId).orElse(null);
            outboundOrder.setSalesOrder(so);
        }
        
        outboundOrder.setOutboundNo("OUT-" + System.currentTimeMillis());
        outboundOrder.setStatus(OutboundOrder.Status.PENDING);
        outboundOrder.setSettlementStatus(OutboundOrder.SettlementStatus.UNSETTLED);
        OutboundOrder saved = outboundOrderRepository.save(outboundOrder);
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable long id) {
        OutboundOrder outboundOrder = outboundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Outbound Order not found"));

        if (outboundOrder.getStatus() != OutboundOrder.Status.PENDING) {
            throw new RuntimeException("Outbound Order is not in PENDING status");
        }

        SalesOrder so = outboundOrder.getSalesOrder();
        if (so == null) {
             throw new RuntimeException("Associated Sales Order not found");
        }
        
        Warehouse warehouse = outboundOrder.getWarehouse();

        for (SalesOrderItem item : so.getItems()) {
             Product product = item.getProduct();
             if (product == null && item.getProductId() != null) {
                 long pid = item.getProductId();
                 product = productRepository.findById(pid).orElse(null);
             }
             
             if (product == null) continue;

             int quantityNeeded = item.getQuantity();
             
             // FIFO Strategy: Find active batches sorted by expiry date
             List<StockBatch> batches = stockBatchRepository.findByWarehouseIdAndProductIdAndStatusOrderByExpiryDateAsc(
                 warehouse.getId(), product.getId(), StockBatch.Status.ACTIVE
             );

             int quantityDeducted = 0;

             for (StockBatch batch : batches) {
                 if (quantityDeducted >= quantityNeeded) break;
                 
                 int available = batch.getAvailableQuantity();
                 if (available <= 0) continue;

                 int toDeduct = Math.min(available, quantityNeeded - quantityDeducted);
                 
                 // Update batch
                 batch.setAvailableQuantity(available - toDeduct);
                 batch.setQuantity(batch.getQuantity() - toDeduct); // Assuming quantity is current on-hand
                 if (batch.getAvailableQuantity() == 0) {
                     // Optionally mark as empty/sold_out if we want, or keep active but 0
                     // batch.setStatus(StockBatch.Status.SOLD_OUT);
                 }
                 stockBatchRepository.save(batch);

                 // Create Stock Flow
                 StockFlow flow = new StockFlow();
                 flow.setStockBatch(batch);
                 flow.setWarehouse(warehouse);
                 flow.setProduct(product);
                 flow.setBatchNo(batch.getBatchNo());
                 flow.setFlowType(StockFlow.FlowType.OUTBOUND);
                 flow.setQuantity(toDeduct); // Outbound is usually positive in quantity field, but context implies reduction
                 flow.setBalanceAfter(batch.getAvailableQuantity());
                 flow.setReferenceNo(outboundOrder.getOutboundNo());
                 flow.setReason("Sales Outbound");
                 flow.setOperator("System");
                 
                 stockFlowRepository.save(flow);

                 quantityDeducted += toDeduct;
             }

             if (quantityDeducted < quantityNeeded) {
                 throw new RuntimeException("Insufficient stock for product: " + product.getName());
             }
        }

        outboundOrder.setStatus(OutboundOrder.Status.SHIPPED);
        outboundOrder.setOutboundDate(LocalDateTime.now());
        outboundOrderRepository.save(outboundOrder);
        
        so.setStatus(SalesOrder.Status.SHIPPED);
        salesOrderRepository.save(so);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Confirmed successfully");
        return ResponseEntity.ok(response);
    }
}
