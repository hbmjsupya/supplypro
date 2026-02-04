CREATE TABLE banks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bank_code VARCHAR(20) NOT NULL COMMENT 'Bank CNAPS Code (12 digits)',
    name VARCHAR(100) NOT NULL COMMENT 'Bank Full Name',
    short_name VARCHAR(50) COMMENT 'Bank Short Name',
    type VARCHAR(20) COMMENT 'Bank Type: STATE_OWNED, JOINT_STOCK, etc.',
    level VARCHAR(20) COMMENT 'Bank Level: HEAD_OFFICE, BRANCH, SUB_BRANCH',
    province VARCHAR(50) COMMENT 'Province',
    city VARCHAR(50) COMMENT 'City',
    district VARCHAR(50) COMMENT 'District',
    address VARCHAR(200) COMMENT 'Detailed Address',
    phone VARCHAR(20) COMMENT 'Contact Phone',
    swift_code VARCHAR(20) COMMENT 'SWIFT Code',
    status BIT(1) DEFAULT 1 NOT NULL COMMENT 'Status: 1-Active, 0-Inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_bank_code UNIQUE (bank_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bank Basic Information';

CREATE INDEX idx_bank_name ON banks(name);
CREATE INDEX idx_bank_status ON banks(status);
