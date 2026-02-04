-- Insert Mock Suppliers
INSERT INTO `suppliers` (
    `supplier_no`, `name`, `contact_person`, `contact_phone`, `email`, 
    `address`, `settlement_type`, `status`, `created_at`
) VALUES 
('SUP001', 'Office Depot Inc.', 'John Smith', '13800138001', 'john@officedepot.com', 
 '123 Main St, Tech Park', 'PERIOD', 'ACTIVE', NOW()),
('SUP002', 'Global Tech Supplies', 'Alice Johnson', '13900139002', 'alice@globaltech.com', 
 '456 Innovation Ave', 'CASH', 'ACTIVE', NOW()),
('SUP003', 'Paper World Ltd.', 'Bob Brown', '13700137003', 'bob@paperworld.com', 
 '789 Industrial Blvd', 'PREPAYMENT', 'ACTIVE', NOW()),
('SUP004', 'Inactive Supplier Co.', 'Charlie Davis', '13600136004', 'charlie@inactive.com', 
 '321 Old Road', 'PERIOD', 'INACTIVE', NOW());
