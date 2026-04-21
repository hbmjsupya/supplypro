package com.supplypro.controller;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.PurchaseOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.supplypro.service.PurchaseOrderLogisticsSyncService;

@RestController
@RequestMapping("/api/diagnostic")
public class DiagnosticController {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private PurchaseOrderLogisticsSyncService logisticsSyncService;

    @Autowired
    private com.supplypro.service.DataIntegrityMonitorService integrityMonitorService;

    @GetMapping("/check-logistics")
    public ResponseEntity<Map<String, Object>> checkLogistics() {
        List<String> anomalies = logisticsSyncService.checkForAnomalies();
        Map<String, Object> result = new HashMap<>();
        result.put("anomalies", anomalies);
        result.put("count", anomalies.size());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/check-snapshots")
    public ResponseEntity<Map<String, Object>> checkSnapshots() {
        List<String> issues = integrityMonitorService.checkSnapshotConsistency();
        Map<String, Object> result = new HashMap<>();
        result.put("issues", issues);
        result.put("count", issues.size());
        result.put("status", issues.isEmpty() ? "PASSED" : "FAILED");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/check-data")
    public ResponseEntity<Map<String, Object>> checkData() {
        List<PurchaseOrder> inboundPOs = purchaseOrderRepository.findAll().stream()
                .filter(po -> po.getType() == PurchaseOrder.Type.INBOUND)
                .collect(Collectors.toList());

        List<Map<String, Object>> missingInboundOrders = new ArrayList<>();
        List<Map<String, Object>> inconsistentStatus = new ArrayList<>();

        for (PurchaseOrder po : inboundPOs) {
            boolean exists = inboundOrderRepository.findByPurchaseOrder(po).isPresent();
            if (!exists) {
                Map<String, Object> info = new HashMap<>();
                info.put("poId", po.getId());
                info.put("poNo", po.getOrderNo());
                info.put("poStatus", po.getStatus());
                missingInboundOrders.add(info);
            } else {
                // Check status sync
                InboundOrder io = inboundOrderRepository.findByPurchaseOrder(po).get();
                if (po.getStatus() == PurchaseOrder.Status.CANCELLED && io.getStatus() != InboundOrder.Status.CANCELLED) {
                    Map<String, Object> info = new HashMap<>();
                    info.put("poId", po.getId());
                    info.put("poNo", po.getOrderNo());
                    info.put("ioId", io.getId());
                    info.put("poStatus", po.getStatus());
                    info.put("ioStatus", io.getStatus());
                    inconsistentStatus.add(info);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalInboundPOs", inboundPOs.size());
        result.put("missingInboundOrdersCount", missingInboundOrders.size());
        result.put("missingInboundOrders", missingInboundOrders);
        result.put("inconsistentStatusCount", inconsistentStatus.size());
        result.put("inconsistentStatus", inconsistentStatus);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/fix-data")
    @Transactional
    public ResponseEntity<Map<String, Object>> fixData() {
        List<PurchaseOrder> inboundPOs = purchaseOrderRepository.findAll().stream()
                .filter(po -> po.getType() == PurchaseOrder.Type.INBOUND)
                .collect(Collectors.toList());

        int fixedCount = 0;
        int statusFixedCount = 0;

        for (PurchaseOrder po : inboundPOs) {
            // Fix missing Inbound Order
            if (inboundOrderRepository.findByPurchaseOrder(po).isEmpty()) {
                try {
                    // Create inbound order
                    purchaseOrderService.createInboundOrder(po);
                    fixedCount++;
                } catch (Exception e) {
                    // Log error but continue
                    System.err.println("Failed to fix PO " + po.getId() + ": " + e.getMessage());
                }
            } else {
                // Fix status sync
                InboundOrder io = inboundOrderRepository.findByPurchaseOrder(po).get();
                if (po.getStatus() == PurchaseOrder.Status.CANCELLED && io.getStatus() != InboundOrder.Status.CANCELLED) {
                    io.setStatus(InboundOrder.Status.CANCELLED);
                    inboundOrderRepository.save(io);
                    statusFixedCount++;
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("fixedMissingCount", fixedCount);
        result.put("fixedStatusCount", statusFixedCount);
        result.put("message", "Data repair completed");

        return ResponseEntity.ok(result);
    }
}
