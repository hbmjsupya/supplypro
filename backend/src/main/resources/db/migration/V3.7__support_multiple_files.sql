-- Change qualification_file and contract_file to TEXT to support JSON array
ALTER TABLE suppliers MODIFY COLUMN qualification_file TEXT;
ALTER TABLE suppliers MODIFY COLUMN contract_file TEXT;
