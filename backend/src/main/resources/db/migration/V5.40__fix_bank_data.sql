-- Fix Bank Data: Restore missing banks if they don't exist
-- Using INSERT IGNORE to avoid duplicate key errors

INSERT IGNORE INTO banks (bank_code, name, short_name, type, level, status, created_at, updated_at) VALUES 
('102100099996', '中国工商银行股份有限公司', '工商银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('103100000026', '中国农业银行股份有限公司', '农业银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('104100000004', '中国银行股份有限公司', '中国银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('105100000017', '中国建设银行股份有限公司', '建设银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('301290000007', '交通银行股份有限公司', '交通银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('403100000004', '中国邮政储蓄银行股份有限公司', '邮储银行', 'STATE_OWNED', 'HEAD_OFFICE', 1, NOW(), NOW()),
('308584000013', '招商银行股份有限公司', '招商银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('302100011000', '中信银行股份有限公司', '中信银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('303100000006', '中国光大银行股份有限公司', '光大银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('304100040000', '华夏银行股份有限公司', '华夏银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('305100000013', '中国民生银行股份有限公司', '民生银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('306581000003', '广发银行股份有限公司', '广发银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('307584007998', '平安银行股份有限公司', '平安银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('309391000011', '兴业银行股份有限公司', '兴业银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('310290000013', '上海浦东发展银行股份有限公司', '浦发银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('315456000105', '恒丰银行股份有限公司', '恒丰银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('316331000018', '浙商银行股份有限公司', '浙商银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW()),
('318110000014', '渤海银行股份有限公司', '渤海银行', 'JOINT_STOCK', 'HEAD_OFFICE', 1, NOW(), NOW());
