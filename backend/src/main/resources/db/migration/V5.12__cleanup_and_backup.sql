-- Backup Data
CREATE TABLE IF NOT EXISTS `tax_category_backup` AS SELECT * FROM `tax_category`;
CREATE TABLE IF NOT EXISTS `category_backup` AS SELECT * FROM `categories`;
CREATE TABLE IF NOT EXISTS `products_backup` AS SELECT * FROM `products`;

-- Cleanup Tax Categories (will be re-initialized by service)
TRUNCATE TABLE `tax_category`;

-- Cleanup Categories (Dirty data)
DELETE FROM `categories`;

-- Cleanup Invalid Brand Associations (Brand is Disabled)
-- Update products to remove brand link if brand is disabled
UPDATE `products` p
JOIN `brands` b ON p.brand_id = b.id
SET p.brand_id = NULL, p.brand_zh_name = NULL, p.brand_logo = NULL
WHERE b.status = 'DISABLED';

-- Note: Redis cache for categories (category:v5:*) should be cleared via SystemMaintenanceController
