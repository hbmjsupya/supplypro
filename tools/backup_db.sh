#!/bin/bash

# Database Configuration
DB_HOST="127.0.0.1"
DB_PORT="3307"
DB_USER="root"
DB_PASS="password"
DB_NAME="supplypro"
BACKUP_DIR="backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/supplypro_backup_$TIMESTAMP.sql"

# Perform Backup
echo "Starting backup of database '$DB_NAME' to '$BACKUP_FILE'..."
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" --databases "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_FILE"
  # Optional: Keep only last 7 days of backups
  # find "$BACKUP_DIR" -name "supplypro_backup_*.sql" -mtime +7 -exec rm {} \;
else
  echo "Backup failed!"
  exit 1
fi
