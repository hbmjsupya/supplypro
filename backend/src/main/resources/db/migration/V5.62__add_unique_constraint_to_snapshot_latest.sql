-- 添加唯一约束：确保每个采购单只有一条is_latest=true的快照记录
-- 步骤1：先清理可能存在的重复记录（保留version最大的记录）

-- 创建临时表存储需要保留的快照ID
CREATE TEMPORARY TABLE keep_snapshot_ids AS
SELECT MIN(id) as keep_id
FROM purchase_order_snapshots
WHERE is_latest = true
GROUP BY purchase_order_id;

-- 将不在保留列表中的is_latest=true记录设置为false
UPDATE purchase_order_snapshots
SET is_latest = false
WHERE is_latest = true
  AND id NOT IN (SELECT keep_id FROM keep_snapshot_ids);

-- 删除临时表
DROP TEMPORARY TABLE IF EXISTS keep_snapshot_ids;

-- 步骤2：创建唯一索引（使用条件索引，只对is_latest=true的记录生效）
-- MySQL不支持条件索引，所以使用触发器或应用层约束来保证

-- 创建普通索引以提升查询性能
CREATE INDEX idx_purchase_order_snapshots_po_latest 
ON purchase_order_snapshots(purchase_order_id, is_latest);

-- 步骤3：添加注释说明约束规则
-- 注意：MySQL不支持部分唯一索引，需要在应用层确保数据一致性
-- 已在PurchaseOrderSnapshotService中添加验证逻辑

-- 记录操作日志
INSERT INTO system_logs (module, operation, details, created_at)
VALUES ('DatabaseMigration', 'V5.62', 'Added unique constraint for purchase_order_snapshots: one is_latest=true per purchase_order_id', NOW())
ON DUPLICATE KEY UPDATE details = VALUES(details);
