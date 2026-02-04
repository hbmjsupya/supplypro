CREATE TABLE IF NOT EXISTS product_tax_change_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    old_rate DECIMAL(5, 4),
    new_rate DECIMAL(5, 4),
    reason VARCHAR(255),
    created_at DATETIME NOT NULL,
    created_by VARCHAR(255),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
