-- 插入供应商数据
INSERT IGNORE INTO suppliers (supplier_no, name, contact_person, contact_phone, settlement_type, settlement_period, prepayment_balance, status) VALUES
('SUP001', '北京电子元件有限公司', '张伟', '13800138000', 'PERIOD', 30, 0.00, 'ACTIVE'),
('SUP002', '上海精密机械厂', '李强', '13900139000', 'CASH', 0, 0.00, 'ACTIVE'),
('SUP003', '深圳芯片科技有限公司', '王芳', '13700137000', 'PREPAYMENT', 0, 50000.00, 'ACTIVE'),
('SUP004', '广州塑料制品厂', '赵敏', '13600136000', 'PERIOD', 60, 0.00, 'ACTIVE'),
('SUP005', '杭州包装材料有限公司', '刘洋', '13500135000', 'CASH', 0, 0.00, 'ACTIVE');

-- 插入仓库数据
INSERT IGNORE INTO warehouses (name, code, region, address, manager, status) VALUES
('北京总仓', 'WH-BJ-01', '华北', '北京市大兴区物流园1号', '陈建国', 'ACTIVE'),
('上海分仓', 'WH-SH-01', '华东', '上海市嘉定区工业路88号', '周杰', 'ACTIVE'),
('深圳分仓', 'WH-SZ-01', '华南', '深圳市宝安区科技园3栋', '吴刚', 'ACTIVE'),
('成都中转仓', 'WH-CD-01', '西南', '成都市双流区空港大道', '郑强', 'ACTIVE');

-- 插入商品数据
INSERT IGNORE INTO products (sku_code, name, brand, category, spec, cost_price, status, default_supplier_id) VALUES
('SKU001', '高性能CPU处理器', 'Intel', '电子元器件', 'i9-13900K', 3500.00, 'ACTIVE', 1),
('SKU002', '32GB DDR5内存条', 'Kingston', '电子元器件', '32GB 6000MHz', 800.00, 'ACTIVE', 1),
('SKU003', '2TB NVMe固态硬盘', 'Samsung', '存储设备', '980 PRO', 1200.00, 'ACTIVE', 3),
('SKU004', '精密轴承', 'SKF', '机械配件', '6204-2RSH', 25.00, 'ACTIVE', 2),
('SKU005', 'ABS工程塑料颗粒', 'Sinopec', '原材料', '25kg/袋', 300.00, 'ACTIVE', 4),
('SKU006', '瓦楞纸箱', 'Generic', '包装材料', '50x40x30cm', 5.00, 'ACTIVE', 5);

-- 插入库存批次数据
INSERT IGNORE INTO stock_batches (batch_no, product_id, warehouse_id, quantity, available_quantity, locked_quantity, unit_cost, total_cost, production_date, expiry_date, status) VALUES
('BATCH2023100101', 1, 1, 100, 100, 0, 3500.00, 350000.00, '2023-10-01', NULL, 'ACTIVE'),
('BATCH2023100201', 2, 1, 200, 200, 0, 800.00, 160000.00, '2023-10-02', NULL, 'ACTIVE'),
('BATCH2023100301', 3, 2, 50, 50, 0, 1200.00, 60000.00, '2023-10-03', NULL, 'ACTIVE'),
('BATCH2023100401', 4, 3, 1000, 1000, 0, 25.00, 25000.00, '2023-10-04', NULL, 'ACTIVE');

-- 插入采购订单数据
INSERT IGNORE INTO purchase_orders (order_no, supplier_id, warehouse_id, type, status, total_amount, delivery_date, created_by) VALUES
('PO20231101001', 1, 1, 'INBOUND', 'CONFIRMED', 43000.00, '2023-11-10', 'admin'),
('PO20231102002', 3, 2, 'INBOUND', 'PENDING', 24000.00, '2023-11-15', 'admin');

-- 插入采购订单明细
INSERT IGNORE INTO purchase_order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 10, 3500.00, 35000.00),
(1, 2, 10, 800.00, 8000.00),
(2, 3, 20, 1200.00, 24000.00);
