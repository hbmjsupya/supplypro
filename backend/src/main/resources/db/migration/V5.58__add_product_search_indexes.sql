-- Add indexes for product fuzzy search optimization
-- These indexes improve search performance for keyword matching on products

-- Index for product name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products (LOWER(name));

-- Index for product SKU code search
CREATE INDEX IF NOT EXISTS idx_products_sku_code ON products (sku_code);

-- Index for product status filtering
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);

-- Index for product type filtering
CREATE INDEX IF NOT EXISTS idx_products_type ON products (type);

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_products_status_type ON products (status, type);

-- Index for SKU table searches
CREATE INDEX IF NOT EXISTS idx_skus_sku_code ON skus (sku_code);

-- Index for SKU product relationship
CREATE INDEX IF NOT EXISTS idx_skus_product_id ON skus (product_id);
