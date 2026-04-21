ALTER TABLE delivery_export_records ADD COLUMN total_count INT DEFAULT 0;
ALTER TABLE delivery_export_records ADD COLUMN success_count INT DEFAULT 0;
ALTER TABLE delivery_export_records ADD COLUMN fail_count INT DEFAULT 0;
ALTER TABLE delivery_export_records ADD COLUMN status VARCHAR(20) DEFAULT 'SUCCESS';
