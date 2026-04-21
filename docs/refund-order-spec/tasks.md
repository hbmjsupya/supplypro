# 退款单功能 - 开发任务清单

## 阶段一：后端基础

- [ ] T1: 创建 RefundOrder 实体（含枚举：BizType、RefundType、Bearer、Status）
- [ ] T2: 创建 RefundOrderRepository
- [ ] T3: 创建 RefundOrderService（创建、查询、确认收货等业务逻辑）
- [ ] T4: 创建 RefundOrderController（REST API）
- [ ] T5: 创建数据库迁移脚本（refund_orders表）
- [ ] T6: StockFlow.FlowType 新增 RETURN_IN 枚举值

## 阶段二：前端页面

- [ ] T7: 创建 RefundOrderList 页面（列表、搜索、筛选、操作）
- [ ] T8: 创建 RefundOrderDetail 页面（单号信息、基本信息、退款信息、物流信息、审批信息）
- [ ] T9: 配置前端路由（App.tsx）

## 阶段三：业务逻辑

- [ ] T10: 仅退款自动完成逻辑（推送后自动COMPLETED + 采购单PENDING→CANCELLED）
- [ ] T11: 确认收货逻辑 - 供应商承担+采购单（退款金额记入待结算列表）
- [ ] T12: 确认收货逻辑 - 平台承担/出库单（创建退货入库单 + StockFlow）
- [ ] T13: 待结算列表集成（退款单作为采购单子项展示）

## 阶段四：关联展示

- [ ] T14: 采购单详情页展示退款信息（费用信息中增加供应商退款字段）
- [ ] T15: 出库单详情页展示退款信息
