-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    supplier_no VARCHAR(50) UNIQUE NOT NULL COMMENT '供应商编号',
    name VARCHAR(200) NOT NULL COMMENT '供应商名称',
    contact_person VARCHAR(100) COMMENT '联系人',
    contact_phone VARCHAR(50) COMMENT '联系电话',
    settlement_type ENUM('PREPAYMENT', 'CASH', 'PERIOD') NOT NULL COMMENT '结算类型',
    settlement_period INT COMMENT '结算周期(天)',
    prepayment_balance DECIMAL(15,2) DEFAULT 0 COMMENT '预付款余额',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_supplier_no (supplier_no),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商信息表';

-- 仓库表
CREATE TABLE IF NOT EXISTS warehouses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '仓库名称',
    code VARCHAR(50) UNIQUE NOT NULL COMMENT '仓库代码',
    region VARCHAR(100) COMMENT '地区',
    address VARCHAR(255) COMMENT '详细地址',
    manager VARCHAR(100) COMMENT '负责人',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库信息表';

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sku_code VARCHAR(50) UNIQUE NOT NULL COMMENT 'SKU编码',
    name VARCHAR(200) NOT NULL COMMENT '商品名称',
    brand VARCHAR(100) COMMENT '品牌',
    category VARCHAR(100) COMMENT '分类',
    spec VARCHAR(100) COMMENT '规格',
    cost_price DECIMAL(10,2) NOT NULL COMMENT '成本价',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE' COMMENT '状态',
    default_supplier_id BIGINT COMMENT '默认供应商ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品信息表';

-- 采购订单表
CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '采购订单编号',
    supplier_id BIGINT NOT NULL COMMENT '供应商ID',
    warehouse_id BIGINT NOT NULL COMMENT '目标仓库ID',
    type ENUM('INBOUND', 'DROPSHIP', 'SELF') NOT NULL COMMENT '采购类型',
    status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'RECEIVED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING' COMMENT '订单状态',
    total_amount DECIMAL(15,2) NOT NULL COMMENT '订单总金额',
    delivery_date DATE COMMENT '预计交付日期',
    remark TEXT COMMENT '备注',
    created_by VARCHAR(50) NOT NULL COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    INDEX idx_order_no (order_no),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单表';

-- 采购订单明细表
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '采购单ID',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '采购数量',
    unit_price DECIMAL(10,2) NOT NULL COMMENT '采购单价',
    total_price DECIMAL(15,2) NOT NULL COMMENT '总价',
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单明细表';

-- 入库单表
CREATE TABLE IF NOT EXISTS inbound_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    inbound_no VARCHAR(50) UNIQUE NOT NULL COMMENT '入库单号',
    purchase_order_id BIGINT COMMENT '关联采购单ID',
    warehouse_id BIGINT NOT NULL COMMENT '仓库ID',
    status ENUM('PENDING', 'RECEIVED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING' COMMENT '状态',
    inbound_date DATETIME COMMENT '入库时间',
    confirmed_by VARCHAR(50) COMMENT '确认人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单表';

-- 库存批次表
CREATE TABLE IF NOT EXISTS stock_batches (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_no VARCHAR(50) UNIQUE NOT NULL COMMENT '批次编号',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    warehouse_id BIGINT NOT NULL COMMENT '仓库ID',
    inbound_order_id BIGINT COMMENT '入库单ID',
    quantity INT NOT NULL COMMENT '总数量',
    available_quantity INT NOT NULL COMMENT '可用数量',
    locked_quantity INT DEFAULT 0 COMMENT '锁定数量',
    unit_cost DECIMAL(10,2) NOT NULL COMMENT '单位成本',
    total_cost DECIMAL(15,2) NOT NULL COMMENT '总成本',
    production_date DATE COMMENT '生产日期',
    expiry_date DATE COMMENT '过期日期',
    status ENUM('ACTIVE', 'EXPIRED', 'SOLD_OUT') DEFAULT 'ACTIVE' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (inbound_order_id) REFERENCES inbound_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存批次表';

-- 结算单表
CREATE TABLE IF NOT EXISTS settlements (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    settlement_no VARCHAR(50) UNIQUE NOT NULL COMMENT '结算单号',
    supplier_id BIGINT NOT NULL COMMENT '供应商ID',
    type ENUM('PURCHASE', 'LOGISTICS') NOT NULL COMMENT '结算类型',
    total_amount DECIMAL(15,2) NOT NULL COMMENT '结算总金额',
    status ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED') DEFAULT 'PENDING' COMMENT '状态',
    settlement_date DATETIME COMMENT '结算日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结算单表';

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_no VARCHAR(50) UNIQUE NOT NULL COMMENT '客户编号',
    name VARCHAR(200) NOT NULL COMMENT '客户名称',
    contact_person VARCHAR(100) COMMENT '联系人',
    contact_phone VARCHAR(50) COMMENT '联系电话',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户信息表';

-- 销售订单表
CREATE TABLE IF NOT EXISTS sales_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '销售订单编号',
    customer_id BIGINT NOT NULL COMMENT '客户ID',
    warehouse_id BIGINT NOT NULL COMMENT '发货仓库ID',
    status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING' COMMENT '订单状态',
    total_amount DECIMAL(15,2) NOT NULL COMMENT '订单总金额',
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '下单时间',
    created_by VARCHAR(50) NOT NULL COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售订单表';

-- 销售订单明细表
CREATE TABLE IF NOT EXISTS sales_order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '销售订单ID',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '销售数量',
    unit_price DECIMAL(10,2) NOT NULL COMMENT '销售单价',
    total_price DECIMAL(15,2) NOT NULL COMMENT '总价',
    FOREIGN KEY (order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售订单明细表';
