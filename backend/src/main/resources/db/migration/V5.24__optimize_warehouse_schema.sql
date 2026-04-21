-- Optimize Warehouse Module Schema

-- 1. Add Region Codes
ALTER TABLE warehouses ADD COLUMN province_code VARCHAR(20);
ALTER TABLE warehouses ADD COLUMN city_code VARCHAR(20);
ALTER TABLE warehouses ADD COLUMN district_code VARCHAR(20);

-- 2. Create Warehouse Managers Association Table
CREATE TABLE IF NOT EXISTS warehouse_managers (
    warehouse_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (warehouse_id, user_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Warehouse Managers Association';

-- 3. Add Index for Sorting
CREATE INDEX idx_warehouses_create_time ON warehouses(created_at);

-- 4. Set Default Status for Existing Records (if any nulls, though unlikely due to entity constraints)
UPDATE warehouses SET status = 'ACTIVE' WHERE status IS NULL;
