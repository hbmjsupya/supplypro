ALTER TABLE suppliers
ADD COLUMN receiver_name VARCHAR(50) COMMENT '收货人姓名',
ADD COLUMN receiver_phone VARCHAR(20) COMMENT '收货人联系方式';
