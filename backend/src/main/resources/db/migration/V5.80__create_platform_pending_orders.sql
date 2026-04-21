-- 平台待确认订单表
CREATE TABLE IF NOT EXISTS platform_pending_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    order_type VARCHAR(20) NOT NULL COMMENT '订单类型: OrderPurchase/Replenishment',
    biz_no VARCHAR(50) COMMENT '业务单号',
    third_party_no VARCHAR(50) COMMENT '三方子订单号',
    platform_name VARCHAR(50) COMMENT '平台名称',
    platform_order_no VARCHAR(50) COMMENT '平台订单号',
    
    product_id BIGINT NOT NULL COMMENT '商品ID',
    sku_id BIGINT COMMENT 'SKU ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    spec_name VARCHAR(200) COMMENT '规格名称',
    quantity INT NOT NULL COMMENT '数量',
    cost DECIMAL(10,2) NOT NULL COMMENT '成本单价',
    total_cost DECIMAL(10,2) NOT NULL COMMENT '成本合计',
    
    supplier_id BIGINT COMMENT '供应商ID',
    supplier_name VARCHAR(100) COMMENT '供应商名称',
    
    receiver VARCHAR(100) COMMENT '收货人',
    receiver_phone VARCHAR(20) COMMENT '收货电话',
    address VARCHAR(500) COMMENT '收货地址',
    
    project_name VARCHAR(100) COMMENT '归属项目',
    cost_type VARCHAR(20) NOT NULL DEFAULT 'Platform' COMMENT '成本类型: Platform/Supplier',
    
    expected_receive_time DATETIME COMMENT '期望收货时间',
    order_remark TEXT COMMENT '订单备注',
    
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING/CONFIRMED/REJECTED',
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_platform_pending_orders_order_no (order_no),
    INDEX idx_platform_pending_orders_product_id (product_id),
    INDEX idx_platform_pending_orders_supplier_id (supplier_id),
    INDEX idx_platform_pending_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台待确认订单表';
