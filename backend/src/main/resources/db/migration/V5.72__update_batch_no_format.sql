-- This script updates the batch_no in stock_batches and stock_flows to follow the new rule:
-- YYYYMMDD + 3-digit sequence + Supplier Name

-- 1. Create a temporary table to store the new batch numbers to avoid locking issues and ensure sequence
CREATE TEMPORARY TABLE temp_batch_updates (
    id BIGINT,
    old_batch_no VARCHAR(255),
    product_id BIGINT,
    created_at DATETIME,
    new_batch_no VARCHAR(255)
);

-- 2. Insert distinct batch_no from stock_batches
INSERT INTO temp_batch_updates (id, old_batch_no, product_id, created_at)
SELECT id, batch_no, product_id, created_at
FROM stock_batches;

-- 3. Update the temporary table with the new batch_no format
-- Note: MySQL 8.0+ supports window functions like ROW_NUMBER()
UPDATE temp_batch_updates t
JOIN (
    SELECT 
        id,
        DATE_FORMAT(created_at, '%Y%m%d') as date_str,
        LPAD(ROW_NUMBER() OVER(PARTITION BY DATE_FORMAT(created_at, '%Y%m%d') ORDER BY created_at, id), 3, '0') as seq,
        COALESCE(
            (SELECT s.name FROM products p LEFT JOIN suppliers s ON p.default_supplier_id = s.id WHERE p.id = t2.product_id),
            '未知供应商'
        ) as supplier_name
    FROM temp_batch_updates t2
) data ON t.id = data.id
SET t.new_batch_no = CONCAT(data.date_str, data.seq, data.supplier_name);

-- 4. Update the stock_batches table
UPDATE stock_batches sb
JOIN temp_batch_updates tbu ON sb.id = tbu.id
SET sb.batch_no = tbu.new_batch_no;

-- 5. Update the stock_flows table where batch_no matches the old one
UPDATE stock_flows sf
JOIN temp_batch_updates tbu ON sf.batch_no = tbu.old_batch_no
SET sf.batch_no = tbu.new_batch_no;

-- 6. Drop the temporary table
DROP TEMPORARY TABLE temp_batch_updates;
