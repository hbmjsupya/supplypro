# Purchase Order Snapshot & Visibility Fix - Deployment Manual

## 1. Overview
This release fixes the visibility issue for stock-in generated Purchase Orders and introduces an immutable snapshot mechanism for all POs. It includes database schema changes, new services, and async backfill processing.

## 2. Pre-requisites
- **Database**: MySQL 8.0+
- **Message Queue**: RabbitMQ 3.11+ (Plugins: `rabbitmq_delayed_message_exchange` optional but DLX used)
- **Object Storage**: MinIO/S3 (Configured in application.yml)

## 3. Database Migration
Run the following Flyway scripts in order:
1. `V5.44__create_purchase_order_snapshots.sql` - Creates snapshot table.
2. `V5.45__add_missing_fields_to_snapshots.sql` - Adds missing business fields.
3. `V5.46__add_snapshot_type.sql` - Adds snapshot type and index.
4. `V5.47__create_notifications.sql` - Creates notifications table.

## 4. Launch Steps

### Phase 1: Gray Scale (10% Traffic) - 24 Hours
1. Deploy new backend instance to a canary/gray environment.
2. Route 10% of traffic (based on user ID or random) to the new instance.
3. Monitor logs for `ERROR` level, specifically in `PurchaseOrderSnapshotService`.
4. **Exit Criteria**: Zero customer complaints, Error rate < 0.1%.

### Phase 2: Full Rollout
1. Apply database migrations to production DB.
2. Deploy new backend version to all nodes.
3. Enable "Backfill" feature flag (if applicable, currently auto-enabled on access).

### Phase 3: Legacy Data Backfill (Launch Night)
1. The system is designed to backfill data lazily when accessed.
2. **For Full Backfill**:
   - Run the provided script or API endpoint to trigger backfill for all historical POs.
   - Endpoint: `POST /api/purchase-orders/backfill-all` (Need to implement if requested, currently per-PO on access).
   - Alternatively, use the script: `scripts/trigger_backfill.sh` (Pseudo-script invoking API).
3. Monitor RabbitMQ `snapshot.backfill.queue`.

## 5. Rollback Plan
**Trigger**: Critical bug found in snapshot logic or data corruption.

1. **Code Rollback**: Revert backend image to previous version.
2. **Database**:
   - The new tables (`purchase_order_snapshots`, `notifications`) can coexist with old code.
   - **Caution**: If `is_from_stock_in` column was added to `purchase_orders` (it was), ensure old code ignores it (usually safe).
3. **Data**:
   - Snapshot data is additive. No data loss in `purchase_orders` table.
4. **Legacy Interface**:
   - The old API endpoints were refactored. If rollback is needed, the old version will simply query the `purchase_orders` table again (ignoring snapshots).

## 6. Verification
1. Create a new Stock-In PO -> Verify it appears in the list immediately.
2. Edit a PO -> Verify a new snapshot version is created.
3. Check `snapshot_type` is 'NORMAL' for new edits.
4. Access an old PO -> Verify `snapshot_type` becomes 'BACKFILL' and notification is received.

