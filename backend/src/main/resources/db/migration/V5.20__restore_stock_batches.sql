-- Restore stock batches for testing bundle inventory validation
-- Ensure type column exists (if missing)
ALTER TABLE products ADD COLUMN type VARCHAR(20) DEFAULT 'NORMAL';

-- Ensure warehouse 1 exists (if not, insert dummy)
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status) 
VALUES (1, '北京总仓', 'WH-BJ-01', '华北', '北京市大兴区物流园1号', '陈建国', 'ACTIVE');

INSERT IGNORE INTO stock_batches (product_id, warehouse_id, batch_no, quantity, available_quantity, unit_cost, total_cost, status, created_at, updated_at)
SELECT id, 1, CONCAT('BATCH_', sku_code), 100, 100, 0.0, 0.0, 'ACTIVE', NOW(), NOW()
FROM products
WHERE type = 'NORMAL'
AND sku_code IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM stock_batches WHERE stock_batches.product_id = products.id);
