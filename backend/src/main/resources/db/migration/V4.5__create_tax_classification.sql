-- Create tax_classifications table
CREATE TABLE tax_classifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    tax_rate DECIMAL(5, 4),
    description TEXT,
    parent_code VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_class_code ON tax_classifications(code);
CREATE INDEX idx_tax_class_status ON tax_classifications(status);

-- Insert initial data (Representative sample for Office Supplies, Electronics, etc.)
INSERT INTO tax_classifications (code, name, tax_rate, description, status) VALUES
('101010101', '谷物', 0.0900, '小麦、稻谷、玉米等', 'ENABLED'),
('106050100', '计算机工作站', 0.1300, '台式计算机、笔记本电脑等', 'ENABLED'),
('106050201', '计算机显示器', 0.1300, '液晶显示器等', 'ENABLED'),
('106050400', '输入输出设备', 0.1300, '键盘、鼠标、打印机等', 'ENABLED'),
('107060101', '复印纸', 0.1300, 'A4/A3复印纸等', 'ENABLED'),
('107060102', '书写纸', 0.1300, '笔记本、信纸等', 'ENABLED'),
('304040100', '笔', 0.1300, '圆珠笔、中性笔、铅笔等', 'ENABLED'),
('304040200', '墨水', 0.1300, '打印机墨水、钢笔墨水', 'ENABLED'),
('304040600', '装订用品', 0.1300, '订书机、订书钉、回形针等', 'ENABLED'),
('304040700', '文件管理用品', 0.1300, '文件夹、档案盒等', 'ENABLED');
