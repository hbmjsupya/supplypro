CREATE TABLE IF NOT EXISTS product_status_change_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(255),
    created_at DATETIME NOT NULL,
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS product_bundles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    parent_product_id BIGINT NOT NULL,
    child_product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    CONSTRAINT uk_product_bundle_parent_child UNIQUE (parent_product_id, child_product_id)
);
