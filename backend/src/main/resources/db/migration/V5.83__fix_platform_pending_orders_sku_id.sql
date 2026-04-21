-- 修复 platform_pending_orders 表中 sku_id 为 NULL 的记录
-- 通过 product_id 和 spec_name 匹配 skus 表中的记录（使用 name 字段匹配）

UPDATE platform_pending_orders ppo
JOIN skus s ON s.product_id = ppo.product_id AND s.name = ppo.spec_name
SET ppo.sku_id = s.id
WHERE ppo.sku_id IS NULL;

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_platform_pending_orders_sku_id ON platform_pending_orders(sku_id);
