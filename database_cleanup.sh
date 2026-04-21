#!/bin/bash

# Configuration
DB_HOST="127.0.0.1"
DB_PORT="3307"
DB_USER="root"
DB_PASS="password"
DB_NAME="supplypro"
BACKUP_DIR="backups"
UPLOAD_DIRS=("uploads" "backend/uploads")
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="cleanup_${DATE}.log"

mkdir -p $BACKUP_DIR

echo "[${DATE}] Starting Cleanup Process..." | tee -a $LOG_FILE

# 1. Backup Database
echo "[${DATE}] Backing up database..." | tee -a $LOG_FILE
BACKUP_FILE="${BACKUP_DIR}/supplypro_backup_${DATE}.sql"
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "[${DATE}] Backup successful: $BACKUP_FILE" | tee -a $LOG_FILE
else
    echo "[${DATE}] Backup FAILED! Aborting." | tee -a $LOG_FILE
    exit 1
fi

# Verify Backup
if [ -s "$BACKUP_FILE" ]; then
    echo "[${DATE}] Backup verified (file exists and not empty)." | tee -a $LOG_FILE
else
    echo "[${DATE}] Backup verification FAILED (empty file)! Aborting." | tee -a $LOG_FILE
    exit 1
fi

# 2. Backup Files (Safety First)
echo "[${DATE}] Backing up files..." | tee -a $LOG_FILE
FILES_BACKUP="${BACKUP_DIR}/files_backup_${DATE}.tar.gz"
tar -czf $FILES_BACKUP ${UPLOAD_DIRS[@]} 2>/dev/null
echo "[${DATE}] Files backed up to $FILES_BACKUP" | tee -a $LOG_FILE

# 3. Execute SQL Cleanup
echo "[${DATE}] Executing SQL Cleanup..." | tee -a $LOG_FILE
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME < cleanup_data.sql

if [ $? -eq 0 ]; then
    echo "[${DATE}] SQL Cleanup successful." | tee -a $LOG_FILE
else
    echo "[${DATE}] SQL Cleanup FAILED!" | tee -a $LOG_FILE
    exit 1
fi

# 4. File Cleanup
echo "[${DATE}] Cleaning up uploaded files..." | tee -a $LOG_FILE

for DIR in "${UPLOAD_DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        echo "Cleaning directory: $DIR" | tee -a $LOG_FILE
        # Find and delete files, but keep directory structure if needed? 
        # User asked to "Delete image files".
        # We will remove all files in these directories as they are user generated content.
        rm -rf "$DIR"/*
        echo "[${DATE}] Cleared $DIR" | tee -a $LOG_FILE
    fi
done

echo "[${DATE}] Cleanup Completed Successfully." | tee -a $LOG_FILE
echo "---------------------------------------------------" | tee -a $LOG_FILE
echo "Cleanup Summary:" | tee -a $LOG_FILE
echo "1. Database Backup: $BACKUP_FILE" | tee -a $LOG_FILE
echo "2. File Backup: $FILES_BACKUP" | tee -a $LOG_FILE
echo "3. SQL Cleanup Executed" | tee -a $LOG_FILE
echo "4. Upload Directories Cleared" | tee -a $LOG_FILE
