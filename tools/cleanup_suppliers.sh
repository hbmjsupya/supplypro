#!/bin/bash
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASS=password
DB_NAME=supplypro
BACKUP_DIR=../backups
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/supplypro_cleanup_backup_$TIMESTAMP.sql"

echo "Backing up database to $BACKUP_FILE..."
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

echo "Cleaning up old suppliers (keeping ID 22)..."
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME <<EOF
SET FOREIGN_KEY_CHECKS=0;
DELETE FROM brand_supplier WHERE supplier_id != 22;
DELETE FROM supplier_accounts WHERE supplier_id != 22;
DELETE FROM settlement_orders WHERE supplier_id != 22;
DELETE FROM purchase_orders WHERE supplier_id != 22;
-- Set default_supplier_id to NULL for products linked to deleted suppliers
UPDATE products SET default_supplier_id = NULL WHERE default_supplier_id != 22;
DELETE FROM suppliers WHERE id != 22;
SET FOREIGN_KEY_CHECKS=1;
EOF

echo "Cleanup complete."
