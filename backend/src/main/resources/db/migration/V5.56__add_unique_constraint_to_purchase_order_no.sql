-- 1. Clean up duplicate purchase orders, keeping the one with the largest ID (latest created)
DELETE p1 
FROM purchase_orders p1
INNER JOIN purchase_orders p2 
ON p1.order_no = p2.order_no 
AND p1.id < p2.id;

-- 2. Add Unique Constraint
-- Note: V1.0 already defined it, but it might have been dropped or not enforced in some environments.
-- We use a stored procedure or conditional execution to avoid errors if it already exists, 
-- but standard MySQL doesn't support "ADD CONSTRAINT IF NOT EXISTS" nicely.
-- Given Flyway manages versions, we will try to add it. If it fails due to existence, migration fails (which is fine, means it's already there).
-- But if we want to be idempotent:

SET @constraint_count = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchase_orders' 
    AND CONSTRAINT_NAME = 'uk_purchase_order_no'
);

SET @sql = IF(@constraint_count = 0, 
    'ALTER TABLE purchase_orders ADD CONSTRAINT uk_purchase_order_no UNIQUE (order_no)', 
    'SELECT "Constraint uk_purchase_order_no already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Also ensure the index exists (UNIQUE constraint usually creates an index, but explicit index helps)
-- V1.0 created idx_order_no. If we add UNIQUE constraint, we might not need idx_order_no if it's redundant.
-- But let's leave existing indexes alone to avoid side effects.
