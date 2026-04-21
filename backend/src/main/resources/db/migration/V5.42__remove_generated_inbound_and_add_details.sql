-- Migration Script: Remove GENERATED_INBOUND status and add Inbound Order details
-- Description: 
-- 1. Updates purchase_orders status from 'GENERATED_INBOUND' to 'CONFIRMED'.
-- 2. Adds address, contact, and logistics columns to inbound_orders table.

-- Update obsolete status
UPDATE purchase_orders SET status = 'PENDING' WHERE status = 'GENERATED_INBOUND';

-- Add Address Info
ALTER TABLE inbound_orders ADD COLUMN province VARCHAR(50);
ALTER TABLE inbound_orders ADD COLUMN city VARCHAR(50);
ALTER TABLE inbound_orders ADD COLUMN district VARCHAR(50);
ALTER TABLE inbound_orders ADD COLUMN detail_address VARCHAR(255);
ALTER TABLE inbound_orders ADD COLUMN warehouse_code VARCHAR(50);

-- Add Contact Info (contact_name, contact_phone already exist, adding email)
ALTER TABLE inbound_orders ADD COLUMN contact_email VARCHAR(100);

-- Add Logistics Info
ALTER TABLE inbound_orders ADD COLUMN logistics_company VARCHAR(100);
ALTER TABLE inbound_orders ADD COLUMN tracking_no VARCHAR(100);
ALTER TABLE inbound_orders ADD COLUMN shipped_at DATETIME;
ALTER TABLE inbound_orders ADD COLUMN expected_arrival DATETIME;
ALTER TABLE inbound_orders ADD COLUMN actual_arrival DATETIME;

-- Create Logistics Module Tables if not exist (using existing logistics_tracks or creating new if needed)
-- Assuming logistics_tracks is sufficient for trajectory, but ensuring indexes
CREATE INDEX idx_inbound_tracking_no ON inbound_orders(tracking_no);
