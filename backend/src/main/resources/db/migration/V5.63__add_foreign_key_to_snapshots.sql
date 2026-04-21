-- 添加外键约束：确保快照表的purchase_order_id引用主表
-- 步骤1：先清理孤儿快照记录（purchase_order_id不存在于主表的记录）
DELETE FROM purchase_order_snapshots 
WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_snapshots.purchase_order_id);

-- 步骤2：删除可能存在的旧外键约束（如果有）
ALTER TABLE purchase_order_snapshots DROP FOREIGN KEY IF EXISTS fk_snapshot_purchase_order;

-- 步骤3：添加外键约束，使用ON DELETE CASCADE级联删除
-- 当主表记录被删除时，自动删除关联的快照记录
ALTER TABLE purchase_order_snapshots 
ADD CONSTRAINT fk_snapshot_purchase_order 
FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) 
ON DELETE CASCADE;

-- 步骤4：记录迁移日志
INSERT INTO schema_migrations_log (module, version, description, executed_at)
VALUES ('DatabaseMigration', 'V5.63', 'Added foreign key constraint to purchase_order_snapshots with CASCADE delete', NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), executed_at = VALUES(executed_at);
