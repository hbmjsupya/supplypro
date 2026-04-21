package com.supplypro.listener;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.event.PurchaseOrderInboundEvent;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.PurchaseOrderService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@Slf4j
public class PurchaseOrderInboundListener {

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;
    
    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePurchaseOrderInboundEvent(PurchaseOrderInboundEvent event) {
        PurchaseOrder po = event.getPurchaseOrder();
        log.info("Received PurchaseOrderInboundEvent for PO: {}", po.getOrderNo());

        int maxRetries = 3;
        int attempt = 0;
        boolean success = false;

        while (attempt < maxRetries && !success) {
            attempt++;
            try {
                // Double check if Inbound Order already exists (Idempotency)
                if (inboundOrderRepository.findByPurchaseOrder(po).isPresent()) {
                    log.info("Inbound Order already exists for PO: {}, skipping.", po.getOrderNo());
                    return;
                }

                InboundOrder inbound = purchaseOrderService.createInboundOrder(po);
                
                // Update PO reference fields if necessary (though createInboundOrder might handle it, 
                // but PO is detached here so we might need to fetch and update or rely on Service)
                // Since this is AFTER_COMMIT, the PO is committed. We should fetch it fresh if we want to update it.
                // However, createInboundOrder usually saves the InboundOrder which references PO.
                // If we need to update PO back references (platformOrderNo), we should do it here and save PO.
                
                updatePurchaseOrderReferences(po.getId(), inbound.getInboundNo());
                
                log.info("Successfully created Inbound Order: {} for PO: {} on attempt {}", inbound.getInboundNo(), po.getOrderNo(), attempt);
                success = true;

            } catch (Exception e) {
                log.error("Failed to create Inbound Order for PO: {} on attempt {}. Error: {}", po.getOrderNo(), attempt, e.getMessage(), e);
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep(1000 * attempt); // Exponential backoffish
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }

        if (!success) {
            log.error("CRITICAL: Failed to create Inbound Order for PO: {} after {} attempts. Manual intervention required.", po.getOrderNo(), maxRetries);
            // TODO: Send alert/notification
        }
    }
    
    private void updatePurchaseOrderReferences(Long poId, String inboundNo) {
        try {
            purchaseOrderRepository.findById(poId).ifPresent(po -> {
                po.setPlatformOrderNo("入库采购-" + inboundNo);
                if (po.getBizNo() == null || po.getBizNo().isEmpty()) {
                    po.setBizNo(inboundNo);
                }
                purchaseOrderRepository.save(po);
            });
        } catch (Exception e) {
            log.error("Failed to update PO references for ID: {}", poId, e);
        }
    }
}
