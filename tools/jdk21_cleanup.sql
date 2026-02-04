-- JDK 21 Data Cleanup Script
-- Removes obsolete tables identified in Impact Analysis

SET FOREIGN_KEY_CHECKS = 0;

-- Remove Product Bundles (Feature removed)
DROP TABLE IF EXISTS product_bundles;

-- Remove Master Bank (Replaced by new Bank module)
DROP TABLE IF EXISTS master_bank;

SET FOREIGN_KEY_CHECKS = 1;
