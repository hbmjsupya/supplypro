-- Create categories table
CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL UNIQUE,
    category_name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(50),
    level INT NOT NULL,
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_status ON categories(status);

-- Add audit fields to products
ALTER TABLE products ADD COLUMN created_by VARCHAR(50);
ALTER TABLE products ADD COLUMN updated_by VARCHAR(50);

-- Add audit fields to brands
ALTER TABLE brands ADD COLUMN created_by VARCHAR(50);
ALTER TABLE brands ADD COLUMN updated_by VARCHAR(50);

-- Add audit fields to tax_classifications
ALTER TABLE tax_classifications ADD COLUMN created_by VARCHAR(50);
ALTER TABLE tax_classifications ADD COLUMN updated_by VARCHAR(50);
