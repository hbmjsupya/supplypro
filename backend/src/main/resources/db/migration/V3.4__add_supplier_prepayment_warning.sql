ALTER TABLE suppliers
ADD COLUMN prepayment_warning DECIMAL(19, 2) DEFAULT NULL COMMENT 'Prepayment balance warning threshold';
