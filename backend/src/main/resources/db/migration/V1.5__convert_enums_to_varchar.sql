-- Convert ENUM columns to VARCHAR for JPA compatibility

-- customers
ALTER TABLE customers MODIFY COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';

-- suppliers
ALTER TABLE suppliers MODIFY COLUMN settlement_type VARCHAR(20);
ALTER TABLE suppliers MODIFY COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';

-- warehouses
ALTER TABLE warehouses MODIFY COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';

-- products
ALTER TABLE products MODIFY COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';

-- purchase_orders
ALTER TABLE purchase_orders MODIFY COLUMN type VARCHAR(20);
ALTER TABLE purchase_orders MODIFY COLUMN status VARCHAR(20) DEFAULT 'PENDING';

-- inbound_orders
ALTER TABLE inbound_orders MODIFY COLUMN status VARCHAR(20) DEFAULT 'PENDING';

-- stock_batches
ALTER TABLE stock_batches MODIFY COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';

-- settlements
ALTER TABLE settlements MODIFY COLUMN type VARCHAR(20);
ALTER TABLE settlements MODIFY COLUMN status VARCHAR(20) DEFAULT 'PENDING';

-- sales_orders
ALTER TABLE sales_orders MODIFY COLUMN status VARCHAR(20) DEFAULT 'PENDING';
