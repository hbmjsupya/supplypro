-- Add purchaser_id to logistics_providers
ALTER TABLE logistics_providers ADD COLUMN purchaser_id BIGINT;
ALTER TABLE logistics_providers ADD CONSTRAINT fk_logistics_providers_purchaser FOREIGN KEY (purchaser_id) REFERENCES users(id);

-- Create logistics_provider_files table
CREATE TABLE logistics_provider_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    logistics_provider_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    upload_time DATETIME,
    uploader VARCHAR(100),
    description TEXT,
    version INT DEFAULT 1,
    group_id VARCHAR(50) NOT NULL,
    is_latest BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_logistics_provider_files_provider FOREIGN KEY (logistics_provider_id) REFERENCES logistics_providers(id)
);

CREATE INDEX idx_logistics_provider_files_provider ON logistics_provider_files(logistics_provider_id);

-- Migrate old settlement periods (Quarterly=90, Yearly=365) to Monthly=30
UPDATE logistics_providers SET settlement_period = 30 WHERE settlement_period IN (90, 365);
