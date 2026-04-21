CREATE TABLE logistics_companies (
    code VARCHAR(50) NOT NULL PRIMARY KEY COMMENT '物流公司代码',
    name VARCHAR(100) NOT NULL COMMENT '物流公司中文名称',
    kdn_code VARCHAR(50) COMMENT '快递鸟接口对应编码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流公司基础数据表';

-- Seed Data
INSERT INTO logistics_companies (code, name, kdn_code) VALUES
('SF', '顺丰速运', 'SF'),
('YTO', '圆通速递', 'YTO'),
('STO', '申通快递', 'STO'),
('ZTO', '中通快递', 'ZTO'),
('YD', '韵达速递', 'YD'),
('YZPY', '邮政快递包裹', 'YZPY'),
('EMS', 'EMS', 'EMS'),
('HHTT', '天天快递', 'HHTT'),
('JD', '京东快递', 'JD'),
('UC', '优速快递', 'UC'),
('DBL', '德邦快递', 'DBL'),
('ZJS', '宅急送', 'ZJS'),
('TNT', 'TNT快递', 'TNT'),
('UPS', 'UPS', 'UPS'),
('DHL', 'DHL', 'DHL'),
('FEDEX', 'FedEx联邦快递', 'FEDEX'),
('FAST', '快捷速递', 'FAST'),
('ZJM', '芝麻开门', 'ZJM');
