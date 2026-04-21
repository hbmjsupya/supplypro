package com.supplypro.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderSnapshot;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.PurchaseOrderSnapshotRepository;
import com.supplypro.repository.InboundOrderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Slf4j
public class PurchaseOrderSnapshotService {

    @Autowired
    private PurchaseOrderSnapshotRepository snapshotRepository;
    
    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private SnapshotStorageService storageService;

    @Autowired
    private SnapshotBackfillProducer backfillProducer;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Captures a snapshot of the current Purchase Order state.
     * Uses REQUIRED propagation to share transaction with caller and avoid deadlock.
     */
    @Transactional
    public PurchaseOrderSnapshot captureSnapshot(PurchaseOrder po) {
        return captureSnapshot(po, "NORMAL");
    }

    /**
     * Captures a snapshot with specific type (NORMAL or BACKFILL).
     * Uses REQUIRED propagation to share transaction with caller and avoid deadlock.
     */
    @Transactional
    public PurchaseOrderSnapshot captureSnapshot(PurchaseOrder po, String snapshotType) {
        try {
            log.info("DEBUG: Capturing snapshot for PO {}. DeliveryDate in PO: {}", po.getOrderNo(), po.getDeliveryDate());

            // Explicitly initialize critical relationships to ensure they are available for serialization
            // This prevents "lazy loading" errors or incomplete data during JSON serialization
            if (po.getSupplier() != null) {
                org.hibernate.Hibernate.initialize(po.getSupplier());
                if (po.getSupplier().getPurchaser() != null) {
                    org.hibernate.Hibernate.initialize(po.getSupplier().getPurchaser());
                }
            }
            if (po.getItems() != null) {
                org.hibernate.Hibernate.initialize(po.getItems());
                po.getItems().forEach(item -> {
                    if (item.getProduct() != null) {
                        org.hibernate.Hibernate.initialize(item.getProduct());
                    }
                });
            }

            // 1. Serialize PO to JSON
            String jsonData = objectMapper.writeValueAsString(po);
            
            // 2. Calculate Hash
            String hash = calculateHash(jsonData);
            
            // 3. Check if latest snapshot is identical
            java.util.List<PurchaseOrderSnapshot> latestSnapshots = snapshotRepository.findLatestByPurchaseOrderId(po.getId());
            int nextVersion = 1;
            
            if (!latestSnapshots.isEmpty()) {
                // Self-healing: Handle duplicate isLatest=true records
                if (latestSnapshots.size() > 1) {
                    log.warn("Found {} latest snapshots for PO {}. Cleaning up duplicates before proceeding.", latestSnapshots.size(), po.getOrderNo());
                    
                    // Fix duplicates: Keep only the one with highest version as latest
                    PurchaseOrderSnapshot maxVersionSnapshot = latestSnapshots.stream()
                        .max((s1, s2) -> Integer.compare(s1.getVersion(), s2.getVersion()))
                        .orElse(latestSnapshots.get(0));
                    
                    for (PurchaseOrderSnapshot s : latestSnapshots) {
                        if (s.getId() != maxVersionSnapshot.getId()) {
                            s.setIsLatest(false);
                            snapshotRepository.save(s);
                        }
                    }
                    // Refresh the list after cleanup
                    latestSnapshots = snapshotRepository.findLatestByPurchaseOrderId(po.getId());
                }

                // Check for identical hash in any of the latest snapshots (idempotency)
                for (PurchaseOrderSnapshot latest : latestSnapshots) {
                    if (latest.getSnapshotHash().equals(hash)) {
                        log.info("Snapshot for PO {} is identical to version {}. Skipping.", po.getOrderNo(), latest.getVersion());
                        return latest;
                    }
                }
                
                // Determine next version (max version + 1)
                Integer maxVersion = latestSnapshots.stream()
                    .map(PurchaseOrderSnapshot::getVersion)
                    .max(Integer::compareTo)
                    .orElse(0);
                nextVersion = maxVersion + 1;

                // Mark ALL old ones as not latest
                for (PurchaseOrderSnapshot s : latestSnapshots) {
                    s.setIsLatest(false);
                    snapshotRepository.save(s);
                }
            }
            
            // 4. Create New Snapshot
            // nextVersion is already calculated above
            // int nextVersion = latestOpt.map(s -> s.getVersion() + 1).orElse(1); // Old logic
            
            // Validation: Ensure jsonData (snapshot_data) is not null or empty
            if (jsonData == null || jsonData.isEmpty()) {
                log.error("Failed to create snapshot for PO {}: snapshot_data is null or empty", po.getOrderNo());
                throw new IllegalStateException("Cannot create snapshot with null or empty snapshot_data for PO: " + po.getOrderNo());
            }
            
            PurchaseOrderSnapshot snapshot = new PurchaseOrderSnapshot();
            snapshot.setPurchaseOrderId(po.getId());
            snapshot.setVersion(nextVersion);
            snapshot.setSnapshotHash(hash);
            snapshot.setSnapshotData(jsonData);
            
            // Searchable fields
            snapshot.setOrderNo(po.getOrderNo());
            snapshot.setSupplierName(po.getSupplier() != null ? po.getSupplier().getName() : null);
            snapshot.setStatus(po.getStatus() != null ? po.getStatus().name() : "UNKNOWN");
            snapshot.setShippingStatus(po.getShippingStatus() != null ? po.getShippingStatus().name() : null);
            snapshot.setTotalAmount(po.getTotalAmount());
            snapshot.setCreatedAt(po.getCreatedAt() != null ? po.getCreatedAt() : LocalDateTime.now());
            snapshot.setCreatedBy(po.getCreatedBy());
            snapshot.setIsLatest(true);
            snapshot.setIsFromStockIn(po.getIsFromStockIn());
            
            // New fields
            snapshot.setSettlementStatus(po.getSettlementStatus() != null ? po.getSettlementStatus().name() : null);
            snapshot.setBizType(po.getBizType() != null ? po.getBizType().name() : null);
            snapshot.setType(po.getType() != null ? po.getType().name() : null);
            snapshot.setBizNo(po.getBizNo());
            snapshot.setPlatformOrderNo(po.getPlatformOrderNo());
            snapshot.setPlatformName(po.getPlatformName());
            snapshot.setThirdPartyNo(po.getThirdPartyNo());
            snapshot.setProjectName(po.getProjectName());
            snapshot.setDeliveryDate(po.getDeliveryDate());
            
            // Populate Inbound Order info (Requirement: Sync Inbound Order No/ID)
            if (po.getType() == PurchaseOrder.Type.INBOUND) {
                // First try transient fields
                if (po.getInboundOrderId() != null) {
                    snapshot.setInboundOrderId(po.getInboundOrderId());
                }
                if (po.getInboundOrderNo() != null) {
                    snapshot.setInboundOrderNo(po.getInboundOrderNo());
                }
                
                // If missing, try to fetch from DB
                if (snapshot.getInboundOrderId() == null || snapshot.getInboundOrderNo() == null) {
                    try {
                        inboundOrderRepository.findByPurchaseOrder(po).ifPresent(io -> {
                            snapshot.setInboundOrderId(io.getId());
                            snapshot.setInboundOrderNo(io.getInboundNo());
                        });
                    } catch (Exception e) {
                        log.warn("Failed to fetch associated InboundOrder for PO {}: {}", po.getOrderNo(), e.getMessage());
                    }
                }
            }
            
            // Note: project field is not present in PurchaseOrder entity, leaving it null for now or populate if added later
            // snapshot.setProject(po.getProject());
            
            // Extract product names and specs for search
            if (po.getItems() != null && !po.getItems().isEmpty()) {
                java.util.Set<String> names = new java.util.LinkedHashSet<>();
                java.util.Set<String> specs = new java.util.LinkedHashSet<>();
                for (com.supplypro.entity.PurchaseOrderItem item : po.getItems()) {
                    if (item.getProductName() != null && !item.getProductName().isEmpty()) {
                        names.add(item.getProductName());
                    }
                    if (item.getSpec() != null && !item.getSpec().isEmpty()) {
                        specs.add(item.getSpec());
                    }
                }
                if (!names.isEmpty()) {
                    snapshot.setProductNames(String.join("|", names));
                }
                if (!specs.isEmpty()) {
                    snapshot.setProductSpecs(String.join("|", specs));
                }
            }
            
            snapshot.setSnapshotType(snapshotType);

            PurchaseOrderSnapshot savedSnapshot = snapshotRepository.save(snapshot);
            
            // Update the current snapshot pointer on the PurchaseOrder
            purchaseOrderRepository.updateCurrentSnapshotId(po.getId(), savedSnapshot.getId());
            
            // 5. Store in "Object Storage" (Redundancy)
            storageService.storeSnapshot(po.getOrderNo(), nextVersion, jsonData);
            
            log.info("Captured snapshot v{} for PO {} with ID {}", nextVersion, po.getOrderNo(), savedSnapshot.getId());
            return savedSnapshot;
            
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            log.error("Failed to capture snapshot for PO {}", po.getOrderNo(), e);
            throw new RuntimeException("Snapshot capture failed", e);
        }
    }
    
    /**
     * Trigger Async Backfill (via Queue)
     */
    public void asyncBackfillSnapshot(Long poId) {
        // Backfill only if missing. For updates, use asyncSyncSnapshot (if implemented) or captureSnapshot directly.
        if (!snapshotRepository.findLatestByPurchaseOrderId(poId).isEmpty()) {
            return;
        }
        backfillProducer.sendBackfillRequest(poId);
    }
    
    /**
     * Trigger Async Snapshot Update (Force capture)
     */
    @Async
    @Transactional
    public void asyncCaptureSnapshot(PurchaseOrder po) {
        captureSnapshot(po);
    }

    /**
     * Synchronous Backfill Logic (Called by Consumer)
     */
    @Transactional
    public void backfillSnapshotSync(Long poId) {
        if (!snapshotRepository.findLatestByPurchaseOrderId(poId).isEmpty()) {
            return;
        }
        
        purchaseOrderRepository.findById(poId).ifPresent(po -> {
            log.info("Backfilling snapshot for PO {}", po.getOrderNo());
            try {
                // Force initialization if needed
                po.getItems().size(); 
                if (po.getSupplier() != null) {
                    po.getSupplier().getName();
                }
                
                captureSnapshot(po, "BACKFILL");

            sendBackfillNotification(po);
                
                log.info("Backfill completed for PO {}", po.getOrderNo());
            } catch (Exception e) {
                log.error("Backfill failed for PO {}", po.getOrderNo(), e);
                throw new RuntimeException("Backfill failed", e);
            }
        });
    }

    private void sendBackfillNotification(PurchaseOrder po) {
        String createdBy = po.getCreatedBy();
        if (createdBy != null && !createdBy.isEmpty()) {
            String message = String.format("Purchase Order %s snapshot backfill completed.", po.getOrderNo());
            notificationService.sendNotification(createdBy, message);
        } else {
            log.warn("No creator found for PO {}, skipping notification.", po.getOrderNo());
        }
    }

    private String calculateHash(String data) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] encodedhash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
        for (byte b : encodedhash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
    
    public Page<PurchaseOrderSnapshot> searchSnapshots(Specification<PurchaseOrderSnapshot> spec, Pageable pageable) {
        return snapshotRepository.findAll(spec, pageable);
    }

    /**
     * Retrieves the latest snapshot for a PO and deserializes it to a PurchaseOrder object.
     * Returns Empty if no snapshot exists.
     */
    public Optional<PurchaseOrder> getLatestSnapshotAsPO(Long poId) {
        return snapshotRepository.findLatestByPurchaseOrderId(poId).stream()
                .findFirst()
                .map(this::convertSnapshotToPO);
    }

    /**
     * Converts a PurchaseOrderSnapshot to a PurchaseOrder object by deserializing snapshotData.
     */
    public PurchaseOrder convertSnapshotToPO(PurchaseOrderSnapshot snapshot) {
        try {
            if (snapshot.getSnapshotData() == null) {
                return null;
            }
            
            // Clean up legacy enum strings in JSON before deserialization
            String json = snapshot.getSnapshotData();
            if (json != null) {
                json = json.replace("\"bizType\":\"商品入库\"", "\"bizType\":\"INBOUND\"");
                json = json.replace("\"bizType\":\"入库单\"", "\"bizType\":\"INBOUND\"");
                json = json.replace("\"bizType\":\"平台单\"", "\"bizType\":\"PLATFORM\"");
                json = json.replace("\"bizType\":\"PURCHASE\"", "\"bizType\":\"PLATFORM\"");
                json = json.replace("\"bizType\":\"补货单\"", "\"bizType\":\"REPLENISHMENT\"");
            }
            
            PurchaseOrder po = objectMapper.readValue(json, PurchaseOrder.class);
            // Ensure ID is set (snapshotData might contain it, but safe to set from snapshot's foreign key)
            if (po.getId() == null) {
                po.setId(snapshot.getPurchaseOrderId());
            }
            // Ensure transient fields that might be missing in JSON but present in Snapshot columns are populated
            if (po.getInboundOrderNo() == null) {
                po.setInboundOrderNo(snapshot.getInboundOrderNo());
            }
            if (po.getInboundOrderId() == null) {
                po.setInboundOrderId(snapshot.getInboundOrderId());
            }
            // Recover Supplier if missing (using snapshot's searchable column)
            if (po.getSupplier() == null && snapshot.getSupplierName() != null) {
                 com.supplypro.entity.Supplier s = new com.supplypro.entity.Supplier();
                 s.setName(snapshot.getSupplierName());
                 // ID might be missing but Name is enough for display
                 po.setSupplier(s);
            }
            // Recover New fields if missing
            if (po.getPlatformName() == null) po.setPlatformName(snapshot.getPlatformName());
            if (po.getThirdPartyNo() == null) po.setThirdPartyNo(snapshot.getThirdPartyNo());
            if (po.getProjectName() == null) po.setProjectName(snapshot.getProjectName());
            if (po.getBizNo() == null) po.setBizNo(snapshot.getBizNo());
            if (po.getPlatformOrderNo() == null) po.setPlatformOrderNo(snapshot.getPlatformOrderNo());

            return po;
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize snapshot data for Snapshot ID {}", snapshot.getId(), e);
            return null;
        }
    }
}
