-- Add expected_arrival and remark fields to outbound_orders table
ALTER TABLE outbound_orders 
ADD COLUMN expected_arrival DATETIME NULL COMMENT '期望到货时间',
ADD COLUMN remark TEXT NULL COMMENT '订单备注';
