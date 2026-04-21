ALTER TABLE purchase_orders ADD COLUMN logistics_company VARCHAR(100) DEFAULT NULL COMMENT '物流公司';
ALTER TABLE purchase_orders ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL COMMENT '物流单号';
ALTER TABLE purchase_orders ADD COLUMN shipped_at DATETIME DEFAULT NULL COMMENT '发货时间';
