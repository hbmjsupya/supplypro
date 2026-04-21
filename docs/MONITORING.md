# Purchase Order Snapshot - Monitoring & Alerting Rules

## 1. Key Metrics to Monitor

### 1.1 Application Metrics (Prometheus/Grafana)
- **Snapshot Creation Rate**: `rate(snapshot_created_total[5m])`
- **Backfill Success/Failure**: `rate(snapshot_backfill_total{status="error"}[5m])`
- **Backfill Latency**: `histogram_quantile(0.95, rate(snapshot_backfill_duration_seconds_bucket[5m]))`
- **Queue Depth**: `rabbitmq_queue_messages{queue="snapshot.backfill.queue"}`
- **DLX Queue Depth**: `rabbitmq_queue_messages{queue="snapshot.dlx.queue"}`

### 1.2 Database Metrics
- **Snapshot Table Size**: Row count of `purchase_order_snapshots`.
- **Slow Queries**: Any query on `purchase_order_snapshots` taking > 200ms.

## 2. Alerting Rules

### 2.1 Critical Alerts (Page On-Call)
- **High Backfill Failure Rate**:
  - Condition: `rate(snapshot_backfill_total{status="error"}[5m]) / rate(snapshot_backfill_total[5m]) > 0.05` (5% Failure Rate)
  - Severity: Critical
  - Action: Check logs for validation errors or connection issues.

- **DLX Queue Build-up**:
  - Condition: `rabbitmq_queue_messages{queue="snapshot.dlx.queue"} > 10`
  - Severity: High
  - Action: Manual intervention required for failed snapshots.

- **Snapshot Storage Failure**:
  - Condition: Log pattern `ERROR .*SnapshotStorageService.*Failed to store snapshot`
  - Severity: High
  - Action: Check Object Storage connectivity.

### 2.2 Warning Alerts
- **High Latency**:
  - Condition: `snapshot_backfill_duration_seconds_p95 > 0.5` (500ms)
  - Severity: Warning
  - Action: Investigate DB performance or network.

- **Queue Backlog**:
  - Condition: `rabbitmq_queue_messages{queue="snapshot.backfill.queue"} > 1000`
  - Severity: Warning
  - Action: Scale up consumers if persistent.

## 3. Log Patterns to Watch
- `MANUAL INTERVENTION REQUIRED` - Indicates retries exhausted.
- `Snapshot hash mismatch` - Indicates data consistency issue (though logic handles this by creating new version).
- `Deadlock` - Transaction issues during high concurrency.

## 4. Dashboard Panels (Suggested)
1. **Snapshot Traffic**: Line chart of Normal vs Backfill snapshots per minute.
2. **Backfill Queue**: Gauge of Ready and Unacked messages.
3. **Latency Heatmap**: Distribution of backfill processing times.
4. **Error Rate**: Ratio of failed/total backfill attempts.
