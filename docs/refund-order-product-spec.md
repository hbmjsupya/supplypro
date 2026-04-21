# 退款单功能产品方案

## 一、功能概述

### 1.1 背景
运营平台在处理售后退款时，需将退款信息推送至本项目（SupplyPro），本项目需建立退款单来管理退款流程，并与现有的采购单、出库单建立关联关系。

### 1.2 核心目标
- 建立独立的退款单实体，记录运营平台推送的退款信息
- 退款单与采购单/出库单建立映射关系
- 根据退款类型和承担方执行不同的业务逻辑
- 支持退款退货的物流跟踪和确认收货流程

### 1.3 不处理场景
- 运营平台退款类型为"仅退款"且承担方为"平台"的退款单**不推送至本项目**，故无需处理

### 1.4 前提条件
- 运营平台推送的退款单**默认已审批完成**，本项目无需审批流程
- 仅退款类型的退款单推送后**自动完成**，无需手动执行退款操作

---

## 二、数据模型设计

### 2.1 RefundOrder 实体（退款单）

**表名**：`refund_orders`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Long | 主键 |
| `refundNo` | String(30) unique | 退款单号，格式：T+yyyyMMdd+4位顺序号（如T202604140001） |
| `platformRefundNo` | String(50) | 运营平台退款单号 |
| `platformOrderNo` | String(50) | 运营平台订单号（用于关联查找，不在列表展示） |
| `platformSubOrderNo` | String(50) | 运营平台子订单号（用于关联查找，不在列表展示） |
| `bizType` | Enum | 关联业务类型：`PURCHASE`（采购单）/ `OUTBOUND`（出库单） |
| `relatedOrderNo` | String(50) | 关联项目业务单号（采购单号或出库单号） |
| `relatedOrderId` | Long | 关联项目业务单ID |
| `refundType` | Enum | 退款类型：`REFUND_ONLY`（仅退款）/ `REFUND_RETURN`（退款退货） |
| `bearer` | Enum | 承担方：`SUPPLIER`（供应商）/ `PLATFORM`（平台） |
| `status` | Enum | 退款单状态（见2.2） |
| `applicant` | String(100) | 申请人（运营平台推送） |
| `refundAmount` | BigDecimal(19,2) | 退款金额 |
| `productId` | Long | 退款商品ID |
| `productName` | String(200) | 退款商品名称 |
| `skuId` | Long | 退款SKU ID |
| `specName` | String(100) | 退款商品规格名称 |
| `quantity` | Integer | 退款数量 |
| `unitPrice` | BigDecimal(10,2) | 退款单价 |
| `returnAddress` | String(500) | 退货地址（退款退货时） |
| `returnConsignee` | String(100) | 退货收货人（退款退货时） |
| `returnPhone` | String(20) | 退货联系电话（退款退货时） |
| `logisticsCompany` | String(100) | 退货物流公司 |
| `trackingNo` | String(100) | 退货物流运单号 |
| `logisticsShippedAt` | LocalDateTime | 退货物流发货时间 |
| `confirmReceivedBy` | String(100) | 确认收货人 |
| `confirmReceivedAt` | LocalDateTime | 确认收货时间 |
| `approvalRemark` | String(500) | 审批备注（运营平台推送） |
| `approvalTime` | LocalDateTime | 审批时间（运营平台推送） |
| `remark` | String(500) | 备注 |
| `createdBy` | String(100) | 创建人 |
| `createdAt` | LocalDateTime | 创建时间 |
| `updatedAt` | LocalDateTime | 更新时间 |

### 2.2 退款单状态枚举

| 状态 | 中文 | 说明 |
|------|------|------|
| `PENDING` | 待处理 | 退款退货类型，等待退货物流信息 |
| `RETURNING` | 退货中 | 退款退货类型，物流在途 |
| `RECEIVED` | 已收货 | 退款退货类型，已确认收货 |
| `COMPLETED` | 已完成 | 退款完成（仅退款自动完成，或退款退货确认收货后完成） |
| `CANCELLED` | 已取消 | 退款取消 |

### 2.3 状态流转图

```
仅退款（REFUND_ONLY）+ 供应商承担：
  推送后自动 → COMPLETED

仅退款（REFUND_ONLY）+ 平台承担：
  不推送至本项目（无需处理）

退款退货（REFUND_RETURN）+ 供应商承担：
  PENDING → RETURNING → RECEIVED → COMPLETED

退款退货（REFUND_RETURN）+ 平台承担：
  PENDING → RETURNING → RECEIVED → COMPLETED
```

---

## 三、退款单列表页

### 3.1 页面路径
`/supply-chain/refund-order`

### 3.2 列表字段

| 列名 | 字段 | 说明 |
|------|------|------|
| 退款单号 | refundNo | T+yyyyMMdd+4位序号 |
| 关联业务单号 | relatedOrderNo | 采购单号或出库单号 |
| 运营退款单号 | platformRefundNo | 运营平台退款单号 |
| 商品规格 | specName | 退款商品规格名称 |
| 数量 | quantity | 退款数量 |
| 退款金额 | refundAmount | 退款金额 |
| 退款类型 | refundType | 仅退款/退款退货 |
| 承担方 | bearer | 供应商/平台 |
| 状态 | status | 退款单状态 |
| 创建时间 | createdAt | 退款单创建时间 |

### 3.3 搜索与筛选
- 退款单号（模糊搜索）
- 关联业务单号（精确搜索）
- 运营退款单号（精确搜索）
- 退款类型（下拉筛选）
- 承担方（下拉筛选）
- 状态（下拉筛选）

### 3.4 操作列（Dropdown菜单）
- **查看详情**：所有状态可见
- **确认收货**：仅退款退货且状态为RETURNING时可见

---

## 四、退款单详情页

### 4.1 页面路径
`/supply-chain/refund-order/detail/:id`

### 4.2 页面结构

#### 4.2.1 单号信息卡片

| 字段 | 说明 |
|------|------|
| 退款单号 | T+yyyyMMdd+4位序号 |
| 关联业务单号 | 采购单号或出库单号（可点击跳转） |
| 运营订单号 | 运营平台订单号 |
| 运营子订单号 | 运营平台子订单号 |
| 运营退款单号 | 运营平台退款单号 |

#### 4.2.2 基本信息卡片

| 字段 | 说明 |
|------|------|
| 申请人 | 运营平台推送的申请人 |
| 退款类型 | 仅退款/退款退货 |
| 承担方 | 供应商/平台 |
| 退货地址 | 退款退货时展示（收货人+电话+地址） |

#### 4.2.3 退款信息卡片

| 字段 | 说明 |
|------|------|
| 商品名称 | 退款商品名称 |
| 商品规格 | 退款商品规格 |
| 退款数量 | 退款数量 |
| 退款单价 | 退款单价 |
| 退款金额 | 退款金额 |

#### 4.2.4 物流信息卡片（退款退货时展示）

| 字段 | 说明 |
|------|------|
| 物流公司 | 退货物流公司 |
| 运单号 | 退货物流运单号 |
| 发货时间 | 退货物流发货时间 |

#### 4.2.5 审批信息卡片

| 字段 | 说明 |
|------|------|
| 审批状态 | 已通过（运营平台推送时默认已审批） |
| 审批备注 | 审批备注信息 |
| 审批时间 | 审批通过时间 |

#### 4.2.6 操作按钮
- **确认收货**：退款退货且状态为RETURNING时显示
- **返回列表**

---

## 五、业务逻辑详细设计

### 5.1 退款单创建（运营平台推送）

**触发方式**：运营平台通过API推送退款信息

**创建逻辑**：
1. 根据运营平台订单号和子订单号，查找关联的采购单或出库单
2. 生成退款单号（T+yyyyMMdd+4位序号）
3. 创建退款单记录，关联对应的采购单/出库单
4. 根据退款类型和承担方执行不同的后续逻辑

**关联关系查找逻辑**：
- 通过 `platformOrderNo` + `platformSubOrderNo` 在 `PurchaseOrder` 表中查找
- 如果找到采购单，`bizType = PURCHASE`，`relatedOrderNo = purchaseOrder.orderNo`
- 如果未找到采购单，在 `OutboundOrder` 中查找（通过 `sourceRefNo` 关联平台订单号）
- 如果找到出库单，`bizType = OUTBOUND`，`relatedOrderNo = outboundOrder.outboundNo`

### 5.2 供应商承担 + 仅退款 + 关联采购单

**业务场景**：运营平台退款，供应商承担退款金额，仅退款不退货

**处理逻辑（推送后自动完成）**：
1. 创建退款单
2. 检查关联采购单状态：
   - **采购单状态为PENDING（待处理）**：将采购单状态变更为 `CANCELLED`（已取消）
   - **采购单已进入待结算列表**（status != PENDING && status != CANCELLED）：将退款金额记入待结算采购单列表（作为负数项）
3. 退款单状态直接变更为 `COMPLETED`
4. 在采购单详情的费用信息中，供应商退款处展示退款金额
5. 退款金额不参与采购单成本计算

### 5.3 供应商承担 + 退款退货 + 关联采购单

**业务场景**：运营平台退款退货，供应商承担退款金额，需退货

**处理逻辑**：
1. 创建退款单，状态为 `PENDING`
2. 如有退货物流信息，状态变更为 `RETURNING`
3. 用户确认收货后：
   - 退款单状态变更为 `RECEIVED` → `COMPLETED`
   - 将退款金额记入待结算采购单列表（作为负数项）
   - 通知运营平台执行退款操作
4. 在采购单详情的费用信息中，供应商退款处展示退款金额
5. 退款金额不参与采购单成本计算

### 5.4 平台承担 + 退款退货 + 关联采购单

**业务场景**：运营平台退款退货，平台承担退款金额，需退货

**处理逻辑**：
1. 创建退款单，状态为 `PENDING`
2. 如有退货物流信息，状态变更为 `RETURNING`
3. 用户确认收货后：
   - 退款单状态变更为 `RECEIVED` → `COMPLETED`
   - 新增一条入库类型为"商品退货"的入库单
   - 增加一条分仓商品变动记录（StockFlow，类型为 `RETURN_IN`）

### 5.5 退款退货 + 关联出库单

**业务场景**：退款退货关联的是出库单

**处理逻辑**：
1. 创建退款单，状态为 `PENDING`
2. 如有退货物流信息，状态变更为 `RETURNING`
3. 用户确认收货后：
   - 退款单状态变更为 `RECEIVED` → `COMPLETED`
   - 新增一条入库类型为"商品退货"的入库单
   - 增加一条分仓商品变动记录（StockFlow，类型为 `RETURN_IN`）

### 5.6 采购单/出库单详情页展示退款信息

**采购单详情页**：
- 在费用信息部分增加"供应商退款"字段
- 展示关联退款单的退款金额
- 退款金额不参与采购单成本计算（即不减少totalAmount）
- 可点击退款单号跳转至退款详情页

**出库单详情页**：
- 增加退款信息展示区域
- 展示关联退款单的基本信息和退款金额
- 可点击退款单号跳转至退款详情页

---

## 六、待结算列表集成

### 6.1 退款单进入待结算列表的条件
- 退款单承担方为供应商
- 退款单关联的是采购单
- 退款单状态为COMPLETED

### 6.2 待结算列表展示
- 在现有待结算采购单列表中，退款单作为采购单的子项展示
- 业务类型标记为"退款单"
- 金额为负数（表示扣减）
- 与采购单金额合并计算结算总额

---

## 七、API设计

### 7.1 退款单API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/refund-orders` | 退款单列表（分页） |
| GET | `/api/refund-orders/{id}` | 退款单详情 |
| POST | `/api/refund-orders` | 创建退款单（运营平台推送） |
| PUT | `/api/refund-orders/{id}/confirm-receipt` | 确认收货 |
| GET | `/api/refund-orders/by-related/{orderNo}` | 根据关联单号查询退款单 |

### 7.2 采购单API扩展

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/purchase-orders/{id}/refunds` | 查询采购单关联的退款单列表 |

### 7.3 出库单API扩展

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/outbound-orders/{id}/refunds` | 查询出库单关联的退款单列表 |

---

## 八、前端路由设计

| 路径 | 组件 | 说明 |
|------|------|------|
| `/supply-chain/refund-order` | RefundOrderList | 退款单列表页 |
| `/supply-chain/refund-order/detail/:id` | RefundOrderDetail | 退款单详情页 |

---

## 九、数据库变更

### 9.1 新增表

```sql
CREATE TABLE refund_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    refund_no VARCHAR(30) NOT NULL UNIQUE,
    platform_refund_no VARCHAR(50),
    platform_order_no VARCHAR(50),
    platform_sub_order_no VARCHAR(50),
    biz_type VARCHAR(20) NOT NULL,
    related_order_no VARCHAR(50),
    related_order_id BIGINT,
    refund_type VARCHAR(20) NOT NULL,
    bearer VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    applicant VARCHAR(100),
    refund_amount DECIMAL(19,2) NOT NULL,
    product_id BIGINT,
    product_name VARCHAR(200),
    sku_id BIGINT,
    spec_name VARCHAR(100),
    quantity INT,
    unit_price DECIMAL(10,2),
    return_address VARCHAR(500),
    return_consignee VARCHAR(100),
    return_phone VARCHAR(20),
    logistics_company VARCHAR(100),
    tracking_no VARCHAR(100),
    logistics_shipped_at DATETIME,
    confirm_received_by VARCHAR(100),
    confirm_received_at DATETIME,
    approval_remark VARCHAR(500),
    approval_time DATETIME,
    remark VARCHAR(500),
    created_by VARCHAR(100),
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    INDEX idx_platform_order (platform_order_no, platform_sub_order_no),
    INDEX idx_related_order (related_order_no),
    INDEX idx_status (status),
    INDEX idx_biz_type (biz_type)
);
```

### 9.2 StockFlow.FlowType 枚举扩展

新增枚举值：`RETURN_IN`（退货入库）

---

## 十、开发任务拆解

### 阶段一：后端基础
1. 创建 RefundOrder 实体及 Repository
2. 创建 RefundOrderController（CRUD API）
3. 创建 RefundOrderService（业务逻辑）
4. 数据库迁移脚本

### 阶段二：前端页面
5. 创建退款单列表页 RefundOrderList
6. 创建退款单详情页 RefundOrderDetail
7. 配置前端路由

### 阶段三：业务逻辑
8. 仅退款自动完成逻辑（推送后自动COMPLETED + 采购单状态变更）
9. 确认收货逻辑（退款退货 → 入库单 + StockFlow）
10. 待结算列表集成（退款单作为采购单子项）

### 阶段四：关联展示
11. 采购单详情页展示退款信息
12. 出库单详情页展示退款信息

---

## 十一、风险与注意事项

1. **退款单号生成并发安全**：需确保T+yyyyMMdd+4位序号的生成不会重复，建议使用数据库序列或分布式ID
2. **采购单状态变更**：将PENDING状态的采购单变更为CANCELLED时，需检查是否有关联的入库单
3. **退款金额不参与成本计算**：需确保在采购单详情和结算计算中，退款金额仅作展示，不影响成本合计
4. **退货入库**：创建退货入库单时，需同时创建StockBatch和StockFlow记录
5. **运营平台推送接口**：需确认推送的数据格式和字段映射关系
6. **仅退款自动完成**：推送后无需人工操作，系统自动处理状态变更和采购单关联逻辑
