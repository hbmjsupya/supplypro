-- Make settlement_no nullable to support Pending Delivery Settlements
ALTER TABLE settlement_orders MODIFY COLUMN settlement_no VARCHAR(50) NULL COMMENT '结算单号';
