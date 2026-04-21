-- Migration Script: Add additional indexes for logistics and inbound orders
-- Description: 
-- 1. Adds index on tracking_no in logistics_tracks for reverse lookup.
-- 2. Adds index on warehouse_code in inbound_orders for filtering.

-- Add index on tracking_no in logistics_tracks if not exists
-- (MySQL doesn't support IF NOT EXISTS for INDEX in all versions, so we use standard CREATE INDEX which might fail if exists, but Flyway manages versioning)
CREATE INDEX idx_logistics_tracking_no ON logistics_tracks(tracking_no);

-- Add index on warehouse_code in inbound_orders
CREATE INDEX idx_inbound_warehouse_code ON inbound_orders(warehouse_code);
