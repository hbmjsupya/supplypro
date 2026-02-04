ALTER TABLE suppliers DROP INDEX uk_supplier_name;
ALTER TABLE suppliers DROP INDEX uk_supplier_contact_phone;
ALTER TABLE suppliers ADD CONSTRAINT uk_supplier_name_phone UNIQUE (name, contact_phone);