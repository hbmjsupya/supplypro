CREATE TABLE IF NOT EXISTS `delivery_export_records` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
    `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
    `file_size` BIGINT DEFAULT NULL COMMENT '文件大小(字节)',
    `exported_by` VARCHAR(255) NOT NULL COMMENT '导出人',
    `exported_at` DATETIME NOT NULL COMMENT '导出时间',
    `purchase_order_ids` TEXT DEFAULT NULL COMMENT '包含的采购单编号列表(JSON格式)',
    `created_at` DATETIME NOT NULL COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX `idx_exported_by` (`exported_by`),
    INDEX `idx_exported_at` (`exported_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='发货单导出记录表';
