package com.supplypro.service;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PurchaseOrderLogisticsSyncService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseOrderLogisticsSyncService.class);

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    /**
     * Periodically check for status inconsistencies between PurchaseOrder and InboundOrder.
     * Runs every 10 minutes.
     */
    @Scheduled(cron = "0 */10 * * * *")
    @Transactional(readOnly = true)
    public List<String> checkForAnomalies() {
        logger.info("Starting Purchase Order / Inbound Order status anomaly check...");
        List<String> anomalies = new java.util.ArrayList<>();

        // 1. Check Cancelled POs -> Inbound should be Cancelled
        List<PurchaseOrder> cancelledPos = purchaseOrderRepository.findAllByStatus(PurchaseOrder.Status.CANCELLED);
        for (PurchaseOrder po : cancelledPos) {
            InboundOrder io = inboundOrderRepository.findByPurchaseOrder(po).orElse(null);
            if (io != null && io.getStatus() != InboundOrder.Status.CANCELLED) {
                String msg = String.format("ANOMALY: PurchaseOrder %s is CANCELLED but InboundOrder %s is %s", 
                        po.getOrderNo(), io.getInboundNo(), io.getStatus());
                logger.warn(msg);
                anomalies.add(msg);
            }
        }

        // 2. Check Received Inbound -> PO should be Received
        List<InboundOrder> receivedInbounds = inboundOrderRepository.findAllByStatus(InboundOrder.Status.RECEIVED);
        for (InboundOrder io : receivedInbounds) {
            PurchaseOrder po = io.getPurchaseOrder();
            if (po != null && po.getStatus() != PurchaseOrder.Status.RECEIVED) {
                String msg = String.format("ANOMALY: InboundOrder %s is RECEIVED but PurchaseOrder %s is %s", 
                        io.getInboundNo(), po.getOrderNo(), po.getStatus());
                logger.warn(msg);
                anomalies.add(msg);
            }
        }

        // 3. Check Shipped PO -> Inbound should exist (if created)
        List<PurchaseOrder> shippedPos = purchaseOrderRepository.findAllByStatus(PurchaseOrder.Status.SHIPPED);
        for (PurchaseOrder po : shippedPos) {
            if (po.getType() == PurchaseOrder.Type.INBOUND) {
                InboundOrder io = inboundOrderRepository.findByPurchaseOrder(po).orElse(null);
                if (io == null) {
                    String msg = String.format("ANOMALY: PurchaseOrder %s is SHIPPED (Inbound Type) but no InboundOrder found", 
                            po.getOrderNo());
                    logger.warn(msg);
                    anomalies.add(msg);
                }
            }
        }

        if (!anomalies.isEmpty()) {
            logger.warn("Status anomaly check completed with {} issues found.", anomalies.size());
        } else {
            logger.info("Status anomaly check completed. No issues found.");
        }
        
        return anomalies;
    }
}
