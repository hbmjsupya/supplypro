-- Set default for existing records
UPDATE tax_classifications SET is_latest = 1 WHERE is_latest IS NULL;


