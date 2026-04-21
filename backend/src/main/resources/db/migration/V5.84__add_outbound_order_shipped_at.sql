-- 添加 shipped_at 字段到 outbound_orders 表
ALTER TABLE outbound_orders ADD COLUMN IF NOT EXISTS shipped_at DATETIME COMMENT '发货时填写的时间';
