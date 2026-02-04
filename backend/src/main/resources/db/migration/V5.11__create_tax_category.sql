CREATE TABLE `tax_category` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `category_code` varchar(64) NOT NULL COMMENT 'Tax Classification Code (e.g., 101010101)',
  `category_name` varchar(255) NOT NULL COMMENT 'Category Name',
  `tax_rate` decimal(10, 4) NOT NULL COMMENT 'Tax Rate (e.g., 0.13)',
  `parent_id` bigint(20) DEFAULT NULL COMMENT 'Parent ID',
  `level` int(11) NOT NULL COMMENT 'Hierarchy Level',
  `description` varchar(500) DEFAULT NULL COMMENT 'Description/Explanation',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tax Classification Categories';
