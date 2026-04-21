-- Add logistics status fields to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS logistics_state VARCHAR(10) COMMENT '物流状态：0-无轨迹 1-已揽收 2-在途中 3-签收 4-问题件',
ADD COLUMN IF NOT EXISTS logistics_state_ex VARCHAR(50) COMMENT '物流详细状态',
ADD COLUMN IF NOT EXISTS logistics_traces TEXT COMMENT '物流轨迹信息(JSON)',
ADD COLUMN IF NOT EXISTS logistics_synced_at DATETIME COMMENT '最后同步物流状态时间';

-- Add index for logistics sync queries
CREATE INDEX IF NOT EXISTS idx_logistics_sync ON purchase_orders(status, delivery_method, shipping_status);
