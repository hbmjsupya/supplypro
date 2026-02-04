# Skills 技术文档库

本文档汇总了 SupplyPro 系统中的核心技术实现、最佳实践及常见问题处理方案。

## 1. 商品分类层级设计 (Product Category Hierarchy)

### 设计目标
支持 4 级商品分类结构，确保在高并发场景下分类数据的快速读取，并具备外部 API 故障时的本地兜底机制。

### 实现方案
*   **数据模型**: `categories` 表存储所有层级数据，通过 `parent_id` 维护树形结构。
*   **缓存策略**: Redis 缓存分类树 (`category:v4:{parentId}`), 过期时间 2 小时。
*   **兜底机制 (Fallback)**:
    *   **L1**: 20 个固定一级分类 (如 "数码电器", "服装鞋包")。
    *   **L2**: 每个 L1 生成 5 个二级分类。
    *   **L3**: 每个 L2 生成 5 个三级分类。
    *   **L4**: 每个 L3 生成 10 个四级分类 (Leaf Node)。
    *   **持久化**: 兜底生成的分类数据会自动持久化到 MySQL，避免重复生成。

### 核心代码
*   `CategoryServiceImpl.java`: `syncOrGenerateCategories` 方法处理缓存击穿后的数据生成与持久化。

## 2. 品牌信息展示优化 (Brand Display Optimization)

### 问题背景
早期设计中 `Product` 表直接存储 `brand_zh_name` 冗余字段，导致品牌名称修改后商品表数据不一致。

### 优化方案
*   **关联查询**: 废弃单纯依赖冗余字段的模式，改用 JPA `@EntityGraph` 在查询商品时 Eager Fetch 关联的 `Brand` 实体。
*   **动态展示**: `Product` 实体增加 `@Transient getDisplayBrandName()` 方法，优先返回 `brand.getName()`，若关联为空则回退到冗余字段。
*   **API 调整**: `ProductController` 在 `getById` 和列表查询中调用 `findWithBrandById`，确保返回最新的品牌名称。

### 最佳实践
*   **避免 N+1**: 使用 `@EntityGraph(attributePaths = {"brand"})` 替代默认的 Lazy Load。
*   **数据一致性**: 尽量通过 ID 关联获取名称，冗余字段仅作为搜索索引或极端降级方案。

## 3. 税务分类与税率管理 (Tax Classification & Rate)

### 功能模块
*   **自动同步**: 每日凌晨 2:00 (`@Scheduled`) 同步税务分类数据。
*   **智能匹配**: 商品编辑时根据名称自动匹配税务分类 (`smartMatch`)。
*   **自动填充**: 前端监听税务分类变更，自动回填税率。

### 错误预防
*   **校验机制**: 后端 `update` 接口强制校验税率范围 (0.00 - 1.00)，防止异常数据录入。
*   **变更日志**: 所有税率变更操作记录到 `product_tax_change_logs` 表，便于审计。

## 4. 常见错误处理 (Error Handling)

### 4.1 数据库 Schema 校验失败
*   **现象**: `SchemaManagementException: Schema-validation: wrong column type`
*   **原因**: Java Entity 定义与 DB 列类型不匹配 (如 `String` 映射为 `CHAR` 但 DB 是 `VARCHAR`)。
*   **解决**: 确保 `@Column(columnDefinition = "CHAR(1)")` 显式指定类型，或通过 Flyway 脚本修正 DB。

### 4.2 Docker 连接拒绝
*   **现象**: `Connection refused` (Redis/ES)
*   **原因**: Spring Boot 配置使用了 `localhost`，而在 Docker 网络中应使用服务名。
*   **解决**: `docker-compose.yml` 中注入环境变量 `SPRING_REDIS_HOST=supplypro-redis`。

### 4.3 实体序列化死循环
*   **现象**: `StackOverflowError` (Jackson)
*   **原因**: 双向关联 (`Product` <-> `Brand`) 未忽略反向引用。
*   **解决**: 使用 `@JsonIgnoreProperties` 或 `@ToString.Exclude` 打断循环。

## 5. 验证与测试
*   **分类**: 调用 `/api/categories?parentId=0` 确认返回 20 个一级分类。
*   **品牌**: 修改 Brand 名称后，查询关联商品，确认 `brandZhName` 同步更新。
*   **税率**: 尝试提交 `taxRate=1.5`，确认接口返回 400 错误。

## 6. 状态流转与审批 (Approval Flow)

### 功能描述
商品生命周期状态流转 (待选品 -> 已选品 -> 已上架 -> 已下架) 需要严格的事务控制和状态校验。

### 实现细节
*   **后端 API**: 使用 `@PatchMapping("/{id}/status")` 提供专用状态更新接口，避免全量更新带来的副作用。
*   **参数校验**: 接收 `Product.Status` 枚举类型，利用 Spring 自动转换机制确保状态值合法。
*   **事务一致性**: 加上 `@Transactional` 注解，确保 DB 状态更新与 ES 索引同步消息发送 (MQ) 的原子性。
*   **前端交互**: 按钮根据当前状态动态渲染 (如仅 "已选品" 可 "上架")，操作后调用 API 并刷新列表。

## 7. 数据同步日志 (Data Sync Logging)

### 场景
对于外部数据源 (如税务分类、供应商信息) 的定时同步，需要记录同步结果以便排查问题。

### 最佳实践
*   **独立日志表**: 创建 `DataSyncLog` 实体，记录 syncType, status, details, timestamp。
*   **事务隔离**: 即使同步过程抛出异常，日志记录也应尽可能保存。但在简单实现中，可在 catch 块中保存失败日志。
*   **Mock 数据**: 在开发/测试环境，Service 层应内置 Mock 数据生成逻辑 (如 `TaxCategoryServiceImpl.getMockData()`)，确保在无外部 API 时系统仍可运行。

## 8. 前后端枚举一致性 (Enum Consistency)

### 问题
前端传参 (如 `status: "Enabled"`) 与后端枚举 (如 `Status.ENABLED`) 大小写不一致可能导致 400 错误。

### 规范
*   **严格大写**: 前端统一使用全大写下划线格式 (SNAKE_CASE) 传递枚举值 (如 `ENABLED`, `ON_SHELF`)。
*   **后端兼容**: 虽然 `@JsonCreator` 可处理反序列化，但 `@RequestParam` 默认区分大小写。建议前端严格遵守后端 Enum 定义。

