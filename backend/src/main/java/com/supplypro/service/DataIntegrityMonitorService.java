package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.InboundOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.InboundOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service to monitor data integrity and consistency across the system.
 * Runs scheduled checks to detect orphaned records, missing fields, or status mismatches.
 */
@Service
public class DataIntegrityMonitorService {

    private static final Logger logger = LoggerFactory.getLogger(DataIntegrityMonitorService.class);

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private PurchaseOrderSnapshotService snapshotService;
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Run data integrity checks every hour.
     */
    @Scheduled(cron = "0 0 * * * ?") 
    @Transactional(readOnly = true)
    public void checkDataIntegrity() {
        logger.info("[DataMonitor] Starting Data Integrity Check...");
        
        try {
            checkPurchaseOrderIntegrity();
            checkInboundOrderIntegrity();
            checkSnapshotConsistency();
            checkSnapshotDataIntegrity();
        } catch (Exception e) {
            logger.error("[DataMonitor] Error during integrity check", e);
        }
        
        logger.info("[DataMonitor] Data Integrity Check Completed.");
    }
    
    /**
     * Check for snapshots with null or empty snapshot_data.
     * This runs daily to detect and report dirty data.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void checkSnapshotDataIntegrity() {
        logger.info("[DataMonitor] Checking Snapshot Data Integrity (null snapshot_data)...");
        
        try {
            // Count snapshots with null snapshot_data
            javax.persistence.Query countQuery = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM purchase_order_snapshots WHERE snapshot_data IS NULL");
            Long nullDataCount = ((Number) countQuery.getSingleResult()).longValue();
            
            if (nullDataCount > 0) {
                logger.error("[DataMonitor] ALERT: Found {} snapshots with NULL snapshot_data. These are invalid records that need cleanup.", nullDataCount);
                
                // Get details of invalid snapshots
                javax.persistence.Query detailQuery = entityManager.createNativeQuery(
                    "SELECT id, purchase_order_id, status, is_latest FROM purchase_order_snapshots WHERE snapshot_data IS NULL LIMIT 10");
                @SuppressWarnings("unchecked")
                java.util.List<Object[]> invalidSnapshots = detailQuery.getResultList();
                
                for (Object[] row : invalidSnapshots) {
                    logger.error("[DataMonitor] Invalid Snapshot - ID: {}, PO_ID: {}, Status: {}, IsLatest: {}", 
                        row[0], row[1], row[2], row[3]);
                }
                
                // Auto-cleanup: Delete invalid snapshots
                logger.info("[DataMonitor] Auto-cleaning {} invalid snapshots...", nullDataCount);
                javax.persistence.Query deleteQuery = entityManager.createNativeQuery(
                    "DELETE FROM purchase_order_snapshots WHERE snapshot_data IS NULL");
                int deleted = deleteQuery.executeUpdate();
                logger.info("[DataMonitor] Auto-cleaned {} invalid snapshots", deleted);
            } else {
                logger.info("[DataMonitor] Snapshot Data Integrity Check Passed. No invalid snapshots found.");
            }
        } catch (Exception e) {
            logger.error("[DataMonitor] Error checking snapshot data integrity", e);
        }
    }

    public java.util.List<String> checkSnapshotConsistency() {
        logger.info("[DataMonitor] Checking Purchase Order Snapshot Consistency...");
        List<PurchaseOrder> allPos = purchaseOrderRepository.findAll();
        java.util.List<String> issues = new java.util.ArrayList<>();
        int inconsistencyCount = 0;

        for (PurchaseOrder livePo : allPos) {
            try {
                java.util.Optional<PurchaseOrder> snapshotOpt = snapshotService.getLatestSnapshotAsPO(livePo.getId());
                
                if (snapshotOpt.isPresent()) {
                    PurchaseOrder snapshotPo = snapshotOpt.get();
                    
                    // Compare Critical Fields
                    boolean statusMismatch = livePo.getStatus() != snapshotPo.getStatus();
                    boolean amountMismatch = (livePo.getTotalAmount() != null && snapshotPo.getTotalAmount() != null) 
                            && livePo.getTotalAmount().compareTo(snapshotPo.getTotalAmount()) != 0;
                    
                    if (statusMismatch || amountMismatch) {
                        inconsistencyCount++;
                        String issue = String.format("ALERT: Snapshot Consistency Failure for PO %d. Live Status: %s, Snapshot Status: %s. Live Amount: %s, Snapshot Amount: %s", 
                                livePo.getId(), livePo.getStatus(), snapshotPo.getStatus(), livePo.getTotalAmount(), snapshotPo.getTotalAmount());
                        issues.add(issue);
                        logger.error("[DataMonitor] " + issue);
                    }
                } else {
                    // Missing Snapshot is also a consistency issue for non-new orders
                    if (livePo.getCreatedAt().isBefore(java.time.LocalDateTime.now().minusMinutes(5))) {
                        String issue = String.format("WARNING: PO %d has no snapshot.", livePo.getId());
                        issues.add(issue);
                        logger.warn("[DataMonitor] " + issue);
                    }
                }
            } catch (Exception e) {
                logger.error("[DataMonitor] Error checking snapshot for PO {}", livePo.getId(), e);
            }
        }
        
        if (inconsistencyCount > 0) {
            logger.error("[DataMonitor] Snapshot Integrity Check Failed. Found {} inconsistent POs.", inconsistencyCount);
        } else {
            logger.info("[DataMonitor] Snapshot Integrity Check Passed. All checked POs are consistent.");
        }
        return issues;
    }

    private void checkPurchaseOrderIntegrity() {
        List<PurchaseOrder> allPos = purchaseOrderRepository.findAll();
        
        // Check 1: Missing Supplier or CreatedAt
        List<Long> invalidPoIds = allPos.stream()
                .filter(po -> po.getSupplier() == null || po.getCreatedAt() == null)
                .map(PurchaseOrder::getId)
                .collect(Collectors.toList());
        
        if (!invalidPoIds.isEmpty()) {
            logger.error("[DataMonitor] ALERT: Found {} Purchase Orders with missing critical data (Supplier or CreatedAt). IDs: {}", 
                    invalidPoIds.size(), invalidPoIds);
        }

        // Check 2: Total Amount is null or zero (warning level)
        List<Long> zeroAmountIds = allPos.stream()
                .filter(po -> po.getTotalAmount() == null)
                .map(PurchaseOrder::getId)
                .collect(Collectors.toList());
        
        if (!zeroAmountIds.isEmpty()) {
            logger.warn("[DataMonitor] WARNING: Found {} Purchase Orders with null Total Amount. IDs: {}", 
                    zeroAmountIds.size(), zeroAmountIds);
        }
    }

    private void checkInboundOrderIntegrity() {
        List<InboundOrder> allInbounds = inboundOrderRepository.findAll();

        // Check 1: Missing Relations
        List<Long> orphanIds = allInbounds.stream()
                .filter(io -> io.getPurchaseOrder() == null || io.getWarehouse() == null)
                .map(InboundOrder::getId)
                .collect(Collectors.toList());

        if (!orphanIds.isEmpty()) {
            logger.error("[DataMonitor] ALERT: Found {} Inbound Orders with missing relations (PO or Warehouse). IDs: {}",
                    orphanIds.size(), orphanIds);
        }
        
        // Check 2: Inbound No format
        List<Long> invalidNoIds = allInbounds.stream()
                .filter(io -> io.getInboundNo() == null || !io.getInboundNo().startsWith("IN"))
                .map(InboundOrder::getId)
                .collect(Collectors.toList());
                
        if (!invalidNoIds.isEmpty()) {
            logger.warn("[DataMonitor] WARNING: Found {} Inbound Orders with non-standard Inbound No. IDs: {}",
                    invalidNoIds.size(), invalidNoIds);
        }
    }
}
