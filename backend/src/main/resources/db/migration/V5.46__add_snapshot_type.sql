ALTER TABLE purchase_order_snapshots ADD COLUMN snapshot_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
CREATE INDEX idx_snapshot_type ON purchase_order_snapshots(snapshot_type);
