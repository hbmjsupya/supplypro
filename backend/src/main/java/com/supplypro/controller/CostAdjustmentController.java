package com.supplypro.controller;

import com.supplypro.common.annotation.OperationLog;
import com.supplypro.entity.CostAdjustmentSheet;
import com.supplypro.entity.CostAdjustmentItem;
import com.supplypro.service.CostAdjustmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cost-adjustments")
@CrossOrigin(origins = "*")
public class CostAdjustmentController {

    @Autowired
    private CostAdjustmentService costAdjustmentService;

    @PostMapping("/single")
    @OperationLog(module = "成本调价", operation = "创建单条成本调价申请")
    public ResponseEntity<Map<String, Object>> createSingle(@RequestBody Map<String, Object> request) {
        Long purchaseOrderId = Long.parseLong(request.get("purchaseOrderId").toString());
        String newCostStr = request.get("newCost").toString();
        String reason = (String) request.get("reason");

        java.math.BigDecimal newCost = new java.math.BigDecimal(newCostStr);

        CostAdjustmentSheet sheet = costAdjustmentService.createSingleAdjustment(purchaseOrderId, newCost, reason);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "调价申请创建成功");
        result.put("data", sheet);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/batch")
    @OperationLog(module = "成本调价", operation = "批量上传成本调价数据")
    public ResponseEntity<Map<String, Object>> batchAdjust(@RequestBody List<Map<String, Object>> adjustments) {
        Map<String, Object> result = costAdjustmentService.batchAdjustWithValidation(adjustments);
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "批量调价处理完成");
        response.put("data", result);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @OperationLog(module = "成本调价", operation = "审批通过调价单")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable Long id) {
        String operator = getCurrentUser();
        CostAdjustmentSheet sheet = costAdjustmentService.approve(id, operator);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "调价单审批通过");
        result.put("data", sheet);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/reject")
    @OperationLog(module = "成本调价", operation = "驳回调价单")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        String operator = getCurrentUser();
        CostAdjustmentSheet sheet = costAdjustmentService.reject(id, reason, operator);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "调价单已驳回");
        result.put("data", sheet);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/revoke")
    @OperationLog(module = "成本调价", operation = "撤销调价单")
    public ResponseEntity<Map<String, Object>> revoke(@PathVariable Long id) {
        String operator = getCurrentUser();
        CostAdjustmentSheet sheet = costAdjustmentService.revoke(id, operator);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "调价单已撤销");
        result.put("data", sheet);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        CostAdjustmentSheet sheet = costAdjustmentService.getById(id);

        Map<String, Object> result = new HashMap<>();
        if (sheet != null) {
            result.put("code", 200);
            result.put("data", sheet);
        } else {
            result.put("code", 404);
            result.put("message", "调价单不存在");
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/sheet-no/{sheetNo}")
    public ResponseEntity<Map<String, Object>> getBySheetNo(@PathVariable String sheetNo) {
        CostAdjustmentSheet sheet = costAdjustmentService.getBySheetNo(sheetNo);

        Map<String, Object> result = new HashMap<>();
        if (sheet != null) {
            result.put("code", 200);
            result.put("data", sheet);
        } else {
            result.put("code", 404);
            result.put("message", "调价单不存在");
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/purchase-order/{purchaseOrderId}")
    public ResponseEntity<Map<String, Object>> getByPurchaseOrderId(@PathVariable Long purchaseOrderId) {
        List<CostAdjustmentItem> items = costAdjustmentService.getItemsByPurchaseOrderId(purchaseOrderId);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", items);
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) String sheetNo,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        CostAdjustmentSheet.Status statusEnum = null;
        if (status != null && !status.isEmpty()) {
            try {
                statusEnum = CostAdjustmentSheet.Status.valueOf(status);
            } catch (IllegalArgumentException e) {
            }
        }

        Page<CostAdjustmentSheet> pageResult = costAdjustmentService.list(sheetNo, supplierName, statusEnum, pageable);

        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", pageResult.getContent());
        result.put("totalElements", pageResult.getTotalElements());
        result.put("totalPages", pageResult.getTotalPages());
        result.put("currentPage", pageResult.getNumber());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/pending-order-ids")
    public ResponseEntity<Map<String, Object>> getPendingAdjustmentOrderIds(@RequestBody List<Long> purchaseOrderIds) {
        List<Long> pendingOrderIds = costAdjustmentService.getPurchaseOrderIdsWithPendingAdjustment(purchaseOrderIds);
        
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", pendingOrderIds);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/reset-by-po-nos")
    @OperationLog(module = "成本调价", operation = "重置采购单调价记录")
    public ResponseEntity<Map<String, Object>> resetAdjustmentByPoNos(@RequestBody List<String> poNos) {
        costAdjustmentService.resetAdjustmentByPoNos(poNos);
        
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "调价记录已重置");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<Map<String, Object>> getItemsBySheetId(@PathVariable Long id) {
        List<CostAdjustmentItem> items = costAdjustmentService.getItemsBySheetId(id);
        
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("data", items);
        return ResponseEntity.ok(result);
    }

    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() ? auth.getName() : "System";
    }
}
