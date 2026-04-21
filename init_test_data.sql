-- Basic Warehouses
INSERT INTO warehouses (name, code, status, address, manager, created_at, updated_at) VALUES 
('北京一号仓', 'WH-BJ-01', 'ACTIVE', '北京市朝阳区', '张三', NOW(), NOW()),
('上海二号仓', 'WH-SH-01', 'ACTIVE', '上海市浦东新区', '李四', NOW(), NOW()),
('深圳三号仓', 'WH-SZ-01', 'ACTIVE', '深圳市南山区', '王五', NOW(), NOW());

-- Basic Brands
INSERT INTO brands (name, first_letter, status, created_at, updated_at) VALUES 
('Apple', 'A', 'ENABLED', NOW(), NOW()),
('Xiaomi', 'X', 'ENABLED', NOW(), NOW()),
('Huawei', 'H', 'ENABLED', NOW(), NOW());

-- Basic Categories (Product Categories)
-- Skipping for now as it might be complex, or use simple INSERT if table exists
-- INSERT INTO product_categories (name, code, parent_id, status, created_at, updated_at) VALUES 
-- ('电子产品', 'ELEC', NULL, 'ENABLED', NOW(), NOW());

-- Basic Suppliers
INSERT INTO suppliers (name, supplier_no, contact_person, contact_phone, status, settlement_type, created_at, updated_at) VALUES 
('京东自营', 'SUP-JD', '刘强东', '13900139000', 'ACTIVE', 'PERIOD', NOW(), NOW()),
('天猫超市', 'SUP-TMALL', '马云', '13800138000', 'ACTIVE', 'CASH', NOW(), NOW());

-- Basic Logistics Providers
INSERT INTO logistics_providers (name, contact_person, contact_phone, status, created_at, updated_at) VALUES 
('顺丰速运', '王卫', '95338', 'ACTIVE', NOW(), NOW()),
('京东物流', '刘强东', '950616', 'ACTIVE', NOW(), NOW());

-- Basic Products
INSERT INTO products (name, sku_code, brand_id, status, cost_price, created_at, updated_at) VALUES 
('iPhone 15 Pro', 'P001', (SELECT id FROM brands WHERE name='Apple'), 'ACTIVE', 7999.00, NOW(), NOW()),
('Xiaomi 14', 'P002', (SELECT id FROM brands WHERE name='Xiaomi'), 'ACTIVE', 3999.00, NOW(), NOW());
