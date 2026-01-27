CREATE TABLE IF NOT EXISTS stock_flows (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    stock_batch_id BIGINT,
    warehouse_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    batch_no VARCHAR(50),
    flow_type VARCHAR(20) NOT NULL COMMENT 'INBOUND, OUTBOUND, ADJUSTMENT_IN, ADJUSTMENT_OUT',
    quantity INT NOT NULL,
    balance_after INT,
    reference_no VARCHAR(50),
    reason VARCHAR(255),
    operator VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存流水表';
