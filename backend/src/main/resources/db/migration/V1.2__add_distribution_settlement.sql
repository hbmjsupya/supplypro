-- 物流供应商表
CREATE TABLE logistics_providers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 出库单表
CREATE TABLE outbound_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id BIGINT,
    logistics_provider_id BIGINT,
    consignee VARCHAR(100),
    consignee_phone VARCHAR(20),
    consignee_address VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (logistics_provider_id) REFERENCES logistics_providers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 结算单表
CREATE TABLE settlement_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    settlement_no VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL COMMENT 'PURCHASE, LOGISTICS',
    related_order_no VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' COMMENT 'PENDING, PAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入一些模拟数据
INSERT INTO logistics_providers (name, contact_person, contact_phone) VALUES 
('顺丰速运', '王卫', '95338'),
('京东物流', '刘强东', '950616');

INSERT INTO settlement_orders (settlement_no, type, related_order_no, amount, status) VALUES
('SET20231101001', 'PURCHASE', 'PO20231101001', 43000.00, 'PENDING');
