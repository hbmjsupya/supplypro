CREATE TABLE `sales_projects` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `project_id` varchar(64) NOT NULL COMMENT '唯一项目ID',
    `project_name` varchar(128) NOT NULL COMMENT '项目名称',
    `platform_name` varchar(128) DEFAULT NULL COMMENT '平台名称',
    `description` varchar(512) DEFAULT NULL COMMENT '描述',
    `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='销售项目（虚拟）';

INSERT INTO `sales_projects` (`project_id`, `project_name`, `platform_name`, `description`, `is_enabled`) VALUES
('sp-huayun', '化云甄选商城', '化云甄选', '化云甄选商城可售商品分类配置', 1),
('sp-jd', '京东自营', '京东', '京东自营可售商品分类配置', 1),
('sp-tmall', '天猫旗舰店', '天猫', '天猫旗舰店可售商品分类配置', 1),
('sp-pdd', '拼多多官方', '拼多多', '拼多多官方可售商品分类配置', 1);

CREATE TABLE `project_categories` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `project_category_id` varchar(64) NOT NULL COMMENT '唯一项目分类ID',
    `parent_id` varchar(64) DEFAULT NULL COMMENT '父分类ID',
    `level` int(11) NOT NULL COMMENT '层级',
    `name` varchar(128) NOT NULL COMMENT '分类名称',
    `full_path` varchar(512) DEFAULT NULL COMMENT '完整路径',
    `sales_project_id` varchar(64) NOT NULL COMMENT '关联销售项目ID',
    `is_leaf` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否末级分类',
    `sort_order` int(11) DEFAULT 0,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_project_category_id` (`project_category_id`),
    KEY `idx_sales_project_id` (`sales_project_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目分类（上传的分类表解析后存储）';

CREATE TABLE `category_mappings` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `system_category_id` varchar(64) NOT NULL COMMENT '系统商品分类ID',
    `system_category_name` varchar(128) NOT NULL COMMENT '系统商品分类名称',
    `system_category_full_path` varchar(512) DEFAULT NULL COMMENT '系统商品分类完整路径',
    `system_category_level` int(11) NOT NULL COMMENT '系统商品分类层级',
    `project_category_id` varchar(64) NOT NULL COMMENT '项目分类ID',
    `project_category_name` varchar(128) NOT NULL COMMENT '项目分类名称',
    `project_category_full_path` varchar(512) DEFAULT NULL COMMENT '项目分类完整路径',
    `sales_project_id` varchar(64) NOT NULL COMMENT '关联销售项目ID',
    `match_score` varchar(16) DEFAULT NULL COMMENT '匹配得分',
    `match_method` varchar(64) DEFAULT NULL COMMENT '匹配方式',
    `match_status` varchar(32) NOT NULL DEFAULT '精准匹配' COMMENT '匹配状态',
    `created_by` varchar(64) DEFAULT NULL COMMENT '创建人',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sales_project_id` (`sales_project_id`),
    KEY `idx_system_category_id` (`system_category_id`),
    KEY `idx_project_category_id` (`project_category_id`),
    UNIQUE KEY `uk_system_project` (`system_category_id`, `project_category_id`, `sales_project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类映射关系';
