ALTER TABLE prepayment_approvals 
ADD COLUMN logistics_provider_id BIGINT,
ADD COLUMN owner_type VARCHAR(20) DEFAULT 'SUPPLIER';

ALTER TABLE supplier_prepayment_logs 
ADD COLUMN logistics_provider_id BIGINT,
ADD COLUMN owner_type VARCHAR(20) DEFAULT 'SUPPLIER';

ALTER TABLE prepayment_approvals 
ADD CONSTRAINT fk_prepayment_logistics_provider 
FOREIGN KEY (logistics_provider_id) REFERENCES logistics_providers(id);

ALTER TABLE supplier_prepayment_logs 
ADD CONSTRAINT fk_prepayment_log_logistics_provider 
FOREIGN KEY (logistics_provider_id) REFERENCES logistics_providers(id);

ALTER TABLE prepayment_approvals MODIFY COLUMN supplier_id BIGINT NULL;
ALTER TABLE supplier_prepayment_logs MODIFY COLUMN supplier_id BIGINT NULL;
