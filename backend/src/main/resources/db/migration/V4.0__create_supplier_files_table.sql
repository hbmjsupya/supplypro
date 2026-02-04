CREATE TABLE supplier_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT 'QUALIFICATION, CONTRACT',
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploader VARCHAR(100),
    description VARCHAR(500),
    version INT DEFAULT 1,
    group_id VARCHAR(36) NOT NULL COMMENT 'UUID linking versions of the same file',
    is_latest BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_supplier_files_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE INDEX idx_supplier_files_supplier_id ON supplier_files(supplier_id);
CREATE INDEX idx_supplier_files_group_id ON supplier_files(group_id);
