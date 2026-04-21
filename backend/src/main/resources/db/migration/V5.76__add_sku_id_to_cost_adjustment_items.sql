-- Add sku_id column to cost_adjustment_items table
ALTER TABLE cost_adjustment_items ADD COLUMN IF NOT EXISTS sku_id BIGINT;

-- Add index for sku_id
CREATE INDEX IF NOT EXISTS idx_cost_adjustment_items_sku_id ON cost_adjustment_items(sku_id);

-- Update existing cost_adjustment_items to set sku_id based on specification matching
UPDATE cost_adjustment_items cai
JOIN products p ON cai.product_id = p.id
LEFT JOIN skus s ON s.product_id = p.id AND s.specification = cai.spec_name
SET cai.sku_id = s.id
WHERE cai.sku_id IS NULL AND s.id IS NOT NULL;

-- Fix stock_flows balance_after for COST_ADJUSTMENT records where sku is null
-- First, update the sku_id in stock_flows for cost adjustment records
UPDATE stock_flows sf
JOIN cost_adjustment_items cai ON sf.reference_no IN (
    SELECT sheet_no FROM cost_adjustment_sheets WHERE id = cai.sheet_id
)
JOIN products p ON sf.product_id = p.id
LEFT JOIN skus s ON s.product_id = p.id AND s.specification = cai.spec_name
SET sf.sku_id = s.id
WHERE sf.flow_type = 'COST_ADJUSTMENT' AND sf.sku_id IS NULL AND s.id IS NOT NULL;

-- Update balance_after for cost adjustment records based on warehouse + sku
UPDATE stock_flows sf
SET balance_after = (
    SELECT COALESCE(SUM(sb.quantity), 0)
    FROM stock_batches sb
    WHERE sb.warehouse_id = sf.warehouse_id AND sb.sku_id = sf.sku_id
)
WHERE sf.flow_type = 'COST_ADJUSTMENT' AND sf.sku_id IS NOT NULL;
