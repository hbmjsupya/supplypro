-- Add is_from_stock_in to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN is_from_stock_in BOOLEAN DEFAULT FALSE;

-- Create purchase_order_snapshots table
CREATE TABLE purchase_order_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL,
    version INT NOT NULL,
    snapshot_hash VARCHAR(64) NOT NULL,
    snapshot_data LONGTEXT NOT NULL, -- JSON content
    
    -- Searchable fields (Denormalized for performance)
    order_no VARCHAR(50) NOT NULL,
    supplier_name VARCHAR(100),
    status VARCHAR(50),
    total_amount DECIMAL(19, 2),
    created_at DATETIME NOT NULL,
    created_by VARCHAR(50),
    
    -- Snapshot Metadata
    snapshot_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    snapshot_created_by VARCHAR(50),
    
    is_latest BOOLEAN DEFAULT TRUE, -- To quickly fetch the latest snapshot for list view
    
    INDEX idx_po_id (purchase_order_id),
    INDEX idx_order_no (order_no),
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_is_latest (is_latest)
);
