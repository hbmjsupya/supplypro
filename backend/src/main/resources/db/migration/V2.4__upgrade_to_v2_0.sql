-- 1. Drop unused table if exists
DROP TABLE IF EXISTS settlements;

-- 2. New Table: Product Bundles
CREATE TABLE product_bundles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_product_id BIGINT NOT NULL COMMENT '父商品(Bundle)ID',
    child_product_id BIGINT NOT NULL COMMENT '子商品(SKU)ID',
    quantity INT NOT NULL DEFAULT 1 COMMENT '包含数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_parent_child (parent_product_id, child_product_id),
    FOREIGN KEY (parent_product_id) REFERENCES products(id),
    FOREIGN KEY (child_product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组合商品关联表';

-- 3. New Table: Supplier Prepayment Logs
CREATE TABLE supplier_prepayment_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    supplier_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'CHARGE, DEDUCT, REFUND',
    amount DECIMAL(15,2) NOT NULL COMMENT '变动金额',
    balance_after DECIMAL(15,2) NOT NULL COMMENT '变动后余额',
    related_order_no VARCHAR(50) COMMENT '关联单号',
    remark VARCHAR(255),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预付款流水表';

-- 4. New Table: Logistics Tracks
CREATE TABLE logistics_tracks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    biz_type VARCHAR(20) NOT NULL COMMENT 'PURCHASE, INBOUND, OUTBOUND',
    biz_no VARCHAR(50) NOT NULL COMMENT '关联业务单号',
    logistics_provider VARCHAR(50) COMMENT '物流商',
    tracking_no VARCHAR(50) COMMENT '运单号',
    status VARCHAR(50) COMMENT '物流状态',
    location VARCHAR(100) COMMENT '当前位置',
    description VARCHAR(255) COMMENT '详细描述',
    event_time DATETIME NOT NULL COMMENT '发生时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_biz_no (biz_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流轨迹明细表';

-- 5. Alter Products Table
ALTER TABLE products ADD COLUMN is_bundle BOOLEAN DEFAULT FALSE COMMENT '是否为组合商品';

-- 6. Alter Outbound Orders Table
ALTER TABLE outbound_orders ADD COLUMN source_type VARCHAR(20) COMMENT 'SALES, DROPSHIP';
ALTER TABLE outbound_orders ADD COLUMN source_ref_no VARCHAR(50) COMMENT '来源单号';
