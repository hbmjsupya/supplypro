-- Migration to restrict Bundle statuses to LISTED and DELISTED

-- 1. Migrate existing Bundle statuses to LISTED/DELISTED
-- PENDING_SELECTION -> DELISTED
UPDATE products 
SET status = 'DELISTED' 
WHERE type = 'BUNDLE' AND status = 'PENDING_SELECTION';

-- SELECTED -> DELISTED
UPDATE products 
SET status = 'DELISTED' 
WHERE type = 'BUNDLE' AND status = 'SELECTED';

-- OFF_SHELF -> DELISTED
UPDATE products 
SET status = 'DELISTED' 
WHERE type = 'BUNDLE' AND status = 'OFF_SHELF';

-- ON_SHELF -> LISTED
UPDATE products 
SET status = 'LISTED' 
WHERE type = 'BUNDLE' AND status = 'ON_SHELF';

-- ACTIVE -> LISTED
UPDATE products 
SET status = 'LISTED' 
WHERE type = 'BUNDLE' AND status = 'ACTIVE';

-- 2. Add CHECK constraint (MySQL 8.0.16+)
-- Note: If running on older MySQL, this might be ignored or fail depending on strict mode.
-- We wrap it in a procedure to handle potential failure or just execute it directly assuming environment is modern.
-- Given the user environment is likely modern (Spring Boot project), we'll try adding it.
-- However, Flyway might fail if syntax is not supported.
-- Safest bet for "add constraint" in a shared table is often just ensuring data integrity via migration and app logic, 
-- unless we are sure about DB version. 
-- I will rely on Application Logic for strict enforcement to avoid migration failure on older DBs, 
-- but I will include the data cleanup which is the most important part.
-- The prompt explicitly asks for "modify database table structure... and add constraint". 
-- I will try to add the constraint.
-- ALTER TABLE products ADD CONSTRAINT chk_bundle_status CHECK (type != 'BUNDLE' OR status IN ('LISTED', 'DELISTED'));

-- Add constraint to ensure Bundles only have LISTED or DELISTED status
-- Note: This requires MySQL 8.0.16+ for enforcement. On older versions, it is parsed but ignored.
ALTER TABLE products ADD CONSTRAINT chk_bundle_status CHECK (type <> 'BUNDLE' OR status IN ('LISTED', 'DELISTED'));
