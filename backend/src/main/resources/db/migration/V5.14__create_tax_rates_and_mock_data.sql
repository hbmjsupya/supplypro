-- Create Tax Rates Table
CREATE TABLE IF NOT EXISTS `tax_rates` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tax_classification_id` bigint(20) NOT NULL,
  `region_code` varchar(20) NOT NULL COMMENT 'Region Code (e.g., CN, CN-11)',
  `rate` decimal(5,4) NOT NULL COMMENT 'Tax Rate (e.g., 0.1300)',
  `effective_date` datetime DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ENABLED',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tax_rates_class_id` (`tax_classification_id`),
  CONSTRAINT `fk_tax_rates_class` FOREIGN KEY (`tax_classification_id`) REFERENCES `tax_classifications` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tax Rates Configuration';

-- Insert Mock Tax Classifications (Safely)
-- We use INSERT IGNORE or checking existence to avoid duplicates if re-run

INSERT INTO `tax_classifications` 
(`code`, `name`, `tax_rate`, `description`, `status`, `created_at`, `is_latest`, `version`)
SELECT '1010000000000001', '办公用品 - A4纸', 0.1300, 'Standard Office Supplies', 'ENABLED', NOW(), 1, 'V1.0'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `tax_classifications` WHERE `code` = '1010000000000001');

INSERT INTO `tax_classifications` 
(`code`, `name`, `tax_rate`, `description`, `status`, `created_at`, `is_latest`, `version`)
SELECT '1020000000000001', '电子设备 - 笔记本电脑', 0.1300, 'Electronics Laptop', 'ENABLED', NOW(), 1, 'V1.0'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `tax_classifications` WHERE `code` = '1020000000000001');

INSERT INTO `tax_classifications` 
(`code`, `name`, `tax_rate`, `description`, `status`, `created_at`, `is_latest`, `version`)
SELECT '2010000000000001', '食品 - 坚果', 0.0900, 'Food Nuts', 'ENABLED', NOW(), 1, 'V1.0'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `tax_classifications` WHERE `code` = '2010000000000001');

INSERT INTO `tax_classifications` 
(`code`, `name`, `tax_rate`, `description`, `status`, `created_at`, `is_latest`, `version`)
SELECT '3010000000000001', '服务 - 咨询费', 0.0600, 'Service Consulting', 'ENABLED', NOW(), 1, 'V1.0'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `tax_classifications` WHERE `code` = '3010000000000001');

-- Insert corresponding tax rates
INSERT INTO `tax_rates` (`tax_classification_id`, `region_code`, `rate`, `effective_date`)
SELECT id, 'CN', tax_rate, NOW() 
FROM `tax_classifications` 
WHERE code IN ('1010000000000001', '1020000000000001', '2010000000000001', '3010000000000001')
AND NOT EXISTS (SELECT 1 FROM `tax_rates` WHERE tax_classification_id = `tax_classifications`.id AND region_code = 'CN');
