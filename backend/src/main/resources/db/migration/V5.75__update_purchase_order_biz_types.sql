-- V5.75: Update historical purchase_orders biz_type and type to new enum values

-- Update legacy "商品入库" or "入库单" to "INBOUND"
UPDATE purchase_orders 
SET biz_type = 'INBOUND', type = 'INBOUND'
WHERE biz_type IN ('商品入库', '入库单');

-- Update legacy "平台单" or "PURCHASE" to "PLATFORM" and set type to "STANDARD" (订单采购)
UPDATE purchase_orders 
SET biz_type = 'PLATFORM', type = 'STANDARD'
WHERE biz_type IN ('平台单', 'PURCHASE');

-- Update legacy "补货单" to "REPLENISHMENT" and set type to "REPLENISHMENT" (补货采购)
UPDATE purchase_orders 
SET biz_type = 'REPLENISHMENT', type = 'REPLENISHMENT'
WHERE biz_type = '补货单';

-- Note: The following query can be run manually by DBAs to get a validation report 
-- of any purchase orders that failed to match the new rules (e.g. biz_type is still invalid)
-- SELECT id, order_no, biz_type, type, biz_no 
-- FROM purchase_orders 
-- WHERE biz_type NOT IN ('INBOUND', 'PLATFORM', 'REPLENISHMENT');
