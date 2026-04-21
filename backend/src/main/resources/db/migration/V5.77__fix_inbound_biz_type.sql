-- Fix biz_type for inbound purchase orders
-- Inbound purchase orders should have biz_type = 'INBOUND' instead of NULL

-- Update purchase_orders table
UPDATE purchase_orders 
SET biz_type = 'INBOUND' 
WHERE type = 'INBOUND' AND biz_type IS NULL;

-- Verify the update
SELECT COUNT(*) as updated_count FROM purchase_orders WHERE type = 'INBOUND' AND biz_type = 'INBOUND';
