ALTER TABLE outbound_orders ADD COLUMN outbound_items TEXT COMMENT '出库明细(JSON格式,包含batchId,productId,skuId,quantity,unitCost)';
ALTER TABLE outbound_orders ADD COLUMN logistics_company VARCHAR(100) COMMENT '物流公司';
ALTER TABLE outbound_orders ADD COLUMN tracking_no VARCHAR(100) COMMENT '物流单号';
ALTER TABLE outbound_orders ADD COLUMN delivery_method VARCHAR(50) COMMENT '配送方式';
ALTER TABLE outbound_orders ADD COLUMN logistics_provider_id BIGINT COMMENT '物流供应商ID';
ALTER TABLE outbound_orders MODIFY COLUMN sales_order_id BIGINT NULL COMMENT '销售订单ID(分仓发货时为空)';
ALTER TABLE outbound_orders MODIFY COLUMN warehouse_id BIGINT NULL COMMENT '仓库ID(分仓发货时通过明细指定)';
