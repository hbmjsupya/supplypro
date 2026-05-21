SET NAMES utf8mb4;

INSERT INTO brands (name, trademark_no, first_letter, status) VALUES
('华为', 'TM20240001', 'H', 'ENABLED'),
('小米', 'TM20240002', 'X', 'ENABLED'),
('苹果', 'TM20240003', 'P', 'ENABLED'),
('三星', 'TM20240004', 'S', 'ENABLED'),
('联想', 'TM20240005', 'L', 'ENABLED'),
('戴尔', 'TM20240006', 'D', 'ENABLED'),
('惠普', 'TM20240007', 'H', 'ENABLED'),
('华硕', 'TM20240008', 'H', 'ENABLED');

INSERT INTO suppliers (supplier_no, name, contact_person, contact_phone, email, address, settlement_type, settlement_period, prepayment_balance, prepayment_warning, status) VALUES
('GYS-001', '深圳华为技术有限公司', '张明远', '13800138001', 'zhangmy@huawei.cn', '广东省深圳市龙岗区坂田街道华为基地', 'PERIOD', 30, 0.00, NULL, 'ACTIVE'),
('GYS-002', '北京小米科技有限责任公司', '李建国', '13800138002', 'lijg@xiaomi.com', '北京市海淀区清河中街68号华润五彩城', 'PREPAYMENT', NULL, 100000.00, 20000.00, 'ACTIVE'),
('GYS-003', '苹果贸易(上海)有限公司', '王思聪', '13800138003', 'wangsc@apple.com', '上海市浦东新区世纪大道100号环球金融中心', 'CASH', NULL, 0.00, NULL, 'ACTIVE'),
('GYS-004', '三星电子(中国)投资有限公司', '赵德柱', '13800138004', 'zhaodz@samsung.com', '北京市朝阳区建国路88号SOHO现代城', 'PERIOD', 45, 0.00, NULL, 'ACTIVE'),
('GYS-005', '联想(北京)有限公司', '钱学海', '13800138005', 'qianxh@lenovo.com', '北京市海淀区上地信息产业基地创业路6号', 'PERIOD', 60, 0.00, NULL, 'ACTIVE'),
('GYS-006', '戴尔(中国)有限公司', '孙立成', '13800138006', 'sunlc@dell.com', '上海市浦东新区张江高科技园区碧波路690号', 'PREPAYMENT', NULL, 50000.00, 10000.00, 'ACTIVE'),
('GYS-007', '惠普(中国)有限公司', '周文博', '13800138007', 'zhouwb@hp.com', '北京市朝阳区望京街10号望京SOHO', 'FISHERMAN', NULL, 0.00, NULL, 'ACTIVE'),
('GYS-008', '华硕电脑(上海)有限公司', '吴志强', '13800138008', 'wuzq@asus.com', '上海市闵行区紫星路999号', 'PERIOD', 15, 0.00, NULL, 'ACTIVE');

INSERT INTO brand_supplier (brand_id, supplier_id) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5),
(6, 6),
(7, 7),
(8, 8);
