-- Restore deleted warehouses with explicit IDs to preserve associations
-- Assuming IDs 1-3 were from V1.1 and 5-10 from V1.3

-- From V1.1__init_data.sql
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status)
VALUES 
(1, '北京顺义仓', 'WH_BJ_01', '华北/北京/顺义', '顺义区南法信镇', '赵六', 'ACTIVE'),
(2, '上海青浦仓', 'WH_SH_01', '华东/上海/青浦', '青浦区徐泾镇', '孙七', 'ACTIVE'),
(3, '广州白云仓', 'WH_GZ_01', '华南/广东/广州', '白云区太和镇', '周八', 'ACTIVE');

-- From V1.3__comprehensive_mock_data.sql
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status) VALUES (5, 'Warehouse_5', 'WH-05', 'South', 'Address_5', 'Manager_5', 'ACTIVE');
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status) VALUES (6, 'Warehouse_6', 'WH-06', 'West', 'Address_6', 'Manager_6', 'ACTIVE');
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status) VALUES (7, 'Warehouse_7', 'WH-07', 'West', 'Address_7', 'Manager_7', 'ACTIVE');
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status) VALUES (8, 'Warehouse_8', 'WH-08', 'West', 'Address_8', 'Manager_8', 'ACTIVE');
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status) VALUES (9, 'Warehouse_9', 'WH-09', 'West', 'Address_9', 'Manager_9', 'ACTIVE');
INSERT IGNORE INTO warehouses (id, name, code, region, address, manager, status) VALUES (10, 'Warehouse_10', 'WH-10', 'East', 'Address_10', 'Manager_10', 'ACTIVE');
