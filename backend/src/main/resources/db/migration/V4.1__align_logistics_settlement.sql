ALTER TABLE logistics_providers ADD COLUMN settlement_type VARCHAR(20);
ALTER TABLE logistics_providers ADD COLUMN settlement_period INT;
ALTER TABLE logistics_providers ADD COLUMN prepayment_balance DECIMAL(19,2);
ALTER TABLE logistics_providers ADD COLUMN prepayment_warning DECIMAL(19,2);

CREATE TABLE logistics_provider_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    logistics_provider_id BIGINT NOT NULL,
    type VARCHAR(20),
    name VARCHAR(100),
    bank VARCHAR(100),
    account VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    status BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_logistics_provider_accounts_provider 
        FOREIGN KEY (logistics_provider_id) 
        REFERENCES logistics_providers(id)
);
