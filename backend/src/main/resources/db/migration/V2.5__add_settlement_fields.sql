-- ALTER TABLE purchase_orders ADD COLUMN settlement_status VARCHAR(20) DEFAULT 'UNSETTLED';
ALTER TABLE purchase_orders ADD COLUMN settlement_id BIGINT;
ALTER TABLE settlement_orders ADD COLUMN supplier_id BIGINT;
ALTER TABLE settlement_orders ADD COLUMN total_amount DECIMAL(15,2);
ALTER TABLE settlement_orders ADD COLUMN created_by VARCHAR(50);
ALTER TABLE settlement_orders ADD COLUMN payment_proof VARCHAR(255);
