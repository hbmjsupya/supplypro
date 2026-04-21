-- Database Cleanup Script
-- Purpose: Clear Suppliers, Brands, and Products data while maintaining schema integrity.
-- Usage: Execute this script using a MySQL client with sufficient privileges.

SET FOREIGN_KEY_CHECKS = 0;

-- ======================================================================================
-- 1. Supplier Data Cleanup
-- ======================================================================================
-- Clear child tables first
DELETE FROM supplier_files;
DELETE FROM supplier_prepayment_logs;
DELETE FROM supplier_accounts;
DELETE FROM brand_supplier; 

-- Clear related transactional data (Purchase Orders & Settlements)
-- Note: This assumes all POs and Settlements are tied to suppliers and should be cleared 
-- to allow supplier deletion.
DELETE FROM purchase_order_items;
DELETE FROM inbound_order_items; -- Inbound orders depend on POs usually, clearing items first
DELETE FROM inbound_orders;      -- Clear inbound orders
DELETE FROM purchase_orders;
DELETE FROM settlement_orders;

-- Clear main table
DELETE FROM suppliers;

-- Reset Auto Increment
ALTER TABLE suppliers AUTO_INCREMENT = 1;
ALTER TABLE supplier_files AUTO_INCREMENT = 1;
ALTER TABLE supplier_accounts AUTO_INCREMENT = 1;
ALTER TABLE supplier_prepayment_logs AUTO_INCREMENT = 1;
ALTER TABLE settlement_orders AUTO_INCREMENT = 1;
ALTER TABLE purchase_orders AUTO_INCREMENT = 1;
ALTER TABLE inbound_orders AUTO_INCREMENT = 1;


-- ======================================================================================
-- 2. Brand Data Cleanup
-- ======================================================================================
-- Clear brand associations (brand_supplier already cleared)
-- Update Products to remove Brand reference
UPDATE products SET brand_id = NULL, brand_zh_name = NULL, brand_en_name = NULL, brand_logo = NULL;
DELETE FROM product_brands;

-- Clear main table
DELETE FROM brands;

-- Reset Auto Increment
ALTER TABLE brands AUTO_INCREMENT = 1;
ALTER TABLE product_brands AUTO_INCREMENT = 1;


-- ======================================================================================
-- 3. Product Data Cleanup
-- ======================================================================================
-- Clear Product dependencies
DELETE FROM product_bundles;
DELETE FROM product_status_change_logs;
DELETE FROM skus;

-- Clear Inventory
DELETE FROM stock_batches;
DELETE FROM stock_flows;

-- Clear Sales Data (Dependent on Products)
DELETE FROM sales_order_items;
DELETE FROM sales_orders; 
DELETE FROM outbound_orders; -- Depends on Sales Orders

-- Clear main table
DELETE FROM products;

-- Reset Auto Increment
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE product_bundles AUTO_INCREMENT = 1;
ALTER TABLE skus AUTO_INCREMENT = 1;
ALTER TABLE stock_batches AUTO_INCREMENT = 1;
ALTER TABLE stock_flows AUTO_INCREMENT = 1;
ALTER TABLE sales_orders AUTO_INCREMENT = 1;
ALTER TABLE outbound_orders AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Cleanup Completed Successfully' AS Status;
