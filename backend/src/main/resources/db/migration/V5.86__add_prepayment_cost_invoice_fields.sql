ALTER TABLE prepayment_approvals 
ADD COLUMN cost_invoice_amount DECIMAL(19,2) COMMENT '应收成本票金额',
ADD COLUMN cost_invoice_received DECIMAL(19,2) COMMENT '已收成本票金额',
ADD COLUMN cost_invoice_status VARCHAR(20) COMMENT '成本票状态',
ADD COLUMN cost_invoice_files TEXT COMMENT '成本票文件列表JSON';
