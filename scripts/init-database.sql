SET NAMES utf8mb4;

-- =============================================
-- SupplyPro 数据库初始化脚本
-- 用途：新开发环境一键初始化所有基础数据
-- 使用方式：docker exec -i supplypro-mysql mysql -u root -ppassword supplypro < init-database.sql
-- =============================================

-- 1. 物流公司基础数据（如果表为空则插入）
INSERT IGNORE INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order) VALUES
('SF', '顺丰速运', 'SF', '顺丰', '95338', 1, 1, 1),
('YTO', '圆通速递', 'YTO', '圆通', '95554', 1, 1, 2),
('STO', '申通快递', 'STO', '申通', '95543', 1, 1, 3),
('ZTO', '中通快递', 'ZTO', '中通', '95311', 1, 1, 4),
('YD', '韵达快递', 'YD', '韵达', '95546', 1, 1, 5),
('YZPY', '邮政快递包裹', 'YZPY', '邮政', '11183', 1, 1, 6),
('EMS', '邮政EMS', 'EMS', 'EMS', '11183', 1, 1, 7),
('JD', '京东快递', 'JD', '京东', '950616', 1, 1, 8),
('DBL', '德邦快递', 'DBL', '德邦', '95353', 1, 1, 9),
('HTKY', '百世快递', 'HTKY', '百世', '95320', 1, 1, 10),
('JTEXPRESS', '极兔速递', 'JTEXPRESS', '极兔', '400-820-1666', 1, 1, 11),
('UC', '优速快递', 'UC', '优速', '400-1111-119', 1, 1, 12),
('HHTT', '天天快递', 'HHTT', '天天', '400-188-8888', 1, 1, 13),
('ZJS', '宅急送', 'ZJS', '宅急送', '400-6789-000', 1, 1, 14),
('ANE', '安能物流', 'ANE', '安能', '400-102-9656', 1, 1, 15),
('DHL', 'DHL国际快递', 'DHL', 'DHL', '400-810-8000', 0, 1, 50),
('FEDEX', 'FedEx联邦快递', 'FEDEX', '联邦', '400-889-1888', 0, 1, 51),
('UPS', 'UPS联合包裹', 'UPS', 'UPS', '400-820-8388', 0, 1, 52),
('TNT', 'TNT快递', 'TNT', 'TNT', '400-820-9868', 0, 1, 53);

-- 2. 物流供应商基础数据（如果表为空则插入）
INSERT IGNORE INTO logistics_providers (id, name, contact_person, contact_phone, settlement_type, status) VALUES
(1, '物流供应商（月结）', '张经理', '13800000001', 'MONTHLY', 'ACTIVE'),
(2, '物流供应商（现付）', '李经理', '13800000002', 'CASH', 'ACTIVE'),
(3, '物流供应商（现付日结）', '王经理', '13800000003', 'DAILY', 'ACTIVE'),
(4, '物流供应商（到付）', '赵经理', '13800000004', 'COLLECT', 'ACTIVE');

-- 3. 仓库基础数据
INSERT IGNORE INTO warehouses (id, name, code, address, status) VALUES
(1, '主仓库', 'WH001', '广东省深圳市南山区科技园', 'ACTIVE'),
(2, '备用仓库', 'WH002', '广东省深圳市宝安区西乡街道', 'ACTIVE');

-- 4. 管理员用户（密码: admin123）
INSERT IGNORE INTO users (id, username, password, role, full_name, status) VALUES
(1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', '系统管理员', 'ACTIVE');

-- 5. 品牌基础数据
INSERT IGNORE INTO brands (id, name, trademark_no, first_letter, status) VALUES
(1, '华为', 'TM20240001', 'H', 'ENABLED'),
(2, '小米', 'TM20240002', 'X', 'ENABLED'),
(3, '苹果', 'TM20240003', 'P', 'ENABLED'),
(4, '三星', 'TM20240004', 'S', 'ENABLED'),
(5, '联想', 'TM20240005', 'L', 'ENABLED'),
(6, '戴尔', 'TM20240006', 'D', 'ENABLED'),
(7, '惠普', 'TM20240007', 'H', 'ENABLED'),
(8, '华硕', 'TM20240008', 'H', 'ENABLED');

-- 6. 修复已有数据：将中文物流公司名称转为编码
UPDATE purchase_orders 
SET logistics_company = CASE logistics_company
    WHEN '顺丰速运' THEN 'SF'
    WHEN '京东快递' THEN 'JD'
    WHEN '圆通速递' THEN 'YTO'
    WHEN '申通快递' THEN 'STO'
    WHEN '中通快递' THEN 'ZTO'
    WHEN '韵达速递' THEN 'YD'
    WHEN '韵达快递' THEN 'YD'
    WHEN '邮政快递包裹' THEN 'YZPY'
    WHEN '百世快递' THEN 'HTKY'
    WHEN '极兔速递' THEN 'JTEXPRESS'
    WHEN '德邦快递' THEN 'DBL'
    WHEN '优速快递' THEN 'UC'
    WHEN '天天快递' THEN 'HHTT'
    WHEN '宅急送' THEN 'ZJS'
    ELSE logistics_company
END
WHERE logistics_company REGEXP '[\u4e00-\u9fa5]';

UPDATE outbound_orders 
SET logistics_company = CASE logistics_company
    WHEN '顺丰速运' THEN 'SF'
    WHEN '京东快递' THEN 'JD'
    WHEN '圆通速递' THEN 'YTO'
    WHEN '申通快递' THEN 'STO'
    WHEN '中通快递' THEN 'ZTO'
    WHEN '韵达速递' THEN 'YD'
    WHEN '韵达快递' THEN 'YD'
    WHEN '邮政快递包裹' THEN 'YZPY'
    WHEN '百世快递' THEN 'HTKY'
    WHEN '极兔速递' THEN 'JTEXPRESS'
    WHEN '德邦快递' THEN 'DBL'
    WHEN '优速快递' THEN 'UC'
    WHEN '天天快递' THEN 'HHTT'
    WHEN '宅急送' THEN 'ZJS'
    ELSE logistics_company
END
WHERE logistics_company REGEXP '[\u4e00-\u9fa5]';

UPDATE refund_orders 
SET logistics_company = CASE logistics_company
    WHEN '顺丰速运' THEN 'SF'
    WHEN '京东快递' THEN 'JD'
    WHEN '圆通速递' THEN 'YTO'
    WHEN '申通快递' THEN 'STO'
    WHEN '中通快递' THEN 'ZTO'
    WHEN '韵达速递' THEN 'YD'
    WHEN '韵达快递' THEN 'YD'
    WHEN '邮政快递包裹' THEN 'YZPY'
    WHEN '百世快递' THEN 'HTKY'
    WHEN '极兔速递' THEN 'JTEXPRESS'
    WHEN '德邦快递' THEN 'DBL'
    WHEN '优速快递' THEN 'UC'
    WHEN '天天快递' THEN 'HHTT'
    WHEN '宅急送' THEN 'ZJS'
    ELSE logistics_company
END
WHERE logistics_company REGEXP '[\u4e00-\u9fa5]';

SELECT 'Database initialization completed successfully!' AS result;
