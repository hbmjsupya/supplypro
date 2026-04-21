-- This script updates the batch_no in stock_batches and stock_flows to reflect the actual supplier from the associated purchase order.

-- 1. Create a temporary table to store the new batch numbers
CREATE TEMPORARY TABLE temp_batch_supplier_updates (
    id BIGINT,
    old_batch_no VARCHAR(255),
    product_id BIGINT,
    created_at DATETIME,
    actual_supplier_name VARCHAR(255),
    new_batch_no VARCHAR(255)
);

-- 2. Insert distinct batch_no from stock_batches and attempt to find the actual supplier from stock_flows -> inbound_orders -> purchase_orders
-- Note: This assumes stock_flows has reference_no linking to inbound_order_no
INSERT INTO temp_batch_supplier_updates (id, old_batch_no, product_id, created_at, actual_supplier_name)
SELECT 
    sb.id, 
    sb.batch_no, 
    sb.product_id, 
    sb.created_at,
    COALESCE(
        (SELECT s.name 
         FROM stock_flows sf 
         JOIN inbound_orders io ON sf.reference_no = io.inbound_no 
         JOIN purchase_orders po ON io.purchase_order_id = po.id 
         JOIN suppliers s ON po.supplier_id = s.id
         WHERE sf.stock_batch_id = sb.id LIMIT 1),
        (SELECT s.name FROM products p LEFT JOIN suppliers s ON p.default_supplier_id = s.id WHERE p.id = sb.product_id),
        '未知供应商'
    ) as actual_supplier_name
FROM stock_batches sb;

-- 3. Update the temporary table with the new batch_no format
CREATE TEMPORARY TABLE temp_batch_supplier_updates_stage2 AS
SELECT 
    id,
    DATE_FORMAT(created_at, '%Y%m%d') as date_str,
    LPAD(ROW_NUMBER() OVER(PARTITION BY DATE_FORMAT(created_at, '%Y%m%d') ORDER BY created_at, id), 3, '0') as seq,
    actual_supplier_name
FROM temp_batch_supplier_updates;

UPDATE temp_batch_supplier_updates t
JOIN temp_batch_supplier_updates_stage2 data ON t.id = data.id
SET t.new_batch_no = CONCAT(data.date_str, data.seq, data.actual_supplier_name);

-- 4. Update the stock_batches table
UPDATE stock_batches sb
JOIN temp_batch_supplier_updates tbu ON sb.id = tbu.id
SET sb.batch_no = tbu.new_batch_no;

-- 5. Update the stock_flows table where batch_no matches the old one
UPDATE stock_flows sf
JOIN temp_batch_supplier_updates tbu ON sf.batch_no = tbu.old_batch_no
SET sf.batch_no = tbu.new_batch_no;

-- 6. Drop the temporary table
DROP TEMPORARY TABLE temp_batch_supplier_updates;
DROP TEMPORARY TABLE temp_batch_supplier_updates_stage2;