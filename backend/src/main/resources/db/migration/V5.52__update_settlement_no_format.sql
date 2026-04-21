-- Update historical Settlement Order Numbers from PS+Time+4digits to PS+Time+3digits
-- Only updates where the 4-digit sequence starts with '0' (i.e., sequence <= 999) to avoid collisions
-- For sequences > 999, they are left as is (or handled manually)

UPDATE settlement_orders 
SET settlement_no = CONCAT(SUBSTRING(settlement_no, 1, 16), SUBSTRING(settlement_no, 18, 3)) 
WHERE settlement_no LIKE 'PS%' 
  AND LENGTH(settlement_no) = 20 
  AND SUBSTRING(settlement_no, 17, 1) = '0';
