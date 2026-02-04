-- Drop temporary table from previous attempt
DROP TABLE IF EXISTS tax_category;

-- Add effective_date to existing tax_classifications table
ALTER TABLE tax_classifications ADD COLUMN effective_date DATETIME;

-- Create Data Sync Log table
CREATE TABLE IF NOT EXISTS data_sync_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL COMMENT 'Type of sync (e.g., TAX_DATA)',
    status VARCHAR(20) NOT NULL COMMENT 'SUCCESS, FAILED',
    details TEXT COMMENT 'Detailed result or error message',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
