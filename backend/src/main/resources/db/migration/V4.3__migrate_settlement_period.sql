UPDATE logistics_providers
SET settlement_period = 30
WHERE settlement_period IN (90, 365);
