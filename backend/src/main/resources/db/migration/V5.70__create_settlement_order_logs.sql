CREATE TABLE IF NOT EXISTS settlement_order_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    settlement_order_id BIGINT NOT NULL,
    operator VARCHAR(100) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    remark TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_settlement_order_id (settlement_order_id),
    INDEX idx_created_at (created_at)
);
