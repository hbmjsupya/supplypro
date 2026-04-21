-- ======================================================================================
-- DANGER: FULL SYSTEM DATA CLEANUP SCRIPT
-- This script PERMANENTLY DELETES ALL PRODUCT-RELATED DATA.
-- It is intended for system reset or development cleanup.
--
-- EXECUTION ORDER IS CRITICAL DUE TO FOREIGN KEY CONSTRAINTS.
--
-- Usage: Execute this script in your MySQL client (e.g., Workbench, CLI).
-- Ensure you have a BACKUP before running this.
-- ======================================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Logistics and Order Fulfillment (Depend on Sales/Purchase Orders)
DELETE FROM outbound_orders;
DELETE FROM inbound_order_items;
DELETE FROM inbound_orders;

-- 2. Sales and Purchase Orders (Cascade to Items if configured, but explicit delete is safer)
DELETE FROM sales_order_items;
DELETE FROM sales_orders;

DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;

-- 3. Inventory and Stock Data
DELETE FROM stock_flows;
DELETE FROM stock_batches;

-- 4. Product Associations
DELETE FROM product_bundles;
DELETE FROM product_brands;

-- 5. Product Metadata and Logs
DELETE FROM product_status_change_logs;
DELETE FROM product_tax_change_logs;
DELETE FROM skus;

-- 6. Main Product Table
DELETE FROM products;

SET FOREIGN_KEY_CHECKS = 1;

-- Verification
SELECT COUNT(*) as products_remaining FROM products;
SELECT COUNT(*) as orders_remaining FROM sales_orders;
