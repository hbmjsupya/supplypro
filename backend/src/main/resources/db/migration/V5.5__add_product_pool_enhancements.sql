-- Add first_letter to brands
ALTER TABLE brands ADD COLUMN first_letter CHAR(1);

-- Create product_brands table
CREATE TABLE product_brands (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    brand_id BIGINT NOT NULL,
    binding_time DATETIME NOT NULL,
    create_time DATETIME,
    CONSTRAINT uk_product_brand UNIQUE (product_id, brand_id)
);

-- Add tax classification fields
ALTER TABLE tax_classifications MODIFY COLUMN parent_code VARCHAR(255);
ALTER TABLE tax_classifications ADD COLUMN version VARCHAR(50);
ALTER TABLE tax_classifications ADD COLUMN is_latest BOOLEAN DEFAULT TRUE;

CREATE INDEX idx_tax_parent_code ON tax_classifications(parent_code);
CREATE INDEX idx_tax_is_latest ON tax_classifications(is_latest);
