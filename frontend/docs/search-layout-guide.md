# 列表页搜索区域布局规范

为保持系统视觉和交互的一致性，所有列表页面的搜索区域必须遵循以下规范。

## 1. 核心组件

请直接使用公共组件 `<SearchFormLayout>`，它已封装了标准的 Grid 布局和按钮组。

```tsx
import SearchFormLayout from '@/components/SearchFormLayout';

<SearchFormLayout 
  form={form} 
  onFinish={handleSearch} 
  onReset={handleReset}
>
  {/* 搜索项 */}
  <Form.Item label="关键字" name="keyword" style={{ marginBottom: 0 }}>
    <Input />
  </Form.Item>
</SearchFormLayout>
```

## 2. 布局特征

- **容器**: 使用 `Card` 包裹，背景白色，圆角 8px。
- **Grid 网格**: 
  - 自适应列宽：`minmax(200px, 1fr)`
  - 间距：`gap: 16px 24px`
  - 对齐：`alignItems: 'end'`
- **操作区**:
  - 位置：搜索表单下方，右对齐
  - 样式：上方有 `1px solid #f0f0f0` 分割线
  - 按钮：[重置] [查询] (主按钮)

## 3. SASS 变量映射

虽然我们在组件中使用了内联样式（为了快速迁移），但建议后续迁移到全局样式表。以下是对应的设计变量：

| 属性 | 变量名 | 值 |
|---|---|---|
| 容器背景 | `$search-bg` | `#ffffff` |
| 容器圆角 | `$search-radius` | `8px` |
| 表单项最小宽 | `$search-item-min-width` | `200px` |
| 行间距 | `$search-row-gap` | `16px` |
| 列间距 | `$search-col-gap` | `24px` |
| 分割线颜色 | `$search-border-color` | `#f0f0f0` |

## 4. 迁移清单

以下页面已完成迁移：
- [x] SupplierSettlementList (基准)
- [x] PurchaseOrderList
- [x] ProductPoolList
- [x] BundleList
- [x] SupplierList
- [x] StockFlowList
- [x] InboundOrderList
