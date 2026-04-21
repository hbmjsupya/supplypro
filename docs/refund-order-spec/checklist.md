# 退款单功能 - 验收检查清单

## 数据模型

- [ ] RefundOrder 实体字段完整，包含所有业务字段
- [ ] 退款单号生成规则正确（T+yyyyMMdd+4位序号）
- [ ] 状态枚举完整（PENDING/RETURNING/RECEIVED/COMPLETED/CANCELLED）
- [ ] BizType枚举（PURCHASE/OUTBOUND）、RefundType枚举（REFUND_ONLY/REFUND_RETURN）、Bearer枚举（SUPPLIER/PLATFORM）
- [ ] 数据库索引正确（platform_order、related_order、status、biz_type）

## API功能

- [ ] GET /api/refund-orders 列表分页查询正常
- [ ] GET /api/refund-orders 支持搜索筛选（退款单号、关联业务单号、运营退款单号、退款类型、承担方、状态）
- [ ] GET /api/refund-orders/{id} 详情查询正常
- [ ] POST /api/refund-orders 创建退款单正常
- [ ] PUT /api/refund-orders/{id}/confirm-receipt 确认收货正常
- [ ] GET /api/refund-orders/by-related/{orderNo} 关联查询正常

## 业务逻辑

- [ ] 仅退款+供应商承担：推送后自动COMPLETED
- [ ] 仅退款+供应商承担+采购单PENDING：采购单状态变更为CANCELLED
- [ ] 仅退款+供应商承担+采购单已结算：退款金额记入待结算列表
- [ ] 退款退货：创建后状态为PENDING
- [ ] 退款退货+有物流信息：状态为RETURNING
- [ ] 退款退货+确认收货：状态RECEIVED→COMPLETED
- [ ] 供应商承担+退款退货+确认收货：退款金额记入待结算列表
- [ ] 平台承担+退款退货+确认收货：创建退货入库单+StockFlow
- [ ] 出库单+退款退货+确认收货：创建退货入库单+StockFlow
- [ ] 退款金额不参与采购单成本计算

## 前端页面

- [ ] 退款单列表页展示正确（退款单号、关联业务单号、运营退款单号、商品规格、数量、退款金额、退款类型、承担方、状态、创建时间）
- [ ] 列表搜索筛选功能正常
- [ ] 列表操作菜单正常（查看详情、确认收货）
- [ ] 退款单详情页展示正确（单号信息、基本信息、退款信息、物流信息、审批信息）
- [ ] 确认收货按钮仅在退款退货+RETURNING状态显示
- [ ] 采购单详情页展示退款信息
- [ ] 出库单详情页展示退款信息
- [ ] 路由配置正确

## 回归测试

- [ ] 现有采购单功能正常
- [ ] 现有出库单功能正常
- [ ] 现有待结算列表功能正常
- [ ] 现有入库单功能正常
- [ ] 现有StockFlow功能正常
