ALTER TABLE purchase_order_snapshots ADD COLUMN project VARCHAR(255);
ALTER TABLE purchase_order_snapshots ADD COLUMN settlement_status VARCHAR(50);
ALTER TABLE purchase_order_snapshots ADD COLUMN biz_type VARCHAR(50);
ALTER TABLE purchase_order_snapshots ADD COLUMN platform_order_no VARCHAR(100);
ALTER TABLE purchase_order_snapshots ADD COLUMN biz_no VARCHAR(100);

CREATE INDEX idx_snapshot_project ON purchase_order_snapshots(project);
CREATE INDEX idx_snapshot_settlement_status ON purchase_order_snapshots(settlement_status);
CREATE INDEX idx_snapshot_biz_type ON purchase_order_snapshots(biz_type);
CREATE INDEX idx_snapshot_platform_order_no ON purchase_order_snapshots(platform_order_no);
CREATE INDEX idx_snapshot_biz_no ON purchase_order_snapshots(biz_no);
