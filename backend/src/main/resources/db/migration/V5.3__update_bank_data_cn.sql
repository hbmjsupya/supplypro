-- Clean up existing data
DELETE FROM banks;

-- Reset auto-increment if supported (MySQL specific)
ALTER TABLE banks AUTO_INCREMENT = 1;

-- Insert Central Bank & Policy Banks
INSERT INTO banks (bank_code, name, short_name, type, level, status, created_at, updated_at) VALUES 
('001100000000', '中国人民银行', '人民银行', 'OTHER', 'HEAD_OFFICE', 1, NOW(), NOW()),
('201100000000', '国家开发银行', '国开行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('202100000000', '中国进出口银行', '进出口银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('203100000000', '中国农业发展银行', '农发行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW());

-- Insert State-Owned Commercial Banks
INSERT INTO banks (bank_code, name, short_name, type, level, status, created_at, updated_at) VALUES 
('102100099996', '中国工商银行股份有限公司', '工商银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('103100000026', '中国农业银行股份有限公司', '农业银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('104100000004', '中国银行股份有限公司', '中国银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('105100000017', '中国建设银行股份有限公司', '建设银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('301290000007', '交通银行股份有限公司', '交通银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('403100000004', '中国邮政储蓄银行股份有限公司', '邮储银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW());

-- Insert Joint-Stock Commercial Banks
INSERT INTO banks (bank_code, name, short_name, type, level, status, created_at, updated_at) VALUES 
('302100011000', '中信银行股份有限公司', '中信银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('303100000006', '中国光大银行股份有限公司', '光大银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('304100040000', '华夏银行股份有限公司', '华夏银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('305100000013', '中国民生银行股份有限公司', '民生银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('306581000003', '广发银行股份有限公司', '广发银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('307584007998', '平安银行股份有限公司', '平安银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('308584000013', '招商银行股份有限公司', '招商银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('309391000011', '兴业银行股份有限公司', '兴业银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('310290000013', '上海浦东发展银行股份有限公司', '浦发银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('315456000013', '恒丰银行股份有限公司', '恒丰银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('316331000018', '浙商银行股份有限公司', '浙商银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('318110000014', '渤海银行股份有限公司', '渤海银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW());

-- Insert City Commercial Banks (Selected Major Ones)
INSERT INTO banks (bank_code, name, short_name, type, level, status, created_at, updated_at) VALUES 
('313100000013', '北京银行股份有限公司', '北京银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313290000017', '上海银行股份有限公司', '上海银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313320000010', '江苏银行股份有限公司', '江苏银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313330100016', '杭州银行股份有限公司', '杭州银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313330200012', '宁波银行股份有限公司', '宁波银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313301000010', '南京银行股份有限公司', '南京银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313110000017', '天津银行股份有限公司', '天津银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313581000010', '广州银行股份有限公司', '广州银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313653000013', '成都银行股份有限公司', '成都银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313657000018', '重庆银行股份有限公司', '重庆银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313551000015', '长沙银行股份有限公司', '长沙银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313222000012', '盛京银行股份有限公司', '盛京银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313241000018', '哈尔滨银行股份有限公司', '哈尔滨银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313491000016', '郑州银行股份有限公司', '郑州银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313452000014', '青岛银行股份有限公司', '青岛银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313333000012', '温州银行股份有限公司', '温州银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313391000011', '厦门银行股份有限公司', '厦门银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313421000017', '江西银行股份有限公司', '江西银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313461000016', '中原银行股份有限公司', '中原银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313701000018', '贵阳银行股份有限公司', '贵阳银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313731000014', '西安银行股份有限公司', '西安银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313821000013', '兰州银行股份有限公司', '兰州银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313871000019', '乌鲁木齐银行股份有限公司', '乌鲁木齐银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313338000015', '台州银行股份有限公司', '台州银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('313339000019', '泰隆银行股份有限公司', '泰隆银行', 'CITY_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW());

-- Insert Rural Commercial Banks (Selected Major Ones)
INSERT INTO banks (bank_code, name, short_name, type, level, status, created_at, updated_at) VALUES 
('314100000016', '北京农村商业银行股份有限公司', '北京农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('314290000010', '上海农村商业银行股份有限公司', '上海农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('314581000011', '广州农村商业银行股份有限公司', '广州农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('314657000011', '重庆农村商业银行股份有限公司', '重庆农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('314653000016', '成都农村商业银行股份有限公司', '成都农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('314588000012', '东莞农村商业银行股份有限公司', '东莞农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('314584000018', '深圳农村商业银行股份有限公司', '深圳农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW()),
('314332000019', '江南农村商业银行股份有限公司', '江南农商行', 'RURAL_COMMERCIAL', 'HEAD_OFFICE', 1, NOW(), NOW());

-- Insert Foreign Banks (Selected Major Ones)
INSERT INTO banks (bank_code, name, short_name, type, level, status, created_at, updated_at) VALUES 
('501290000019', '汇丰银行（中国）有限公司', '汇丰中国', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW()),
('502290000012', '东亚银行（中国）有限公司', '东亚中国', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW()),
('503290000015', '南洋商业银行（中国）有限公司', '南商中国', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW()),
('504290000018', '恒生银行（中国）有限公司', '恒生中国', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW()),
('505290000011', '中银香港（中国）有限公司', '中银香港', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW()),
('509290000013', '星展银行（中国）有限公司', '星展中国', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW()),
('506290000014', '渣打银行（中国）有限公司', '渣打中国', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW()),
('512100000014', '花旗银行（中国）有限公司', '花旗中国', 'FOREIGN', 'HEAD_OFFICE', 1, NOW(), NOW());
