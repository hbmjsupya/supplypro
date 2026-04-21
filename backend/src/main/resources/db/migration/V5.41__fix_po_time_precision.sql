-- Migration Script: Fix Purchase Order Time Precision
-- Description: Ensures created_at column is DATETIME (precision to seconds) and fills missing times if any.

-- 1. Ensure column type is DATETIME (MySQL defaults to seconds precision)
-- This command is idempotent in MySQL if type is already DATETIME
ALTER TABLE purchase_orders MODIFY COLUMN created_at DATETIME;

-- 2. Optional: If you need to ensure shipped_at is also precise
ALTER TABLE purchase_orders MODIFY COLUMN shipped_at DATETIME;

-- 3. Data Cleanup: If any records have NULL created_at, default to NOW()
UPDATE purchase_orders SET created_at = NOW() WHERE created_at IS NULL;

-- 4. Note on Frontend:
-- The backend entity PurchaseOrder.java has been updated with @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
-- ensuring the API returns full timestamp. The frontend list component displays this field directly.
