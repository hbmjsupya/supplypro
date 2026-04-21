# 搜索区域布局一致性验收报告

## 1. 概述
为提升用户体验的一致性，本项目对所有列表页面的搜索功能区域进行了标准化重构。重构基于 `SupplierSettlementList` 的设计规范，统一了布局结构、样式和交互行为。

## 2. 核心标准
所有搜索区域均采用公共组件 `<SearchFormLayout>` 实现，具备以下特征：

*   **容器样式**: 白色背景卡片 (`Card`)，圆角 8px，内边距 16px。
*   **网格布局**: CSS Grid 自适应布局 (`grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`)，确保在 PC、平板、移动端均能完美展示。
*   **对齐方式**: 表单项底部对齐 (`align-items: end`)，行间距 16px，列间距 24px。
*   **操作区域**: 位于表单下方，右对齐，带有顶部灰色分割线。按钮顺序统一为 [扩展按钮] [重置] [查询]。

## 3. 整改清单
以下 16 个页面已完成全面排查与整改：

### 结算模块
- [x] SupplierSettlementList (基准)
- [x] PendingDeliverySettlementList (修复：移除嵌套 Card，统一布局)
- [x] PendingSettlementList (修复：替换 Inline Form)

### 采购模块
- [x] PurchaseOrderList (修复：替换手动 Grid)
- [x] PlatformConfirmList (修复：替换 Inline Form，统一 Toolbar)

### 仓库模块
- [x] InboundOrderList (修复：替换手动 Grid，移除旧样式)
- [x] OutboundOrderList (修复：替换 Inline Form)
- [x] StockFlowList (修复：替换 Inline Form，分离 Export 按钮)
- [x] WarehouseProductList (修复：替换 Inline Form)
- [x] WarehouseList (修复：重构 WarehouseSearch 组件，支持保存方案)

### 供应商模块
- [x] SupplierList (修复：替换 Inline Form，集成 Extra Buttons)
- [x] SupplierPrepaymentList (新增：补充缺失的搜索表单)

### 其他模块
- [x] ProductPoolList (修复：替换 Row/Col 布局)
- [x] BundleList (修复：替换 Row/Col 布局)
- [x] LogisticsProviderList (修复：替换 Inline Form)
- [x] PriceAdjustmentList (修复：替换 Inline Form)

## 4. 验证方法
我们提供了自动化测试脚本 `frontend/tests/layout-consistency.spec.ts`，基于 Playwright 框架，可自动验证：
1.  是否存在标准的 Card 容器。
2.  是否应用了正确的 CSS Grid 样式。
3.  操作按钮区域的位置和分割线样式。
4.  移动端分辨率下的响应式堆叠行为。

建议在 CI/CD 流程中集成此测试脚本，以防止未来的布局回退。
