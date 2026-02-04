-- Remove is_bundle column from products table
ALTER TABLE products DROP COLUMN is_bundle;

-- Drop product_bundles table if exists
DROP TABLE IF EXISTS product_bundles;
