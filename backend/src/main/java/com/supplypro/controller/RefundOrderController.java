package com.supplypro.controller;

import com.supplypro.entity.RefundOrder;
import com.supplypro.service.RefundOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/refund-orders")
public class RefundOrderController {

    @Autowired
    private RefundOrderService refundOrderService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) String refundNo,
            @RequestParam(required = false) String relatedOrderNo,
            @RequestParam(required = false) String platformRefundNo,
            @RequestParam(required = false) RefundOrder.RefundType refundType,
            @RequestParam(required = false) RefundOrder.Bearer bearer,
            @RequestParam(required = false) RefundOrder.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<RefundOrder> result = refundOrderService.search(
                refundNo, relatedOrderNo, platformRefundNo, refundType, bearer, status, page, size);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", Map.of(
                "records", result.getContent(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "currentPage", result.getNumber()
        ));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        RefundOrder order = refundOrderService.getById(id);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", order);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> payload) {
        RefundOrder order = new RefundOrder();
        if (payload.containsKey("platformRefundNo")) order.setPlatformRefundNo((String) payload.get("platformRefundNo"));
        if (payload.containsKey("platformOrderNo")) order.setPlatformOrderNo((String) payload.get("platformOrderNo"));
        if (payload.containsKey("platformSubOrderNo")) order.setPlatformSubOrderNo((String) payload.get("platformSubOrderNo"));
        if (payload.containsKey("bizType")) order.setBizType(RefundOrder.BizType.valueOf((String) payload.get("bizType")));
        if (payload.containsKey("relatedOrderNo")) order.setRelatedOrderNo((String) payload.get("relatedOrderNo"));
        if (payload.containsKey("relatedOrderId")) order.setRelatedOrderId(((Number) payload.get("relatedOrderId")).longValue());
        if (payload.containsKey("refundType")) order.setRefundType(RefundOrder.RefundType.valueOf((String) payload.get("refundType")));
        if (payload.containsKey("bearer")) order.setBearer(RefundOrder.Bearer.valueOf((String) payload.get("bearer")));
        if (payload.containsKey("applicant")) order.setApplicant((String) payload.get("applicant"));
        if (payload.containsKey("refundAmount")) order.setRefundAmount(new java.math.BigDecimal(payload.get("refundAmount").toString()));
        if (payload.containsKey("productId")) order.setProductId(((Number) payload.get("productId")).longValue());
        if (payload.containsKey("productName")) order.setProductName((String) payload.get("productName"));
        if (payload.containsKey("skuId")) order.setSkuId(((Number) payload.get("skuId")).longValue());
        if (payload.containsKey("specName")) order.setSpecName((String) payload.get("specName"));
        if (payload.containsKey("quantity")) order.setQuantity(((Number) payload.get("quantity")).intValue());
        if (payload.containsKey("unitPrice")) order.setUnitPrice(new java.math.BigDecimal(payload.get("unitPrice").toString()));
        if (payload.containsKey("returnAddress")) order.setReturnAddress((String) payload.get("returnAddress"));
        if (payload.containsKey("returnConsignee")) order.setReturnConsignee((String) payload.get("returnConsignee"));
        if (payload.containsKey("returnPhone")) order.setReturnPhone((String) payload.get("returnPhone"));
        if (payload.containsKey("logisticsCompany")) order.setLogisticsCompany((String) payload.get("logisticsCompany"));
        if (payload.containsKey("trackingNo")) order.setTrackingNo((String) payload.get("trackingNo"));
        if (payload.containsKey("approvalRemark")) order.setApprovalRemark((String) payload.get("approvalRemark"));
        if (payload.containsKey("remark")) order.setRemark((String) payload.get("remark"));
        if (payload.containsKey("createdBy")) order.setCreatedBy((String) payload.get("createdBy"));

        RefundOrder created = refundOrderService.create(order);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "创建成功");
        response.put("data", created);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/confirm-receipt")
    public ResponseEntity<Map<String, Object>> confirmReceipt(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {

        String receivedBy = (String) payload.getOrDefault("receivedBy", "当前用户");
        RefundOrder updated = refundOrderService.confirmReceipt(id, receivedBy);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "确认收货成功");
        response.put("data", updated);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/by-related/{orderNo}")
    public ResponseEntity<Map<String, Object>> getByRelatedOrderNo(@PathVariable String orderNo) {
        List<RefundOrder> orders = refundOrderService.getByRelatedOrderNo(orderNo);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("data", orders);
        return ResponseEntity.ok(response);
    }
}
