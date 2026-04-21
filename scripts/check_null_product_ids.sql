-- Analysis of Null Product ID Records
-- Usage: Run this script against the database to identify records with missing Product IDs

SELECT 'purchase_order_items' as table_name, count(*) as null_count, GROUP_CONCAT(id) as ids 
FROM purchase_order_items WHERE product_id IS NULL;

SELECT 'inbound_order_items' as table_name, count(*) as null_count, GROUP_CONCAT(id) as ids 
FROM inbound_order_items WHERE product_id IS NULL;

SELECT 'sales_order_items' as table_name, count(*) as null_count, GROUP_CONCAT(id) as ids 
FROM sales_order_items WHERE product_id IS NULL;

SELECT 'stock_batches' as table_name, count(*) as null_count, GROUP_CONCAT(id) as ids 
FROM stock_batches WHERE product_id IS NULL;

SELECT 'stock_flows' as table_name, count(*) as null_count, GROUP_CONCAT(id) as ids 
FROM stock_flows WHERE product_id IS NULL;

-- Check for Orphan SKUs (if applicable)
SELECT 'skus' as table_name, count(*) as null_count, GROUP_CONCAT(id) as ids 
FROM skus WHERE product_id IS NULL;

-- Check for Products with null SKU Code (as secondary ID)
SELECT 'products' as table_name, count(*) as null_count, GROUP_CONCAT(id) as ids 
FROM products WHERE sku_code IS NULL;
