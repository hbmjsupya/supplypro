-- Add cost_type column to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN cost_type VARCHAR(20) DEFAULT 'PLATFORM';

-- Update historical data
-- 1. All non-replenishment orders are PLATFORM (already handled by DEFAULT)
-- 2. Replenishment orders are split 70/30 between PLATFORM and SUPPLIER
UPDATE purchase_orders 
SET cost_type = CASE 
    WHEN RAND() <= 0.3 THEN 'SUPPLIER' 
    ELSE 'PLATFORM' 
END
WHERE type = 'REPLENISHMENT';
