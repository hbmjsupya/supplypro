-- Align suppliers
ALTER TABLE suppliers ADD COLUMN email VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN address VARCHAR(255);

-- Align warehouses
ALTER TABLE warehouses ADD COLUMN province VARCHAR(50);
ALTER TABLE warehouses ADD COLUMN city VARCHAR(50);
ALTER TABLE warehouses ADD COLUMN district VARCHAR(50);
ALTER TABLE warehouses ADD COLUMN admins VARCHAR(255);
