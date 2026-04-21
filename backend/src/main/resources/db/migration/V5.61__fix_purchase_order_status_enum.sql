-- Fix purchase_orders status ENUM to match Java enum
-- The Java enum has: PENDING, CONFIRMED, SHIPPED, RECEIVED, CANCELLED, PENDING_SETTLEMENT
-- The database ENUM has: PENDING, CONFIRMED, SHIPPED, RECEIVED, COMPLETED, CANCELLED
-- We need to replace COMPLETED with PENDING_SETTLEMENT

-- First, update any existing COMPLETED records to RECEIVED (since COMPLETED is no longer used)
UPDATE purchase_orders SET status = 'RECEIVED' WHERE status = 'COMPLETED';

-- Then alter the ENUM column
-- MySQL requires re-specifying the entire ENUM when modifying
ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'RECEIVED', 'CANCELLED', 'PENDING_SETTLEMENT') DEFAULT 'PENDING' COMMENT '订单状态';
