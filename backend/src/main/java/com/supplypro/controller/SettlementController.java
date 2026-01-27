package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.service.SettlementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settlements")
@CrossOrigin(origins = "*")
public class SettlementController {

    @Autowired
    private SettlementService settlementService;

    @PostMapping("/generate")
    public ApiResponse<SettlementOrder> generate(@RequestBody Map<String, Object> payload) {
        Long supplierId = Long.valueOf(payload.get("supplierId").toString());
        List<Integer> orderIdsInt = (List<Integer>) payload.get("orderIds");
        List<Long> orderIds = orderIdsInt.stream().map(Long::valueOf).collect(java.util.stream.Collectors.toList());
        String createdBy = "admin"; // TODO: get user
        
        return ApiResponse.success(settlementService.createSettlement(supplierId, orderIds, createdBy));
    }
    
    @GetMapping
    public ApiResponse<List<SettlementOrder>> getAll() {
        return ApiResponse.success(settlementService.getAll());
    }

    @PostMapping("/{id}/pay")
    public ApiResponse<?> pay(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String method = (String) payload.get("paymentMethod");
        String proof = (String) payload.get("paymentProof");
        String operator = "admin";
        settlementService.paySettlement(id, method, proof, operator);
        return ApiResponse.success("Paid successfully", null);
    }
}
