ALTER TABLE supplier_accounts ADD COLUMN bank_id BIGINT COMMENT 'Bank ID';
ALTER TABLE supplier_accounts ADD CONSTRAINT fk_supplier_account_bank FOREIGN KEY (bank_id) REFERENCES banks(id);

ALTER TABLE logistics_provider_accounts ADD COLUMN bank_id BIGINT COMMENT 'Bank ID';
ALTER TABLE logistics_provider_accounts ADD CONSTRAINT fk_logistics_account_bank FOREIGN KEY (bank_id) REFERENCES banks(id);
