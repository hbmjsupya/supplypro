-- Create outbound_order_logs table for tracking outbound order operations
CREATE TABLE IF NOT EXISTS outbound_order_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    outbound_order_id BIGINT NOT NULL,
    operator VARCHAR(100) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    remark TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_outbound_order_id (outbound_order_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
