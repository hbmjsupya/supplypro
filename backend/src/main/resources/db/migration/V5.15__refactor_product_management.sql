-- 1. Refactor Product Categories
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `product_categories` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `category_id` varchar(64) NOT NULL COMMENT 'Unique Category ID / Code',
    `parent_id` varchar(64) DEFAULT NULL COMMENT 'Parent Category ID',
    `level` int(11) NOT NULL COMMENT 'Level: 1, 2, 3, 4',
    `name` varchar(128) NOT NULL COMMENT 'Category Name',
    `code` varchar(64) DEFAULT NULL COMMENT 'Short Code',
    `full_path` varchar(512) DEFAULT NULL COMMENT 'Full Path Names',
    `sort_order` int(11) DEFAULT 0,
    `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
    `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_category_id` (`category_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Product Categories (4 Levels)';

-- Mock Data for Product Categories (4 Levels)
-- Level 1
INSERT INTO `product_categories` (`category_id`, `parent_id`, `level`, `name`, `code`, `full_path`, `sort_order`) VALUES
('CAT_001', '0', 1, 'Electronics', 'ELEC', 'Electronics', 1),
('CAT_002', '0', 1, 'Food & Beverage', 'FOOD', 'Food & Beverage', 2);

-- Level 2
INSERT INTO `product_categories` (`category_id`, `parent_id`, `level`, `name`, `code`, `full_path`, `sort_order`) VALUES
('CAT_001_001', 'CAT_001', 2, 'Computers', 'COMP', 'Electronics/Computers', 1),
('CAT_002_001', 'CAT_002', 2, 'Snacks', 'SNACK', 'Food & Beverage/Snacks', 1);

-- Level 3
INSERT INTO `product_categories` (`category_id`, `parent_id`, `level`, `name`, `code`, `full_path`, `sort_order`) VALUES
('CAT_001_001_001', 'CAT_001_001', 3, 'Laptops', 'LAPTOP', 'Electronics/Computers/Laptops', 1),
('CAT_002_001_001', 'CAT_002_001', 3, 'Nuts', 'NUTS', 'Food & Beverage/Snacks/Nuts', 1);

-- Level 4
INSERT INTO `product_categories` (`category_id`, `parent_id`, `level`, `name`, `code`, `full_path`, `sort_order`) VALUES
('CAT_001_001_001_001', 'CAT_001_001_001', 4, 'Gaming Laptops', 'GAME_LAP', 'Electronics/Computers/Laptops/Gaming Laptops', 1),
('CAT_001_001_001_002', 'CAT_001_001_001', 4, 'Ultrabooks', 'ULTRA', 'Electronics/Computers/Laptops/Ultrabooks', 2),
('CAT_002_001_001_001', 'CAT_002_001_001', 4, 'Almonds', 'ALMOND', 'Food & Beverage/Snacks/Nuts/Almonds', 1),
('CAT_002_001_001_002', 'CAT_002_001_001', 4, 'Cashews', 'CASHEW', 'Food & Beverage/Snacks/Nuts/Cashews', 2);


-- 2. Refactor Tax Categories
-- Drop old tables if they exist (tax_rates depends on tax_classifications, so drop rates first)
DROP TABLE IF EXISTS `tax_rates`;
DROP TABLE IF EXISTS `tax_classifications`;
DROP TABLE IF EXISTS `tax_category`; -- Drop if exists from previous attempts

CREATE TABLE `tax_categories` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `tax_category_id` varchar(64) NOT NULL COMMENT 'Unique Tax Category ID',
    `category_code` varchar(64) NOT NULL,
    `category_name` varchar(128) NOT NULL,
    `tax_rate` decimal(5,4) NOT NULL COMMENT 'Standard Tax Rate',
    `preferential_rate` decimal(5,4) DEFAULT NULL,
    `effective_date` datetime DEFAULT NULL,
    `expiry_date` datetime DEFAULT NULL,
    `status` varchar(20) NOT NULL DEFAULT 'ENABLED',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_tax_category_id` (`tax_category_id`),
    KEY `idx_category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tax Categories';

-- Mock Data for Tax Categories
INSERT INTO `tax_categories` (`tax_category_id`, `category_code`, `category_name`, `tax_rate`, `status`) VALUES
('TC_001', '10101', 'General Goods', 0.1300, 'ENABLED'),
('TC_002', '10201', 'Agricultural Products', 0.0900, 'ENABLED'),
('TC_003', '10301', 'Services', 0.0600, 'ENABLED'),
('TC_004', '10401', 'Zero Rate Goods', 0.0000, 'ENABLED');

-- 3. Supplier Refactor (Cleanup not needed as table exists, just data verification)
-- Ensure 'default_supplier_id' column exists in specs table?
-- Wait, specs are usually JSON or a separate table. Let's check 'sku' table.
-- Assuming 'skus' table has 'supplier_id'. If not, we might need to add it or it's already there.
-- Based on previous analysis, Sku has supplier relationship.
