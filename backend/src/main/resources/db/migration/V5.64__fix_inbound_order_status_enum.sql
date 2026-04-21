-- Fix legacy inbound order statuses
-- Map SHIPPED and COMPLETED to RECEIVED

UPDATE inbound_orders SET status = 'RECEIVED' WHERE status IN ('SHIPPED', 'COMPLETED');
