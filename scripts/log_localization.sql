-- 1. Translate Status Changes (e.g., "Status changed from PENDING to CONFIRMED")
-- Note: We use a generic approach for status changes where possible, or specific replacements for known patterns.

-- PENDING -> 待处理
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'PENDING', '待处理') 
WHERE remark LIKE '%PENDING%';

-- CONFIRMED -> 待发货
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'CONFIRMED', '待发货') 
WHERE remark LIKE '%CONFIRMED%';

-- SHIPPED -> 已发货
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'SHIPPED', '已发货') 
WHERE remark LIKE '%SHIPPED%';

-- RECEIVED -> 已收货
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'RECEIVED', '已收货') 
WHERE remark LIKE '%RECEIVED%';

-- COMPLETED -> 已完成
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'COMPLETED', '已完成') 
WHERE remark LIKE '%COMPLETED%';

-- CANCELLED -> 已取消
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'CANCELLED', '已取消') 
WHERE remark LIKE '%CANCELLED%';

-- PENDING_SETTLEMENT -> 待结算
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'PENDING_SETTLEMENT', '待结算') 
WHERE remark LIKE '%PENDING_SETTLEMENT%';

-- SETTLED -> 已结算
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'SETTLED', '已结算') 
WHERE remark LIKE '%SETTLED%';

-- 2. Translate Common Sentences

-- "Inbound Purchase Order initialized with PENDING status" -> "初始化入库单，状态：待处理"
UPDATE purchase_order_logs 
SET remark = '初始化入库单，状态：待处理' 
WHERE remark LIKE 'Inbound Purchase Order initialized with%';

-- "Status changed from..." -> "状态变更：从...变为..."
UPDATE purchase_order_logs 
SET remark = REPLACE(REPLACE(REPLACE(remark, 'Status changed from', '状态变更：从'), ' to ', ' 变为 '), 'Status:', '状态：')
WHERE remark LIKE 'Status changed from%';

-- "Order Shipped" -> "订单已发货"
UPDATE purchase_order_logs 
SET remark = '订单已发货' 
WHERE remark = 'Order Shipped';

-- "Order Created" -> "订单已创建"
UPDATE purchase_order_logs 
SET remark = '订单已创建' 
WHERE remark = 'Order Created';

-- "Order Updated" -> "订单已更新"
UPDATE purchase_order_logs 
SET remark = '订单已更新' 
WHERE remark = 'Order Updated';

-- "Order Submitted" -> "订单已提交"
UPDATE purchase_order_logs 
SET remark = '订单已提交' 
WHERE remark = 'Order Submitted';

-- "Order Cancelled" -> "订单已取消"
UPDATE purchase_order_logs 
SET remark = '订单已取消' 
WHERE remark = 'Order Cancelled';

-- "Auto-received based on KuaidiNiao status: Signed" -> "根据快递鸟物流状态自动收货：已签收"
UPDATE purchase_order_logs 
SET remark = '根据快递鸟物流状态自动收货：已签收' 
WHERE remark LIKE 'Auto-received based on KuaidiNiao status%';

-- "Created settlement for fee" -> "创建结算单，金额："
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'Created settlement for fee', '创建结算单，金额：') 
WHERE remark LIKE 'Created settlement for fee%';

-- "Updated settlement ... to fee" -> "更新结算单 ... 金额为"
-- This is trickier with regex but simple replace works for parts
UPDATE purchase_order_logs 
SET remark = REPLACE(REPLACE(remark, 'Updated settlement', '更新结算单'), 'to fee', '金额为') 
WHERE remark LIKE 'Updated settlement%';

-- "Deleted settlement ... as fee became 0" -> "删除结算单 ... 因金额变为0"
UPDATE purchase_order_logs 
SET remark = REPLACE(REPLACE(remark, 'Deleted settlement', '删除结算单'), 'as fee became 0', '因金额变为0') 
WHERE remark LIKE 'Deleted settlement%';

-- "Updated logistics info with ETA: " -> "更新物流信息，预计送达："
UPDATE purchase_order_logs 
SET remark = REPLACE(remark, 'Updated logistics info with ETA:', '更新物流信息，预计送达：') 
WHERE remark LIKE 'Updated logistics info with ETA:%';

-- 3. Translate Operator "System" -> "系统"
UPDATE purchase_order_logs 
SET operator = '系统' 
WHERE operator = 'System';

UPDATE purchase_order_logs 
SET operator = '系统自动' 
WHERE operator = 'SYSTEM_AUTO';
