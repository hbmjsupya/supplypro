-- Data Consistency Check Script

-- 1. Check for orphan brand_supplier records
SELECT 'Orphan Brand Supplier Records (Brand)' as check_name, COUNT(*) as count FROM brand_supplier WHERE brand_id NOT IN (SELECT id FROM brands);
SELECT 'Orphan Brand Supplier Records (Supplier)' as check_name, COUNT(*) as count FROM brand_supplier WHERE supplier_id NOT IN (SELECT id FROM suppliers);

-- 2. Check for users without roles
SELECT 'Users without Roles' as check_name, username FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE ur.role_id IS NULL;

-- 3. Check for multiple default accounts per supplier
SELECT 'Suppliers with Multiple Default Accounts' as check_name, supplier_id, COUNT(*) as default_count 
FROM supplier_accounts 
WHERE is_default = 1 
GROUP BY supplier_id 
HAVING default_count > 1;

-- 4. Check for invalid settlement types (should not be null as per schema)
SELECT 'Suppliers with Invalid Settlement Type' as check_name, id, name FROM suppliers WHERE settlement_type IS NULL;

-- 5. Check for missing critical files (Contract/Qualification) for Supplier 22
SELECT 'Supplier 22 Missing Files' as check_name, id, qualification_file, contract_file 
FROM suppliers 
WHERE id = 22 AND (qualification_file IS NULL OR contract_file IS NULL);
