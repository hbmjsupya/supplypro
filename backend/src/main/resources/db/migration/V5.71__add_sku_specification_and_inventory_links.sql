-- Add specification field to skus table
ALTER TABLE skus ADD COLUMN specification VARCHAR(255) DEFAULT 'Standard';

-- Add sku_id to stock_batches table
ALTER TABLE stock_batches ADD COLUMN sku_id BIGINT;
ALTER TABLE stock_batches ADD CONSTRAINT fk_stock_batches_sku FOREIGN KEY (sku_id) REFERENCES skus(id);

-- Add sku_id to stock_flows table
ALTER TABLE stock_flows ADD COLUMN sku_id BIGINT;
ALTER TABLE stock_flows ADD CONSTRAINT fk_stock_flows_sku FOREIGN KEY (sku_id) REFERENCES skus(id);

-- Add sku_id to inbound_order_items table if missing (for completeness)
-- Wait, inbound_order_items already has sku (string) but let's see. 
-- Actually, let's keep it simple and just do what we need.

-- Provide fallback for historical stock batches (Link to the first sku of the product)
UPDATE stock_batches sb
SET sku_id = (SELECT s.id FROM skus s WHERE s.product_id = sb.product_id LIMIT 1)
WHERE sb.sku_id IS NULL;

-- Provide fallback for historical stock flows
UPDATE stock_flows sf
SET sku_id = (SELECT s.id FROM skus s WHERE s.product_id = sf.product_id LIMIT 1)
WHERE sf.sku_id IS NULL;