-- Add delivery_no column to settlement_orders table
ALTER TABLE settlement_orders ADD COLUMN delivery_no VARCHAR(50) UNIQUE COMMENT '配送单号';

-- Create index for delivery_no
CREATE INDEX idx_settlement_orders_delivery_no ON settlement_orders(delivery_no);
