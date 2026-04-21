-- Restore missing products (SKU001-SKU004) required for stock batches
-- These are missing in the current DB but present in backup and referenced by stock batches
-- Mapping backup fields to current schema: brand -> brand_zh_name, category -> category_name
INSERT INTO `products` (id, sku_code, name, brand_zh_name, category_name, status, created_at, updated_at) VALUES 
(1,'SKU001','高性能CPU处理器','Intel','电子元器件','ACTIVE','2026-01-28 05:19:30','2026-01-28 08:12:11'),
(2,'SKU002','32GB DDR5内存条','Kingston','电子元器件','ACTIVE','2026-01-28 05:19:30','2026-01-28 08:12:11'),
(3,'SKU003','2TB NVMe固态硬盘','Samsung','存储设备','ACTIVE','2026-01-28 05:19:30','2026-01-28 08:12:11'),
(4,'SKU004','精密轴承','SKF','机械配件','ACTIVE','2026-01-28 05:19:30','2026-01-28 08:12:11')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
brand_zh_name = VALUES(brand_zh_name),
category_name = VALUES(category_name),
status = VALUES(status);

-- Restore missing warehouse data from backup (supplypro_backup_20260130_152932.sql)
-- Corrects names and addresses for IDs 1-3, adds missing ID 4
INSERT INTO `warehouses` (id, name, code, region, address, manager, status, created_at, updated_at) VALUES 
(1,'北京总仓','WH-BJ-01','华北','北京市大兴区物流园1号','陈建国','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(2,'上海分仓','WH-SH-01','华东','上海市嘉定区工业路88号','周杰','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(3,'深圳分仓','WH-SZ-01','华南','深圳市宝安区科技园3栋','吴刚','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(4,'成都中转仓','WH-CD-01','西南','成都市双流区空港大道','郑强','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(5,'Warehouse_5','WH-05','South','Address_5','Manager_5','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(6,'Warehouse_6','WH-06','West','Address_6','Manager_6','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(7,'Warehouse_7','WH-07','West','Address_7','Manager_7','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(8,'Warehouse_8','WH-08','West','Address_8','Manager_8','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(9,'Warehouse_9','WH-09','West','Address_9','Manager_9','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(10,'Warehouse_10','WH-10','East','Address_10','Manager_10','ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
code = VALUES(code),
region = VALUES(region),
address = VALUES(address),
manager = VALUES(manager),
status = VALUES(status),
updated_at = NOW();

-- Clean up synthetic stock batches created by V5.20 (if any) to avoid duplicates or incorrect data
-- V5.20 used format 'BATCH_' + sku_code
DELETE FROM `stock_batches` WHERE batch_no LIKE 'BATCH_%' AND batch_no NOT LIKE 'BATCH20%';

-- Restore original stock batches from backup
INSERT IGNORE INTO `stock_batches` (id, batch_no, product_id, warehouse_id, quantity, available_quantity, locked_quantity, unit_cost, total_cost, production_date, expiry_date, status, created_at, updated_at) VALUES 
(1,'BATCH2023100101',1,1,100,100,0,3500.00,350000.00,'2023-10-01',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(2,'BATCH2023100201',2,1,200,200,0,800.00,160000.00,'2023-10-02',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(3,'BATCH2023100301',3,2,50,50,0,1200.00,60000.00,'2023-10-03',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30'),
(4,'BATCH2023100401',4,3,1000,1000,0,25.00,25000.00,'2023-10-04',NULL,'ACTIVE','2026-01-28 05:19:30','2026-01-28 05:19:30');
