# SupplyPro 供应链管理系统 — 架构与功能深度分析报告

> 生成日期：2026-06-01 | 分支：master

---

## 目录

1. [项目总览](#一项目总览)
2. [部署架构](#二部署架构)
3. [后端分层架构](#三后端分层架构)
4. [核心业务模块详解](#四核心业务模块详解)
   - 4.1 [采购管理](#41-采购管理)
   - 4.2 [供应商管理](#42-供应商管理)
   - 4.3 [结算财务管理](#43-结算财务管理)
   - 4.4 [成本调整](#44-成本调整)
   - 4.5 [物流管理](#45-物流管理)
   - 4.6 [仓储库存](#46-仓储库存)
   - 4.7 [类别映射（AI 辅助）](#47-类别映射ai-辅助)
   - 4.8 [快照系统](#48-快照系统)
   - 4.9 [数据完整性监控](#49-数据完整性监控)
5. [单号生成规范](#五单号生成规范)
6. [前端架构](#六前端架构)
7. [技术亮点与决策](#七技术亮点与决策)
8. [风险点与解决方案](#八风险点与解决方案)

---

## 一、项目总览

**SupplyPro** 是一个面向中国市场的**单体全栈供应链管理系统**，覆盖采购管理、仓储库存、供应商管理、结算财务管理、物流追踪等核心业务领域。

| 维度 | 技术选型 |
|------|---------|
| **后端框架** | Spring Boot 2.7.18 + Java 17 |
| **构建工具** | Maven（dev/test/prod 三套 profile） |
| **ORM** | JPA/Hibernate（主力）+ MyBatis（辅助） |
| **数据库** | MySQL 8.0 + Flyway 版本迁移（80+ 迁移脚本） |
| **缓存** | Redis（Token 黑名单、序列号生成、分布式锁） |
| **搜索引擎** | Elasticsearch 7.17（IK 中文分词器） |
| **消息队列** | RabbitMQ（产品 ES 同步、快照回填、死信队列） |
| **安全** | Spring Security + JWT（jjwt 0.11.5）无状态认证 |
| **熔断重试** | Resilience4j 1.7.0（CircuitBreaker + Retry） |
| **监控** | Actuator + Micrometer + Prometheus |
| **API 文档** | Springfox Swagger 3.0.0 |
| **前端框架** | React 19.2 + TypeScript ~5.9 |
| **UI 组件库** | Ant Design 6.2.1 |
| **构建（前端）** | Vite 7.2 |
| **测试** | JaCoCo（80%+ 行覆盖率）/ JUnit / Vitest / Cypress |
| **容器化** | Docker Compose（7 个服务） |

### 目录结构

```
supplypro/
├── backend/                        # Spring Boot 后端
│   ├── src/main/java/com/supplypro/
│   │   ├── controller/             # 38 个 REST 控制器
│   │   ├── service/                # 46 个服务接口
│   │   │   └── impl/               # 服务实现类
│   │   ├── repository/             # 50 个 JPA Repository
│   │   ├── entity/                 # 49 个 JPA 实体
│   │   ├── dto/                    # 19 个数据传输对象
│   │   ├── config/                 # 17 个配置类
│   │   ├── event/                  # 3 个应用事件
│   │   ├── listener/               # 事件监听器
│   │   ├── document/               # ES 文档映射
│   │   └── common/                 # 公共工具（AOP、注解、工具类）
│   ├── src/main/resources/
│   │   ├── db/migration/           # 80+ Flyway 迁移脚本
│   │   ├── application.yml         # 主配置
│   │   └── application-*.yml       # 环境特定配置
│   └── Dockerfile                  # 多阶段构建
├── frontend/                       # React + TypeScript 前端
│   ├── src/
│   │   ├── pages/                  # 14 个页面模块
│   │   ├── components/             # 8 个公共组件
│   │   ├── services/               # 14 个 API 服务文件
│   │   ├── layouts/                # 布局组件
│   │   ├── utils/                  # 工具函数和 Hooks
│   │   └── types/                  # TypeScript 类型定义
│   ├── nginx.conf                  # Nginx 配置
│   └── Dockerfile                  # 多阶段构建
├── docker-compose.yml              # 生产环境（7 个服务）
├── docker-compose.dev.yml          # 开发环境（仅基础设施）
├── docs/                           # 文档
├── scripts/                        # 辅助脚本
└── .github/workflows/ci.yml        # CI/CD 流水线
```

---

## 二、部署架构

### 生产环境（Docker Compose）

```
                    ┌─────────────────┐
     Port 80        │   Nginx         │
     ◀──────────────│  (Frontend)     │
                    └────────┬────────┘
                             │ /api/* 反向代理
                             ▼
                    ┌─────────────────┐
                    │  Spring Boot    │
                    │  (Backend:8080) │
                    └────────┬────────┘
                             │
        ┌────────────┬───────┼───────┬──────────┐
        ▼            ▼       ▼       ▼          ▼
   MySQL:3307    Redis    ES:9200  RabbitMQ   Registry
   (8.0)         (7.0)    (7.17)   (3.11)     :5001
```

| 服务 | 镜像/构建 | 端口 | 依赖 |
|------|----------|------|------|
| `frontend` | `./frontend` 构建 | 80:80 | supplypro-backend |
| `supplypro-backend` | `./backend` 构建 | 8080:8080 | mysql, redis, elasticsearch, rabbitmq |
| `mysql` | `mysql:8.0` | 3307:3306 | — |
| `redis` | `redis:7.0` | 6379:6379 | — |
| `elasticsearch` | 自定义构建 | 9200:9200 | — |
| `rabbitmq` | `rabbitmq:3.11-management` | 5672, 15672 | — |
| `registry` | `registry:2` | 5001:5000 | — |

### 开发环境

`docker-compose.dev.yml` 仅启动 MySQL + Redis + RabbitMQ，前后端在宿主机本地运行：

- 后端：`localhost:8080`
- 前端：`localhost:5173`（Vite dev server，通过代理转发 `/api` 到后端）

### 后端配置要点（application.yml）

| 配置项 | 值 |
|--------|-----|
| 数据库连接池 | HikariCP，最大 20 连接 |
| JPA DDL | `ddl-auto: update`（自动建表） |
| Flyway | 启用，baseline version 5.100 |
| Redis | `localhost:6379` |
| Elasticsearch | `localhost:9200` |
| JWT 过期 | 24 小时（86400000ms） |
| 文件上传 | 最大 100MB，限定图片/文档类型 |
| 限流 | 100 请求/秒（默认开启） |
| Resilience4j | 为 `purchaseOrderList` 和 `taxApi` 配置熔断+重试 |

---

## 三、后端分层架构

```
┌──────────────────────────────────────────────────┐
│  Controller (38个)      REST API 入口              │
├──────────────────────────────────────────────────┤
│  Service Interface      (service/ 46个接口)        │
│  Service Impl           (service/impl/ 实现类)     │
├──────────────────────────────────────────────────┤
│  Repository (50个)      Spring Data JPA           │
│  Mapper XML              MyBatis 辅助查询          │
├──────────────────────────────────────────────────┤
│  Entity (49个)          JPA 实体映射               │
│  DTO (19个)             数据传输对象               │
│  ProductDocument        ES 索引文档（IK 分词）      │
├──────────────────────────────────────────────────┤
│  MySQL 8.0              Flyway 管理 Schema         │
│  Redis                  缓存 / Token 黑名单        │
│  RabbitMQ               异步消息                   │
└──────────────────────────────────────────────────┘
```

### REST API 全量清单（38 个 Controller）

| # | Controller | 基础路径 | 功能域 |
|---|-----------|---------|--------|
| 1 | AuthController | `/api/auth` | 认证：登录/注册/登出 |
| 2 | UserController | `/api/users` | 用户管理 |
| 3 | ProductController | `/api/products` | 商品 CRUD + 导入导出 |
| 4 | ProductCategoryController | `/api/product-categories` | 商品分类 |
| 5 | BrandController | `/api/brands` | 品牌管理 |
| 6 | BundleController | `/api/bundles` | 组合商品 |
| 7 | SupplierController | `/api/suppliers` | 供应商管理 |
| 8 | SupplierFileController | `/api/supplier-files` | 供应商文件 |
| 9 | PurchaseOrderController | `/api/purchase-orders` | 采购单管理 |
| 10 | InboundOrderController | `/api/inbound-orders` | 入库单管理 |
| 11 | OutboundOrderController | `/api/outbound-orders` | 出库单管理 |
| 12 | WarehouseController | `/api/warehouses` | 仓库管理 |
| 13 | InventoryController | `/api/inventory` | 库存查询 |
| 14 | StockFlowController | `/api/stock-flows` | 库存流水 |
| 15 | BatchController | `/api/batches` | 库存批次 |
| 16 | SettlementOrderController | `/api/settlements` | 结算管理 |
| 17 | CostAdjustmentController | `/api/cost-adjustments` | 成本调整 |
| 18 | PrepaymentApprovalController | `/api/prepayment-approvals` | 预付款审批 |
| 19 | RefundOrderController | `/api/refund-orders` | 退款管理 |
| 20 | SalesOrderController | `/api/sales-orders` | 销售订单 |
| 21 | CustomerController | `/api/customers` | 客户管理 |
| 22 | PlatformPendingOrderController | `/api/platform-pending-orders` | 平台确认单 |
| 23 | LogisticsController | `/api/logistics` | 物流追踪 |
| 24 | LogisticsProviderController | `/api/logistics` | 物流供应商 |
| 25 | LogisticsCompanyController | `/api/logistics-companies` | 物流公司 |
| 26 | LogisticsProviderFileController | `/api/logistics-files` | 物流文件 |
| 27 | TaxCategoryController | `/api/tax-categories` | 税务分类 |
| 28 | BankController | `/api/banks` | 银行管理 |
| 29 | FileController | `/api/files` | 文件上传 |
| 30 | DeliveryExportRecordController | `/api/delivery-export-records` | 发货导出记录 |
| 31 | JdCategorySyncController | `/api/jd-categories` | 京东分类同步 |
| 32 | CategoryMappingController | `/api/category-mappings` | 类别映射 |
| 33 | SalesProjectController | `/api/sales-projects` | 销售项目 |
| 34 | ProjectCategoryController | `/api/project-categories` | 项目分类 |
| 35 | AiProxyController | `/api/ai` | AI 代理 |
| 36 | SystemMaintenanceController | `/api/system/maintenance` | 系统维护 |
| 37 | DiagnosticController | `/api/diagnostic` | 诊断检查 |
| 38 | InboundPurchaseOrderController | `/api/inboundPurchaseOrder` | 入库采购单 |

### 横切关注点

| 层级 | 组件 | 说明 |
|------|------|------|
| **AOP** | `@OperationLog` + `OperationLogAspect` | 自动记录操作日志（用户、类、方法、参数、耗时） |
| **事件** | `PurchaseOrderInboundEvent` | 入库采购单创建时发布 |
| | `PurchaseReceivedEvent` | 采购单收货时发布 |
| | `PurchaseLogisticsUpdatedEvent` | 物流信息更新时发布 |
| **监听器** | `PurchaseOrderInboundListener` | AFTER_COMMIT 异步创建入库单（3 次重试） |
| **定时任务** | `SystemMonitor` | 每 30s 检查 HikariCP 连接池和 Resilience4j 断路器 |
| | `DataIntegrityMonitorService` | 每小时检查数据完整性；每日凌晨 2 点清理无效快照 |
| **统一响应** | `ApiResponse<T>` | `{ code: 200, message: "success", data: ... }` |
| **安全** | `JwtAuthenticationFilter` | OncePerRequestFilter，解析 Bearer Token 或 query 参数 |
| | Redis 黑名单 | 登出时将 Token 加入黑名单 |

### 安全配置分析

`SecurityConfig.java` 的配置较为宽松：

- CORS 允许所有来源（带凭证）
- CSRF 已禁用
- Session 无状态（STATELESS）
- **大部分功能 API 为 `permitAll()`**：`/api/logistics/**`、`/api/purchase-orders/**`、`/api/suppliers/**`、`/api/products/**`、`/api/settlements/**` 等均为公开访问
- 仅 `anyRequest().authenticated()` 保护未被显式放行的路径
- 实际上认证是可选的，安全主要依赖网络层（内网部署）

---

## 四、核心业务模块详解

### 4.1 采购管理

**这是整个系统最核心、最复杂的模块。**

**涉及实体**: `PurchaseOrder` → `PurchaseOrderItem` → `InboundOrder` → `SettlementOrder`

**主服务**: `PurchaseOrderServiceImpl`（~1900 行）

#### 状态机

**采购单主状态**:
```
PENDING → CONFIRMED → SHIPPED → RECEIVED → PENDING_SETTLEMENT
                                                ↓
                                            CANCELLED
```

**发货状态**:
```
PENDING → TO_SHIP → SHIPPED → RECEIVED
```

#### 关键流程

| 操作 | 核心方法 | 业务逻辑 |
|------|---------|---------|
| **平台确认转采购** | `createFromPlatformConfirm()` | 区分成本方：`PLATFORM`（平台承担）vs `SUPPLIER`（供应商承担）。供应商承担时应付金额设为 0，立即标记已结算 |
| **通用采购单** | `createGeneralPurchaseOrder()` | 创建常规采购单，`PENDING` 状态起，立即捕获快照 |
| **入库采购单** | `generateInboundPurchaseOrder()` | 'C' 前缀单号；基于 SKU 的 Redis 分布式锁防幂等；自动创建关联 `InboundOrder`；发布 `PurchaseOrderInboundEvent`；设置 `BizType.INBOUND` |
| **发货（含物流）** | `shipWithLogisticsInfo()` | 运单号去重；自动创建 `PS` 前缀待处理配送结算单；更新发货状态为 `SHIPPED` |
| **修改物流信息** | `updateLogisticsInfo()` | 仅配送单仍为 `PENDING` 时可修改；若已收货则回退至已发货；发布 `PurchaseLogisticsUpdatedEvent` |
| **收货** | `receivePurchaseOrder()` | 手动确认收货；同步更新配送单状态为 `RECEIVED`；发布 `PurchaseReceivedEvent` |
| **自动收货** | `autoReceivePurchaseOrder()` | 基于物流签收事件异步触发；3 次重试（间隔 1s）；发送通知 |
| **成本调整** | `batchAdjustCost()` | 按供应商分组批量调价；创建已批准的调价单；更新采购单成本 |

#### 运单号去重规则（跨多个服务实现）

这是系统中最复杂的业务规则之一，在 `PurchaseOrderServiceImpl` 和 `DeliveryOrderImportServiceImpl` 中一致实现：

1. **运费继承规则**: 同一运单号，若已有采购单运费 > 0，新采购单**必须复制**历史物流信息（物流公司、配送员等），并将**运费设为 0**
2. **一致性校验**: 同一运单号多条记录的物流公司、配送员、电话、车牌号必须完全一致
3. **唯一收费原则**: **一个运单号仅允许一条采购单运费 > 0**，其余均为 0

---

### 4.2 供应商管理

**实体链**: `Supplier` → `SupplierAccount`（多银行账户）→ `SupplierFile`（资质文件）

**主服务**: `SupplierServiceImpl`

#### 关键设计

- **编号**: `GYS` + 7 位数字，Redis 自增生成
- **唯一约束**: `name` + `contactPhone` 组合唯一
- **结算类型**: `PREPAYMENT`（预付款）、`CASH`（现金）、`PERIOD`（账期）、`FISHERMAN`（渔民）
- **品牌多对多**: `syncBrands()` 增量同步关联关系
- **级联删除**: 清除 SKU 引用 → 删除供应商账户 → 删除品牌关联 → 删除供应商
- **预付款管理**: 余额追踪、预警阈值、流水日志、充值记录

---

### 4.3 结算财务管理

**核心服务**: `SettlementService`（~800 行，同时为接口和实现）

#### 结算类型

| 类型 | 单号前缀 | 说明 | 生成时机 |
|------|---------|------|---------|
| 采购商品结算 | `GS` | 商品货款的结算 | 采购单发货时自动生成 |
| 待处理配送结算 | `PS` | 运费的结算 | 运费 > 0 的发货自动生成 |
| 供应商结算单 | `JS` | 汇总的商品/物流结算 | 手动合并生成 |

#### 核心流程

```
采购发货 → 自动生成 GS（商品）+ PS（运费）
                ↓
    按供应商分组 → 创建 JS 结算单
                ↓
      付款（银行转账 / 预付款余额抵扣）
```

#### 税率计算

系统统一采用 **6% 增值税**：
```
netAmount = totalAmount / 1.06    （四舍五入保留 2 位小数）
taxAmount = totalAmount - netAmount
```

---

### 4.4 成本调整

**实体**: `CostAdjustmentSheet` → `CostAdjustmentItem`

**主服务**: `CostAdjustmentServiceImpl`

#### 状态流转

```
PENDING → APPROVED / REJECTED / REVOKED
```

#### 核心逻辑

| 操作 | 方法 | 说明 |
|------|------|------|
| 单条调价 | `createSingleAdjustment()` | 校验无待处理调价单（防重复）；计算单品差异和总差异 |
| 批量调价 | `batchAdjustWithValidation()` | 按供应商分组；验证单号存在/品名规格/原成本一致性 |
| 审批通过 | `approve()` | 更新采购单成本 → 同步库存批次成本 → 创建 `COST_ADJUSTMENT` 类型 StockFlow → 自动生成差额结算单 |
| 撤回 | `resetAdjustmentByPoNos()` | 恢复原成本 → 删除调价明细 → 清理空调价单 |

#### 库存成本联动（审批通过时）

```
approve(调价单)
  ├── 更新 PurchaseOrder.cost
  ├── syncCostForAdjustmentItem()
  │   ├── 更新 StockBatch.unitCost / totalCost（仅入仓类型）
  │   └── 创建 StockFlow（flowType = COST_ADJUSTMENT）
  └── createSettlementForAdjustment()
      └── 为差额自动创建 JS 结算单
```

---

### 4.5 物流管理

#### 三层物流模型

| 层级 | 实体 | 说明 |
|------|------|------|
| 快递公司 | `LogisticsCompany` | 种子数据，快递鸟支持的快递公司列表 |
| 物流供应商 | `LogisticsProvider` | 实际提供物流服务的供应商，含银行账户/资质文件 |
| 物流追踪 | `LogisticsTrack` | 单条运单的追踪记录 |

#### 快递鸟 API 集成（`KuaidiNiaoService`）

```
trackWithFallback(waybillNo, companyCode)
  ├── 8001 接口（指定物流商追踪）
  │   └── 有轨迹？ → 返回
  └── 无轨迹 → 8002 接口（自动识别物流商）
      └── 返回追踪数据
```

- 签名方式：MD5 + Base64
- 开发环境：生成模拟追踪数据用于测试
- 前端缓存：物流追踪结果在前端内存缓存 5 分钟

#### 发货导入（`DeliveryOrderImportServiceImpl`）

- 解析 Excel → 验证采购单号/供应商/商品/数量
- 快递鸟运单查询 → 自动匹配物流公司
- 运单号去重（与采购模块一致的规则）
- 运费 > 0 则创建 `PS` 配送结算单

---

### 4.6 仓储库存

**实体链**: `Warehouse` → `InboundOrder` → `StockBatch` → `StockFlow` → `OutboundOrder`

#### 核心流程

```
采购发货 → 入库单（InboundOrder）→ 库存批次（StockBatch）→ 销售 → 出库单（OutboundOrder）
                                       ↓
                                 库存流水（StockFlow）：记录每次变动
```

#### 关键逻辑

- **批次商品分配**（`batchDistributeProducts`）：跨仓库批量分配，验证商品状态 `ON_SHELF`，防重复分配，自动确定成本（用户输入 > SKU 成本），同时创建入库单 + 库存批次 + 库存流水
- **仓库删除级联**：删除批次 → 流水 → 入库单 → 出库单 → 采购单
- **仓库编号**: `WH` + 5 位数字

---

### 4.7 类别映射（AI 辅助）

**实体**: `SalesProject` → `ProjectCategory` + `CategoryMapping`

**主服务**: `CategoryMappingServiceImpl`（~850 行）

这是系统中**纯算法最复杂的业务逻辑**，实现旧系统品类向新系统品类的自动映射。

#### 多策略映射流程

```
Step 1: 关键词规则匹配（200+ 内置规则）
  └── 基于产品名称关键词 → 映射到目标 L3 品类
        ↓ 未匹配
Step 2: 名称相似度算法
  └── 字符二元组分析 + 中文语义支持
        ↓ 未匹配
Step 3: L2→L3 降级匹配
  └── 旧 L3 不匹配时，尝试旧 L2 名称与目标 L3 匹配
        ↓ 未匹配
Step 4: 兜底映射（FALLBACK_MAP，90+ 条目）
  └── 基于旧 L2/L1 名称 → 默认目标 L3
        ↓ 未匹配
Step 5: 语义修正（SEMANTIC_OVERRIDES，60+ 条目）
  └── 特定名称映射（如 "纯牛奶/豆奶" → "动/植物奶"）
```

#### AI 代理服务（`AiProxyService`）

支持多 LLM 供应商的统一代理：

| 供应商 | 接口风格 | 特点 |
|--------|---------|------|
| DeepSeek | `/chat/completions` | 禁用思考模式；`reasoning_content` → `content` 回退 |
| 通义千问 | OpenAI 兼容 | 标准接口 |
| GLM（智谱） | OpenAI 兼容 | Bearer 认证 |
| 豆包 | OpenAI 兼容 | 标准接口 |
| 文心一言 | 自定义接口 | 使用 `access_token` query 参数；从 `result` 字段提取 |
| 讯飞星火 | 自定义 JSON | `app_id` 作为 API key |

前端通过 `categoryMappingService` 直接调用 AI API 实现 AI 辅助分类；后端 `enhanceWithAi` 方法目前为空（预留扩展点）。

---

### 4.8 快照系统

**目的**: 为每次采购单变更创建不可变审计记录

#### 核心机制

| 特性 | 实现 |
|------|------|
| **存储格式** | 完整采购单 JSON 序列化 |
| **幂等性** | SHA-256 哈希，数据相同则跳过 |
| **版本链** | `is_latest` 标记，旧版本标记为 false |
| **冗余备份** | `LocalSnapshotStorageService` 文件系统备份 |
| **批量回填** | RabbitMQ 异步回填缺失快照 |
| **快照搜索** | 支持基于规范的条件查询 |
| **反序列化修复** | 自动清理遗留枚举字符串（如 `"bizType":"商品入库"` → `"INBOUND"`） |

---

### 4.9 数据完整性监控

**`DataIntegrityMonitorService`** — 每小时定时执行：

| 检查项 | 频率 | 内容 |
|--------|------|------|
| 采购单完整性 | 每小时 | 供应商/创建时间为空、金额为空 |
| 入库单完整性 | 每小时 | 孤儿入库单（缺失采购单/仓库）、单号格式 |
| 快照一致性 | 每小时 | 快照与实时采购单对比（主状态、金额） |
| 无效快照清理 | 每日凌晨 2 点 | 删除 `snapshot_data` 为空的快照 |

---

## 五、单号生成规范

| 类型 | 前缀 | 格式 | 生成方式 |
|------|------|------|---------|
| 采购单 | `C` | `C` + yyyyMMddHHmm + 3 位序列 | Redis 自增 + DB 唯一性校验 |
| 入库单 | `IN` | `IN` + yyyyMMdd + 时间桶 + 3 位序列 | Redis 自增 |
| 结算单 | `JS` | `JS` + yyyyMMddHHmm + 3 位序列 | Redis 自增 |
| 配送单 | `PS` | `PS` + yyyyMMddHHmmss + 3 位序列 | Redis 自增 |
| 商品结算 | `GS` | `GS` + yyyyMMddHHmmss + 3 位随机 | 代码生成 |
| 调价单 | `RC` | `RC` + yyMMdd + 2 位序列 | Redis 自增 |
| 退款单 | `T` | `T` + yyyyMMdd + 4 位序列 | DB 计数 + 1 |
| 供应商编号 | `GYS` | `GYS` + 7 位数字 | Redis 自增 |
| 仓库编号 | `WH` | `WH` + 5 位数字 | DB 最大 + 1 |
| 库存批次 | — | yyyyMMdd + 3 位序列 + 供应商名 | 按仓库/日期分组生成 |

---

## 六、前端架构

### 路由结构

```
/login                                          # 独立登录页

/supply-chain/                                  # 供应链管理
  ├── brand/                                    # 品牌 CRUD
  ├── supplier/                                 # 供应商 + 预付款 + 文件
  ├── logistics-provider/                       # 物流供应商
  ├── product-pool/                             # 商品池 + 新增
  ├── bundle/                                   # 组合商品
  ├── platform-confirm/                         # 平台确认单
  ├── purchase-order/                           # 采购单（列表/创建/详情/物流/入库创建）
  ├── price-adjustment/                         # 调价单
  ├── refund-order/                             # 退款单
  └── settlement/                               # 待结算/配送结算/供应商结算/详情

/supply-chain/                                  # 仓储管理（复用父路径）
  ├── warehouse/                                # 仓库 + 商品库存
  ├── inbound-order/                            # 入库单
  ├── outbound-order/                           # 出库单
  ├── stock-flow/                               # 库存流水
  └── inventory-report/                         # 库存报表

/ai-tools/                                      # AI 工具
  ├── ai-config/                                # AI 提供商配置
  └── category-mapping/                         # 分类映射（AI 辅助）
```

### 数据流

```
用户交互
  → React 本地状态（useState）
  → Service 层函数（services/*.ts）
  → Axios 实例（utils/request.ts）
     ├── 请求拦截器：注入 Authorization: Bearer <token>
     └── 响应拦截器：
         ├── 解包 ApiResponse（code === 200 → 返回 data）
         ├── 401 → 清除 token → 跳 /login
         ├── 500（GET）→ 最多 3 次重试（间隔 1s）
         └── 403/400 → 显示中文错误提示
  → Vite 代理转发 /api → http://localhost:8080
  → 组件重渲染
```

### 状态管理策略

| 存储方式 | 用途 |
|---------|------|
| React `useState` / `useReducer` | 页面本地状态（列表数据、筛选、加载态、弹窗） |
| Ant Design `<Form>` | 表单状态 |
| `localStorage` | JWT Token、用户信息、AI 配置 |
| 内存 `Map`（5 分钟 TTL） | 物流追踪结果缓存 |
| `useSearchHistory` Hook | 搜索历史（localStorage 持久化，最多 10 条） |

**无全局状态管理库**（如 Redux/Zustand），状态在各页面独立管理。

---

## 七、技术亮点与决策

1. **混合 ORM 策略**: JPA 主力（增删改查）+ MyBatis 辅助（复杂查询，如产品搜索的分词评分排序）

2. **事件驱动异步解耦**: 采购单关键节点通过 Spring Events + RabbitMQ 异步处理（入库单创建、ES 同步、快照回填），避免主流程阻塞

3. **弹性设计**: Resilience4j 为关键外部调用（采购单查询、税务 API）提供熔断+重试保护；快递鸟 8001→8002 自动降级

4. **多层幂等性保障**:
   - 入仓采购单：Redis 分布式锁（基于 SKU）
   - 快照：SHA-256 哈希去重
   - 自动收货：重试机制（3 次）

5. **单号生成**: Redis 自增序列 + DB 唯一性校验双重保障，避免分布式环境下的单号冲突

6. **可观测性**: Actuator 暴露完整监控端点；`SystemMonitor` 每 30s 主动检查连接池/断路器；`DataIntegrityMonitorService` 每小时数据一致性校验

7. **多 AI 供应商支持**: 统一的 AI 代理层抽象了 6 个 LLM 供应商的差异，前端透明调用

8. **快照审计**: 完整的采购单变更历史，支持任意时间点回溯和 SHA-256 防篡改

9. **前后端分离**: 服务层解耦，前端 Service 层统一管理 API 调用，拦截器集中处理认证/错误

---

## 八、风险点与解决方案

### 风险 1：Flyway + Hibernate ddl-auto:update 并存导致 Schema 漂移

**现状**: `application.yml` 中同时配置了 Flyway（`enabled: true`）和 `spring.jpa.hibernate.ddl-auto: update`。两套 Schema 管理机制共存，可能导致：
- 开发环境手动修改 Entity 后自动变更表结构，但未创建对应的 Flyway 迁移脚本
- 不同环境（dev/test/prod）的表结构不一致
- 生产环境若误开启 `ddl-auto: update` 可能导致意外 DDL 操作

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A（推荐）** | 生产/测试环境设置 `ddl-auto: validate`（仅校验不修改），开发环境保留 `update` 用于快速迭代，但要求所有 DDL 变更必须同步编写 Flyway 脚本 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 完全禁用 `ddl-auto`，所有 Schema 变更统一走 Flyway 迁移脚本；开发环境使用 `application-local.yml` 中的 `ddl-auto: update` 作为临时便利 | ⭐⭐⭐⭐ |
| **方案 C** | 在 CI 流水线中增加 Schema 一致性检查步骤：用 `ddl-auto: validate` 验证实体与数据库的一致性 | ⭐⭐⭐ |

**实施步骤（方案 A）**:
1. 在 `application.yml`（默认 profile）中将 `ddl-auto` 改为 `validate`
2. 在 `application-dev.yml` 和 `application-local.yml` 中保留 `update`
3. 制定团队规范：任何 Entity 变更必须同步编写 Flyway 迁移脚本才能合并
4. CI 中增加 Flyway 迁移脚本的存在性检查（根据 Entity diff）

---

### 风险 2：安全配置过于宽松

**现状**: `SecurityConfig.java` 中绝大多数功能 API 都通过 `.antMatchers().permitAll()` 放行，即使是 `/api/purchase-orders/**`、`/api/suppliers/**`、`/api/settlements/**` 等核心业务接口也不需要认证。JWT 认证机制已完善但未实际启用。

**风险影响**:
- 任何人只要能访问服务端口即可操作所有业务数据
- 无操作审计日志的用户关联（`@CreatedBy` 等 JPA Audit 无法获取真实用户）

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A（推荐，渐进式）** | 分阶段收紧权限：Phase 1 对写操作（POST/PUT/DELETE）要求认证，读操作（GET）保持公开；Phase 2 引入基于角色的权限控制（RBAC），按用户角色限制操作范围 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 立即对所有 `/api/**` 路径要求认证，仅放开 `/api/auth/**`、`/api/test/**`、Swagger UI、Actuator | ⭐⭐⭐⭐ |
| **方案 C** | 在前置 Nginx/API Gateway 层统一认证，后端保持当前配置作为深度防御 | ⭐⭐⭐ |

**实施步骤（方案 A — Phase 1）**:
```java
// SecurityConfig.java 修改建议
.antMatchers(HttpMethod.GET, "/api/**").permitAll()     // 读操作暂公开
.antMatchers(HttpMethod.POST, "/api/**").authenticated()
.antMatchers(HttpMethod.PUT, "/api/**").authenticated()
.antMatchers(HttpMethod.DELETE, "/api/**").authenticated()
.antMatchers("/api/auth/**").permitAll()
.anyRequest().authenticated()
```
- 同步更新前端：所有 API 调用确保携带 Token
- 增加前端路由守卫：未登录用户重定向到 `/login`

**后续（Phase 2）**:
- 在 `User` 实体中增加角色字段（如 `ADMIN`、`MANAGER`、`OPERATOR`、`VIEWER`）
- 使用 `@PreAuthorize` 或 `@Secured` 注解限制敏感操作
- 前端菜单按角色动态渲染

---

### 风险 3：前端无路由守卫，权限控制仅依赖 API 拦截器

**现状**: 未登录用户可以访问任何前端路由（如 `/supply-chain/purchase-order`），只有发起 API 请求时才会因 401 跳转登录页。已登录用户也无权限区分。

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A（推荐）** | 实现 `ProtectedRoute` 组件包裹需认证的路由，未登录时重定向至 `/login`；配合后端 RBAC 实现菜单权限过滤 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 在 `MainLayout` 的 `useEffect` 中检查 Token 有效性，无效则跳转 | ⭐⭐⭐ |

**实施示例**:
```tsx
// components/ProtectedRoute.tsx
const ProtectedRoute = ({ requiredRole, children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Result status="403" title="无访问权限" />;
  }
  return children;
};
```

---

### 风险 4：快照数据无限膨胀

**现状**: 每次采购单变更都生成完整 JSON 快照（含所有字段），存储在 `purchase_order_snapshots` 表和文件系统中。系统无快照过期或归档策略，长期运行后可能造成：
- 数据库表膨胀，查询性能下降
- 磁盘空间持续增长
- 备份/恢复时间增加

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A（推荐，分层存储）** | 近期快照（30 天内）保留在数据库；中期快照（30-90 天）仅保留文件系统备份；超过 90 天的快照归档至对象存储（如 MinIO/S3）或压缩后冷存储 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 对同一采购单的同一天内的多次变更，仅保留最新快照（去重合并） | ⭐⭐⭐⭐ |
| **方案 C** | 增加定时清理任务：保留最近 N 条快照 + 每个状态变更的关键快照（状态切换点的首条和末条），删除中间冗余快照 | ⭐⭐⭐ |

**实施步骤（方案 A）**:
1. 在 `DataIntegrityMonitorService` 中增加快照归档逻辑
2. 创建 `SnapshotArchiveService`：读取 30 天前的快照 → 导出为压缩 JSON → 存入对象存储 → 从数据库删除
3. 快照查询接口增加回退逻辑：数据库无结果 → 查询文件系统 → 查询对象存储
4. 配置归档策略参数化（可通过配置文件调整天数阈值）

---

### 风险 5：RabbitMQ 在本地/开发环境被禁用

**现状**: `application-dev.yml` 和 `application-local.yml` 中 RabbitMQ 自动配置被排除，相关的 Product ES 同步和快照回填功能在开发环境无法测试。

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A（推荐）** | 使用 `docker-compose.dev.yml` 中的 RabbitMQ 服务 + 条件注入：开发环境启用 RabbitMQ 但使用独立队列前缀（如 `dev.product.sync`），避免与生产环境消息混淆 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 为关键异步逻辑（ES 同步、快照回填）提供同步回退实现，开发环境自动切换为同步模式，生产环境使用异步 | ⭐⭐⭐⭐ |
| **方案 C** | 编写集成测试时使用 Testcontainers 启动 RabbitMQ 实例，确保异步逻辑有测试覆盖 | ⭐⭐⭐ |

**实施步骤（方案 A + B 结合）**:
```java
// 新增配置
@Configuration
@ConditionalOnProperty(name = "supplypro.messaging.async-enabled", havingValue = "true", matchIfMissing = true)
public class RabbitMQConfig {
    // 现有的 RabbitMQ 配置
}

// 同步回退
@Service
@ConditionalOnProperty(name = "supplypro.messaging.async-enabled", havingValue = "false")
public class SyncProductIndexService {
    // 直接在事务提交后同步索引到 ES
}
```
- `application-dev.yml` 中设置 `supplypro.messaging.async-enabled: true`（启用 RabbitMQ）
- `application-local.yml` 中设置 `false`（走同步模式）

---

### 风险 6：AI API Key 由前端直接传入

**现状**: `AiProxyController`（`POST /api/ai/proxy`）接收前端传入的 `apiKey`，然后转发到对应的 AI 供应商。这意味着：
- API Key 在前端 localStorage 中明文存储
- API Key 随请求在网络中传输
- 存在 API Key 泄露和滥用风险

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A（推荐，服务端配置）** | 将 AI API Key 移至后端配置文件或环境变量中管理，前端仅传递 `providerKey` 和业务参数，后端从配置中获取对应的 API Key。同时增加 API 调用频率限制 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 后端增加 API Key 加密存储（AES），前端仅传递加密后的 Key 标识符，后端解密后使用 | ⭐⭐⭐ |
| **方案 C** | 如果必须支持用户自定义 API Key（多租户场景），使用数据库加密字段存储，提供管理界面，前端仅传递 Key 的引用 ID | ⭐⭐⭐⭐ |

**实施步骤（方案 A）**:
```yaml
# application.yml
supplypro:
  ai:
    providers:
      deepseek:
        api-key: ${DEEPSEEK_API_KEY}
        base-url: https://api.deepseek.com
      qwen:
        api-key: ${QWEN_API_KEY}
        base-url: https://dashscope.aliyuncs.com
```
- 修改 `AiProxyService`：后端从配置读取 API Key
- 修改 `AiProxyController`：移除 `apiKey` 参数
- 前端 `AiConfig` 页面改为仅配置启用的供应商和模型，不暴露 Key
- 增加 `@RateLimiter` 或 Bucket4j 对 AI 代理接口限流

---

### 风险 7：测试覆盖不均衡

**现状**: JaCoCo 设置了 80% 行覆盖率阈值，但：
- 业务核心逻辑（如 `PurchaseOrderServiceImpl` ~1900 行、`SettlementService` ~800 行）的单元测试可能不足
- 异步逻辑（RabbitMQ 消费者、`@Async` 方法）在开发环境被跳过
- 前端 E2E 测试（Cypress）与单元测试（Vitest）的具体覆盖情况不清楚

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A** | 为关键业务路径编写契约测试/集成测试，而非单纯追求覆盖率数字。优先覆盖：采购单状态流转、结算计算、调价审批→库存同步、运单号去重规则 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 使用 Testcontainers 在测试中启动真实的 MySQL/Redis/RabbitMQ，确保集成测试覆盖异步逻辑 | ⭐⭐⭐⭐ |
| **方案 C** | JaCoCo 配置 `excludes` 排除简单的 Getter/Setter/常量类，将 80% 阈值集中在核心业务代码上 | ⭐⭐⭐ |

**建议的测试优先级**:

| 优先级 | 测试目标 | 类型 |
|--------|---------|------|
| P0 | 采购单状态机流转（PENDING→RECEIVED 全路径） | 集成测试 |
| P0 | 结算金额计算（含税费、成本调整） | 单元测试 |
| P0 | 运单号去重规则 | 单元测试 |
| P1 | 成本调整审批→库存同步 | 集成测试 |
| P1 | 类别映射策略链 | 单元测试 |
| P1 | 采购单号生成幂等性 | 集成测试 |
| P2 | RabbitMQ 消费者逻辑 | 集成测试 |
| P2 | 快递鸟 API 降级逻辑 | 单元测试（Mock） |

---

### 风险 8：Flyway Baseline 版本跳跃

**现状**: `application.yml` 中设置 `flyway.baseline-version: 5.100`，意味着所有 V1.x～V5.x 迁移脚本不会在新环境执行。这依赖数据库已通过这些迁移初始化。

**风险**: 全新环境部署时，若数据库为空，Flyway 会将 V5.100 作为基线，**跳过所有 V1～V5 的建表和数据初始化脚本**，导致表结构缺失。

**建议方案**:

| 方案 | 说明 | 推荐度 |
|------|------|--------|
| **方案 A（推荐）** | 提供一份完整的初始化 SQL dump（基于当前生产 Schema），新环境部署时先导入 dump 再启动应用；同时保留 baseline-version 作为已有环境的升级保护 | ⭐⭐⭐⭐⭐ |
| **方案 B** | 移除 baseline-version，让 Flyway 从头执行所有迁移脚本（需要确保 V1～V5 的脚本在新版 MySQL 上仍可正常执行） | ⭐⭐⭐ |
| **方案 C** | 在 `scripts/` 目录下维护一个 `init-db.sql`，包含完整的最新 DDL + 种子数据，`setup-env.ps1/sh` 脚本自动执行 | ⭐⭐⭐⭐ |

**实施步骤（方案 A + C 结合）**:
```bash
# 从现有环境导出 Schema + 种子数据（不含业务数据）
mysqldump -u root -p --no-data supplypro > scripts/schema.sql
mysqldump -u root -p supplypro \
  --tables banks logistics_companies product_categories tax_categories \
  --no-create-info > scripts/seed.sql

# setup-env.sh 中增加
mysql -u root -p supplypro < scripts/schema.sql
mysql -u root -p supplypro < scripts/seed.sql
```

---

### 风险总结与优先级矩阵

| 风险 | 影响 | 概率 | 优先级 | 建议实施时间 |
|------|------|------|--------|------------|
| **Flyway + ddl-auto 并存** | 高 — 生产 Schema 漂移 | 中 | P0 | 1-2 周 |
| **安全配置宽松** | 高 — 数据泄露/越权操作 | 中 | P0 | 2-4 周 |
| **AI API Key 暴露** | 高 — Key 泄露/费用滥用 | 中 | P0 | 1 周 |
| **快照数据膨胀** | 中 — 性能下降 | 高（随时间增长） | P1 | 2-4 周 |
| **Flyway Baseline 跳跃** | 高 — 新环境无法启动 | 低 | P1 | 1 周 |
| **RabbitMQ 开发环境禁用** | 中 — 异步逻辑无法测试 | 中 | P2 | 按需 |
| **前端无路由守卫** | 低 — 用户可访问未授权页面 | 高 | P2 | 随安全方案实施 |
| **测试覆盖不均衡** | 中 — 回归风险 | 中 | P2 | 持续改进 |

---

> **文档维护说明**: 本文档基于 2026-06-01 的 master 分支代码分析生成。建议在重大架构变更后更新本文档，或至少每季度重新审视一次。
