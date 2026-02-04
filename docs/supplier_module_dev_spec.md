# 供应商类模块开发规范

## 1. 概述
本规范适用于“供应商管理”、“物流供应商”、“承运商”等具有相似业务属性（基础信息、资质、合同、账户、联系人）的模块开发。

## 2. 数据库设计规范
*   **表命名**：使用复数形式，如 `suppliers`, `logistics_providers`。
*   **主键**：统一使用 String/UUID 或 Long 自增（本项目约定：Long 自增）。
*   **核心字段**：
    *   `code`: 唯一编码
    *   `name`: 名称
    *   `status`: 状态枚举 (ACTIVE, INACTIVE, etc.)
    *   `purchaser_id`: 采购负责人关联ID（关联 User 表）
*   **子表关联**：所有子表（文件、账户）必须包含外键，并配置 JPA `CascadeType.ALL` 和 `orphanRemoval = true` 以支持级联删除。

## 3. 接口开发规范
*   **查询接口**：
    *   必须支持 `Specification` 动态查询。
    *   必须返回分页结构 `Page<DTO>`。
    *   支持复合搜索（如：联系人姓名 OR 电话）。
    *   列表 DTO 应包含关联对象的关键信息（如 `purchaserName`），避免 N+1 查询。
*   **新增/修改接口**：
    *   使用同一个 DTO 或分离 `CreateDTO`/`UpdateDTO`。
    *   文件上传采用“临时 ID”模式：前端先上传临时文件，提交表单时携带文件 ID 或 URL，后端在保存实体时将文件状态转为“永久”并关联实体 ID。

## 4. 前端开发规范
*   **组件复用**：
    *   文件管理统一使用 `SupplierFileManager`。
    *   人员选择统一使用 `Select` 组件配合 `onSearch` 远程搜索 User 接口。
*   **路由规范**：
    *   列表页：`/modules/list`
    *   详情页：`/modules/detail/:id`
    *   新增页：`/modules/create` (或复用详情页)
*   **Ant Design 使用**：
    *   避免使用废弃属性（如 `Card.bordered` -> `variant="borderless"`）。
    *   Table 列宽需显式指定，避免布局抖动。
*   **数据一致性**：
    *   列表页渲染关联字段时，应提供 Fallback 逻辑（如 `text || record.backupField`）以防止关联数据为空时的显示问题。

## 5. 测试验收标准
*   **单元测试**：覆盖 Service 层核心逻辑（增删改、状态流转）。
*   **集成测试**：覆盖 Controller 层接口，模拟 HTTP 请求。
*   **数据同步验证**：对于有数据同步需求的字段（如采购负责人），必须编写专门的测试用例验证同步逻辑。
