# 退款单功能 - 技术规格说明

## 1. 概述

为SupplyPro项目新增退款单功能，管理运营平台推送的退款信息，与采购单/出库单建立映射关系，支持退款退货的物流跟踪和确认收货流程。

## 2. 技术架构

- **后端**：Spring Boot + JPA + MySQL
- **前端**：React + TypeScript + Ant Design
- **实体复用**：复用现有 StockFlow、InboundOrder 等实体

## 3. 数据模型

### 3.1 RefundOrder 实体

**表名**：`refund_orders`

| 字段 | Java类型 | 列定义 | 说明 |
|------|---------|--------|------|
| id | Long | BIGINT AUTO_INCREMENT PK | 主键 |
| refundNo | String | VARCHAR(30) NOT NULL UNIQUE | 退款单号 T+yyyyMMdd+4位序号 |
| platformRefundNo | String | VARCHAR(50) | 运营平台退款单号 |
| platformOrderNo | String | VARCHAR(50) | 运营平台订单号 |
| platformSubOrderNo | String | VARCHAR(50) | 运营平台子订单号 |
| bizType | BizType(PURCHASE/OUTBOUND) | VARCHAR(20) NOT NULL | 关联业务类型 |
| relatedOrderNo | String | VARCHAR(50) | 关联项目业务单号 |
| relatedOrderId | Long | BIGINT | 关联项目业务单ID |
| refundType | RefundType(REFUND_ONLY/REFUND_RETURN) | VARCHAR(20) NOT NULL | 退款类型 |
| bearer | Bearer(SUPPLIER/PLATFORM) | VARCHAR(20) NOT NULL | 承担方 |
| status | Status(PENDING/RETURNING/RECEIVED/COMPLETED/CANCELLED) | VARCHAR(20) NOT NULL DEFAULT 'PENDING' | 状态 |
| applicant | String | VARCHAR(100) | 申请人 |
| refundAmount | BigDecimal | DECIMAL(19,2) NOT NULL | 退款金额 |
| productId | Long | BIGINT | 商品ID |
| productName | String | VARCHAR(200) | 商品名称 |
| skuId | Long | BIGINT | SKU ID |
| specName | String | VARCHAR(100) | 规格名称 |
| quantity | Integer | INT | 退款数量 |
| unitPrice | BigDecimal | DECIMAL(10,2) | 退款单价 |
| returnAddress | String | VARCHAR(500) | 退货地址 |
| returnConsignee | String | VARCHAR(100) | 退货收货人 |
| returnPhone | String | VARCHAR(20) | 退货电话 |
| logisticsCompany | String | VARCHAR(100) | 物流公司 |
| trackingNo | String | VARCHAR(100) | 运单号 |
| logisticsShippedAt | LocalDateTime | DATETIME | 物流发货时间 |
| confirmReceivedBy | String | VARCHAR(100) | 确认收货人 |
| confirmReceivedAt | LocalDateTime | DATETIME | 确认收货时间 |
| approvalRemark | String | VARCHAR(500) | 审批备注 |
| approvalTime | LocalDateTime | DATETIME | 审批时间 |
| remark | String | VARCHAR(500) | 备注 |
| createdBy | String | VARCHAR(100) | 创建人 |
| createdAt | LocalDateTime | DATETIME NOT NULL | 创建时间 |
| updatedAt | LocalDateTime | DATETIME | 更新时间 |

### 3.2 状态流转

```
仅退款 + 供应商承担：推送后自动 → COMPLETED
退款退货 + 供应商/平台承担：PENDING → RETURNING → RECEIVED → COMPLETED
```

## 4. API设计

### 4.1 退款单API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/refund-orders` | 列表（分页，支持搜索筛选） |
| GET | `/api/refund-orders/{id}` | 详情 |
| POST | `/api/refund-orders` | 创建（运营平台推送） |
| PUT | `/api/refund-orders/{id}/confirm-receipt` | 确认收货 |
| GET | `/api/refund-orders/by-related/{orderNo}` | 根据关联单号查询 |

### 4.2 扩展API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/purchase-orders/{id}/refunds` | 采购单关联退款单 |
| GET | `/api/outbound-orders/{id}/refunds` | 出库单关联退款单 |

## 5. 业务逻辑

### 5.1 创建退款单
1. 根据 platformOrderNo + platformSubOrderNo 查找关联采购单/出库单
2. 生成退款单号
3. 仅退款+供应商承担：自动COMPLETED + 采购单PENDING→CANCELLED
4. 退款退货：PENDING，等待物流和确认收货

### 5.2 确认收货
1. 退款单状态 RECEIVED → COMPLETED
2. 供应商承担+采购单：退款金额记入待结算列表
3. 平台承担/出库单：创建退货入库单 + StockFlow

## 6. 前端路由

| 路径 | 组件 |
|------|------|
| `/supply-chain/refund-order` | RefundOrderList |
| `/supply-chain/refund-order/detail/:id` | RefundOrderDetail |

## 7. 数据库变更

- 新增 `refund_orders` 表
- StockFlow.FlowType 新增 `RETURN_IN`
