CREATE TABLE regions (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_code VARCHAR(20),
    level INT NOT NULL
);

CREATE INDEX idx_regions_parent_code ON regions(parent_code);
