-- Align outbound_orders
ALTER TABLE outbound_orders CHANGE COLUMN order_no outbound_no VARCHAR(50) NOT NULL;
ALTER TABLE outbound_orders ADD COLUMN sales_order_id BIGINT;
ALTER TABLE outbound_orders ADD COLUMN outbound_date DATETIME;
ALTER TABLE outbound_orders ADD COLUMN confirmed_by VARCHAR(50);
ALTER TABLE outbound_orders ADD COLUMN logistics_fee DECIMAL(15,2);
ALTER TABLE outbound_orders ADD COLUMN settlement_status VARCHAR(20) DEFAULT 'UNSETTLED';
ALTER TABLE outbound_orders ADD CONSTRAINT fk_outbound_sales_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id);

-- Align settlement_orders
ALTER TABLE settlement_orders ADD COLUMN payment_date DATETIME;
ALTER TABLE settlement_orders ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE settlement_orders ADD COLUMN remark TEXT;

-- Align sales_orders
ALTER TABLE sales_orders ADD COLUMN delivery_date DATE;
ALTER TABLE sales_orders ADD COLUMN remark TEXT;

-- Align products
ALTER TABLE products ADD COLUMN tax_class VARCHAR(50);
ALTER TABLE products ADD COLUMN tax_rate DECIMAL(5,2);
ALTER TABLE products ADD COLUMN tax_code VARCHAR(50);
ALTER TABLE products ADD COLUMN logistics_template VARCHAR(255);
ALTER TABLE products ADD COLUMN promo_file VARCHAR(255);

-- Align purchase_orders
ALTER TABLE purchase_orders ADD COLUMN biz_type VARCHAR(50);
ALTER TABLE purchase_orders ADD COLUMN biz_no VARCHAR(50);
ALTER TABLE purchase_orders ADD COLUMN settlement_status VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN adjust_status VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN refund_status VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN project VARCHAR(50);
ALTER TABLE purchase_orders ADD COLUMN third_party_platform VARCHAR(50);
ALTER TABLE purchase_orders ADD COLUMN third_party_no VARCHAR(50);
ALTER TABLE purchase_orders ADD COLUMN platform_order_no VARCHAR(50);
ALTER TABLE purchase_orders ADD COLUMN freight DECIMAL(15,2);
