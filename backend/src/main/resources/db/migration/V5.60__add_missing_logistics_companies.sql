-- Add missing logistics companies
-- This migration adds major logistics companies that were missing from the database

-- First, check if JD exists, if not insert
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'JD', '京东快递', 'JD', '京东', '950616', TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'JD');

-- Add SF Express (顺丰速运)
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'SF', '顺丰速运', 'SF', '顺丰', '95338', TRUE, TRUE, 2
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'SF');

-- Add ZTO Express (中通快递)
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'ZTO', '中通快递', 'ZTO', '中通', '95311', TRUE, TRUE, 3
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'ZTO');

-- Add YTO Express (圆通速递)
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'YTO', '圆通速递', 'YTO', '圆通', '95554', TRUE, TRUE, 4
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'YTO');

-- Add Yunda Express (韵达快递)
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'YD', '韵达快递', 'YD', '韵达', '95546', TRUE, TRUE, 5
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'YD');

-- Add STO Express (申通快递)
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'STO', '申通快递', 'STO', '申通', '95543', TRUE, TRUE, 6
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'STO');

-- Add EMS (邮政EMS)
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'EMS', '邮政EMS', 'EMS', 'EMS', '11183', TRUE, TRUE, 7
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'EMS');

-- Add Deppon Express (德邦快递)
INSERT INTO logistics_companies (code, name, kdn_code, short_name, customer_service, is_domestic, is_active, sort_order)
SELECT 'DBKD', '德邦快递', 'DBKD', '德邦', '95353', TRUE, TRUE, 9
WHERE NOT EXISTS (SELECT 1 FROM logistics_companies WHERE code = 'DBKD');

-- Update existing records to ensure they are active
UPDATE logistics_companies SET is_active = TRUE WHERE code IN ('JD', 'SF', 'ZTO', 'YTO', 'YD', 'STO', 'EMS', 'DBKD');
