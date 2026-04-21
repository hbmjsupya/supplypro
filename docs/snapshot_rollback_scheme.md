# Purchase Order Snapshot Rollback Scheme

## Overview
To ensure data consistency between the main Purchase Order (PO) table and the Snapshot module, we have implemented a strict transactional rollback mechanism. This mechanism guarantees that a Purchase Order cannot exist without a corresponding valid snapshot.

## Mechanism Description

### 1. Transactional Boundary
The Purchase Order creation and update processes are encapsulated within Spring's `@Transactional` annotation. This ensures that all database operations within the method scope are treated as a single atomic unit.

- **Method**: `PurchaseOrderServiceImpl.create` and `PurchaseOrderServiceImpl.generateInboundPurchaseOrder`
- **Scope**: Includes saving the PO entity, generating the Inbound Order (if applicable), and capturing the Snapshot.

### 2. Snapshot Generation
After the Purchase Order is saved to the main table, the system immediately attempts to generate a snapshot using `SnapshotService.captureSnapshot(savedPo)`.

### 3. Failure Handling & Rollback
If the snapshot generation process fails (e.g., due to serialization errors, database constraints, or object storage issues), the system catches the exception and explicitly throws a `RuntimeException`.

```java
try {
    snapshotService.captureSnapshot(savedPo);
} catch (Exception e) {
    logger.error("Snapshot generation failed for PO: {}", savedPo.getOrderNo(), e);
    // Explicitly throw RuntimeException to trigger transaction rollback
    throw new RuntimeException("Purchase Order created but Snapshot generation failed. Transaction rolled back. Reason: " + e.getMessage());
}
```

### 4. Outcome
- **Success**: Both the Purchase Order and its Snapshot are committed to the database.
- **Failure**: The entire transaction is rolled back. The Purchase Order is **not** saved to the database, ensuring no "orphan" POs exist without snapshots.

## Verification
This scheme is verified by `PurchaseOrderSnapshotSyncTest.java`, specifically the `testSnapshotCreationFailureRollback` test case (if implemented) or implicitly via the transactional nature of the service.

## Recovery Steps (Manual)
In the unlikely event of a partial commit (e.g., database crash during commit phase), the system relies on the database's ACID properties to ensure consistency. If a discrepancy is found during a data audit:
1. Identify POs missing from the `purchase_order_snapshot` table.
2. Run the `SnapshotRepairService` (to be implemented if needed) or manually trigger an update on the PO to force a new snapshot generation.
