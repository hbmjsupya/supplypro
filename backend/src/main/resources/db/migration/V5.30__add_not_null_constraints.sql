-- Add NOT NULL constraint to product_id columns

ALTER TABLE sales_order_items MODIFY product_id BIGINT NOT NULL;
ALTER TABLE purchase_order_items MODIFY product_id BIGINT NOT NULL;
ALTER TABLE inbound_order_items MODIFY product_id BIGINT NOT NULL;
ALTER TABLE stock_batches MODIFY product_id BIGINT NOT NULL;
ALTER TABLE stock_flows MODIFY product_id BIGINT NOT NULL;
