-- Check for Purchase Orders with Type 'INBOUND' or Status 'GENERATED_INBOUND' 
-- that do not have a corresponding Inbound Order record.

SELECT 
    po.id, 
    po.order_no, 
    po.status, 
    po.type, 
    po.created_at 
FROM 
    purchase_orders po 
LEFT JOIN 
    inbound_orders io ON io.purchase_order_id = po.id 
WHERE 
    (po.type = 'INBOUND' OR po.status = 'GENERATED_INBOUND') 
    AND io.id IS NULL;

-- Query to verify data integrity for existing linked records
SELECT 
    po.order_no, 
    po.platform_order_no, 
    io.inbound_no 
FROM 
    purchase_orders po 
JOIN 
    inbound_orders io ON io.purchase_order_id = po.id 
WHERE 
    po.platform_order_no IS NULL 
    OR po.platform_order_no NOT LIKE CONCAT('%', io.inbound_no);
