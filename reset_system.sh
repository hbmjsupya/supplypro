#!/bin/bash

echo "Starting system reset and data cleanup..."

# Database cleanup script
SQL_FILE="cleanup.sql"
cat <<EOF > $SQL_FILE
SET FOREIGN_KEY_CHECKS = 0;

-- Core Business Data
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE purchase_order_logs;
TRUNCATE TABLE purchase_order_snapshots;
TRUNCATE TABLE purchase_orders;
TRUNCATE TABLE inbound_order_items;
TRUNCATE TABLE inbound_orders;
TRUNCATE TABLE settlement_orders;
TRUNCATE TABLE settlements;
TRUNCATE TABLE outbound_orders;

-- Product Pool
TRUNCATE TABLE products;
TRUNCATE TABLE product_brands;
TRUNCATE TABLE product_bundles;
TRUNCATE TABLE product_categories;
TRUNCATE TABLE product_status_change_logs;
TRUNCATE TABLE product_tax_change_logs;
TRUNCATE TABLE skus;
TRUNCATE TABLE category_backup;
TRUNCATE TABLE products_backup;
TRUNCATE TABLE tax_category_backup;

-- Partners & Logistics
TRUNCATE TABLE brand_supplier;
TRUNCATE TABLE brands;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE supplier_accounts;
TRUNCATE TABLE supplier_files;
TRUNCATE TABLE supplier_prepayment_logs;
TRUNCATE TABLE logistics_providers;
TRUNCATE TABLE logistics_provider_accounts;
TRUNCATE TABLE logistics_provider_files;
TRUNCATE TABLE logistics_tracks;

-- Warehouse & Stock
TRUNCATE TABLE warehouses;
TRUNCATE TABLE warehouse_managers;
TRUNCATE TABLE stock_batches;
TRUNCATE TABLE stock_flows;

-- System & Configuration
TRUNCATE TABLE users;
TRUNCATE TABLE notifications;
TRUNCATE TABLE data_sync_log;
TRUNCATE TABLE cost_adjustment_sheets;
TRUNCATE TABLE customers;
TRUNCATE TABLE banks;
TRUNCATE TABLE master_bank;
TRUNCATE TABLE regions;
TRUNCATE TABLE tax_categories;

-- Restore Default Admin User
INSERT INTO users (id, username, password, email, created_at, updated_at) VALUES (1, 'admin', '\$2a\$10\$.MQ13w2ZJbxAF9qMgnF/muvh.d.VWv/97agzsypsRQTQvdLy8FCEi', 'admin@supplypro.com', NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
EOF

echo "Executing database cleanup..."
docker exec -i supplypro-mysql mysql -u root -ppassword supplypro < $SQL_FILE
rm $SQL_FILE

echo "Cleaning up snapshot files..."
rm -rf backend/snapshots/*
rm -rf snapshots/* 2>/dev/null

echo "System reset completed successfully."
