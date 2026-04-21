-- Disable foreign key checks to allow truncation
SET FOREIGN_KEY_CHECKS = 0;

-- Clear data as requested
TRUNCATE TABLE brand_supplier;

-- Ensure supplier_accounts exists before truncation (missing in V1.x/V2.x)
CREATE TABLE IF NOT EXISTS supplier_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    name VARCHAR(255),
    bank VARCHAR(255),
    account VARCHAR(50),
    type VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    status BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
TRUNCATE TABLE supplier_accounts;

TRUNCATE TABLE supplier_prepayment_logs;
TRUNCATE TABLE settlement_orders;
TRUNCATE TABLE purchase_orders;

-- Update products to remove supplier reference
UPDATE products SET default_supplier_id = NULL;

-- Truncate suppliers to clear data and reset ID
TRUNCATE TABLE suppliers;

SET FOREIGN_KEY_CHECKS = 1;

-- Add new columns
ALTER TABLE suppliers ADD COLUMN org_code VARCHAR(18);
ALTER TABLE suppliers ADD COLUMN qualification_file VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN contract_file VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN purchaser_id BIGINT;
ALTER TABLE suppliers ADD COLUMN coop_end_time DATETIME;

-- Add constraints
ALTER TABLE suppliers ADD CONSTRAINT uk_supplier_name UNIQUE (name);
ALTER TABLE suppliers ADD CONSTRAINT uk_supplier_contact_phone UNIQUE (contact_phone);

-- Add Foreign Key for purchaser
ALTER TABLE suppliers ADD CONSTRAINT fk_supplier_purchaser FOREIGN KEY (purchaser_id) REFERENCES users(id);
