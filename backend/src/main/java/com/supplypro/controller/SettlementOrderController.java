package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.OutboundOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.OutboundOrderRepository;
import com.supplypro.service.SettlementService;
import com.supplypro.common.ApiResponse;
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
@RequestMapping("/api/settlements")
@CrossOrigin(origins = "*")
public class SettlementOrderController {

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private OutboundOrderRepository outboundOrderRepository;

    @Autowired
    private SettlementService settlementService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) SettlementOrder.Type type) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("id").descending());
        Page<SettlementOrder> pageResult;
        
        if (type != null) {
            pageResult = settlementOrderRepository.findByType(type, pageRequest);
        } else {
            pageResult = settlementOrderRepository.findAll(pageRequest);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", pageResult.getContent(),
            "total", pageResult.getTotalElements()
        ));
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate")
    @SuppressWarnings("unchecked")
    public ApiResponse<SettlementOrder> generate(@RequestBody Map<String, Object> payload) {
        Long supplierId = Long.valueOf(payload.get("supplierId").toString());
        List<Integer> orderIdsInt = (List<Integer>) payload.get("orderIds");
        List<Long> orderIds = orderIdsInt.stream().map(Integer::longValue).collect(java.util.stream.Collectors.toList());
        String createdBy = "admin"; // TODO: get user
        
        return ApiResponse.success(settlementService.createSettlement(supplierId, orderIds, createdBy));
    }

    @PostMapping("/{id}/pay")
    public ApiResponse<?> pay(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String method = (String) payload.get("paymentMethod");
        String proof = (String) payload.get("paymentProof");
        String operator = "admin";
        settlementService.paySettlement(id, method, proof, operator);
        return ApiResponse.success("Paid successfully", null);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@RequestBody SettlementOrder settlementOrder) {
        settlementOrder.setSettlementNo("SET-" + System.currentTimeMillis());
        settlementOrder.setStatus(SettlementOrder.Status.PENDING);
        
        SettlementOrder saved = settlementOrderRepository.save(settlementOrder);
        
        // Update related order status if needed
        if (settlementOrder.getType() == SettlementOrder.Type.PURCHASE && settlementOrder.getRelatedOrderNo() != null) {
             PurchaseOrder po = purchaseOrderRepository.findByOrderNo(settlementOrder.getRelatedOrderNo());
             if (po != null) {
                 po.setSettlementStatus(PurchaseOrder.SettlementStatus.PARTIALLY_SETTLED); // Or SETTLED based on amount
                 purchaseOrderRepository.save(po);
             }
        } else if (settlementOrder.getType() == SettlementOrder.Type.LOGISTICS && settlementOrder.getRelatedOrderNo() != null) {
             OutboundOrder oo = outboundOrderRepository.findByOutboundNo(settlementOrder.getRelatedOrderNo());
             if (oo != null) {
                 oo.setSettlementStatus(OutboundOrder.SettlementStatus.PARTIALLY_SETTLED);
                 outboundOrderRepository.save(oo);
             }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Created successfully");
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable long id) {
        return settlementOrderRepository.findById(id).map(order -> {
            order.setStatus(SettlementOrder.Status.SETTLED);
            order.setPaymentDate(LocalDateTime.now());
            settlementOrderRepository.save(order);
            
            // Update PO to FULLY SETTLED if logical
            if (order.getType() == SettlementOrder.Type.PURCHASE && order.getRelatedOrderNo() != null) {
                PurchaseOrder po = purchaseOrderRepository.findByOrderNo(order.getRelatedOrderNo());
                if (po != null) {
                    po.setSettlementStatus(PurchaseOrder.SettlementStatus.SETTLED);
                    purchaseOrderRepository.save(po);
                }
           }

            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "Confirmed successfully");
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }
}
