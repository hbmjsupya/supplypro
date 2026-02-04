-- V5.4__optimize_product_module.sql

-- 1. Create skus table
CREATE TABLE skus (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sku_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    cost_price DECIMAL(19, 2),
    supplier_id BIGINT,
    product_id BIGINT NOT NULL,
    CONSTRAINT fk_skus_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_skus_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX idx_skus_product_id ON skus(product_id);

-- 2. Modify products table
-- Drop FK for default_supplier_id safely (assuming naming convention or using procedure if possible, but for now simple attempt)
-- Note: You might need to adjust the FK name based on your actual database constraint name.
-- Common names: FK_products_default_supplier, products_ibfk_1
-- We will try to drop the column directly. If it fails, manual intervention is needed.
-- But to be safer, let's try to drop common constraint names.
SET @fk_name := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'default_supplier_id' AND TABLE_SCHEMA = DATABASE() LIMIT 1);
SET @sql := IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE products DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE products DROP COLUMN default_supplier_id;

-- Drop other columns
ALTER TABLE products DROP COLUMN category;
ALTER TABLE products DROP COLUMN brand;
ALTER TABLE products DROP COLUMN spec;

-- Add new columns
ALTER TABLE products ADD COLUMN brand_id BIGINT;
ALTER TABLE products ADD COLUMN brand_zh_name VARCHAR(255);
ALTER TABLE products ADD COLUMN brand_en_name VARCHAR(255);
ALTER TABLE products ADD COLUMN brand_logo VARCHAR(500);

ALTER TABLE products ADD COLUMN category_code VARCHAR(50);
ALTER TABLE products ADD COLUMN category_name VARCHAR(255);
ALTER TABLE products ADD COLUMN category_version VARCHAR(50);

ALTER TABLE products ADD COLUMN tax_effective_date DATETIME;
