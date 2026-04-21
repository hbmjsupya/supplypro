# 采购单状态颜色映射配置文档

本文档记录了系统中所有采购单相关状态（订单状态、发货状态、结算状态等）的颜色配置映射关系，供后续前端组件开发及视觉走查参考。此颜色配置确保了从页面筛选器（数量角标）到数据列表（状态标签）等各处的视觉统一。

该配置通过 `src/utils/statusMapping.ts` 中的 `StatusColorMap` 进行统一定义和分发。

## 1. 采购单状态 (Order Status)

| 状态标识 (Status Key) | 中文标签 | 颜色值 (Color) |
| :--- | :--- | :--- |
| `PENDING` | 待处理 | `orange` |
| `CONFIRMED` / `TOSHIP` | 待发货 | `#13c2c2` |
| `TO_SHIP` | 待发货 | `#13c2c2` |
| `SHIPPED` | 已发货 | `blue` |
| `RECEIVED` | 已收货 | `purple` |
| `COMPLETED` | 已完成 | `green` |
| `CANCELLED` | 已取消 | `red` |
| `INBOUNDGENERATED` | 已生成入库单 | `geekblue` |
| `PENDING_SETTLEMENT` | 待结算 | `geekblue` |
| `SETTLED` | 已结算 | `green` |

## 2. 发货/收货状态 (Shipping/Receiving Status)

> 注：为了防止与采购单状态的 key 冲突，部分特定的发货状态采用了前缀标识，或者复用上述基础状态的颜色。

| 状态标识 | 中文标签 | 颜色值 (Color) |
| :--- | :--- | :--- |
| `PENDING` / `SHIPPING_PENDING` | 未发货 / 待处理 | `default` |
| `TO_SHIP` / `SHIPPING_TO_SHIP` | 待发货 | `orange` |
| `SHIPPED` | 已发货 | `blue` |
| `RECEIVED` | 已收货 | `green` |
| `DELIVERED` | 已送达 | `green` |

## 3. 结算状态 (Settlement Status)

| 状态标识 | 中文标签 | 颜色值 (Color) |
| :--- | :--- | :--- |
| `UNSETTLED` | 未结算 | `red` |
| `PARTIALLY_SETTLED` | 部分结算 | `orange` |
| `SETTLED` | 已结算 | `green` |

## 4. 审批状态 (Audit Status)

| 状态标识 | 中文标签 | 颜色值 (Color) |
| :--- | :--- | :--- |
| `PENDING` | 待审批 | `blue` |
| `APPROVED` | 已通过 | `green` |
| `REJECTED` | 已拒绝 | `red` |
| `PAID` | 已支付 | `green` |

## 5. 物流轨迹状态 (Logistics Status)

| 状态标识 | 中文标签 | 颜色值 (Color) | AntD 语义色 |
| :--- | :--- | :--- | :--- |
| `0` / `LOGISTICS_0` | 无轨迹 | `default` | 默认 |
| `1` / `LOGISTICS_1` | 已揽收 | `processing` | 蓝 |
| `2` / `LOGISTICS_2` | 在途中 | `processing` | 蓝 |
| `3` / `LOGISTICS_3` | 已签收 | `success` | 绿 |
| `4` / `LOGISTICS_4` | 问题件 | `error` | 红 |

## 如何使用

在前端组件中，统一使用 `getStatusColor(status, type)` 方法获取对应的颜色值：

```typescript
import { getStatusColor, getStatusText } from '@/utils/statusMapping';

// 获取采购单状态的颜色 (默认 type = 'order')
const color = getStatusColor('PENDING'); // 返回 'orange'

// 获取带有对应颜色的 Tag 组件
<Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
```
