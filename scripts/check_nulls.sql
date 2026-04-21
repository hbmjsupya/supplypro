SELECT 'sales_order_items' as table_name, count(*) as null_count FROM sales_order_items WHERE product_id IS NULL;
SELECT 'purchase_order_items' as table_name, count(*) as null_count FROM purchase_order_items WHERE product_id IS NULL;
SELECT 'inbound_order_items' as table_name, count(*) as null_count FROM inbound_order_items WHERE product_id IS NULL;
SELECT 'stock_batches' as table_name, count(*) as null_count FROM stock_batches WHERE product_id IS NULL;
SELECT 'stock_flows' as table_name, count(*) as null_count FROM stock_flows WHERE product_id IS NULL;
