-- Add remark column to settlement_orders table
ALTER TABLE settlement_orders ADD COLUMN IF NOT EXISTS remark VARCHAR(500) DEFAULT NULL COMMENT '备注';
