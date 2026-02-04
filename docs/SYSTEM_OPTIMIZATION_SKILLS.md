# 系统功能优化技术方案与技能 (System Optimization Skills & Technical Specs)

本文档详细记录了商品分类、品牌展示、税务分类及错误处理的系统优化方案与实现细节，作为开发维护的参考依据。

## 1. 商品分类层级设计文档 (Product Category Hierarchy Design)

### 1.1 需求背景
原系统仅支持二级分类，无法满足精细化运营需求。本次升级将分类扩展至四级（L1 -> L2 -> L3 -> L4），并增加本地兜底数据生成机制。

### 1.2 核心设计
*   **数据结构**: 保持原有 `Category` 实体结构，通过 `parentId` 和 `level` 字段构建树形结构。
*   **层级定义**:
    *   **L1 (一级)**: 大类 (e.g., 办公用品)
    *   **L2 (二级)**: 中类 (e.g., 书写工具)
    *   **L3 (三级)**: 小类 (e.g., 笔类)
    *   **L4 (四级)**: 细目 (e.g., 中性笔)
*   **数据生成策略**:
    *   **本地兜底**: 当苏宁 API 不可用时，自动生成：
        *   20 个一级分类
        *   每个父级生成 5 个子级 (L2, L3)
        *   每个三级生成 10 个四级分类
    *   **父级层级推断**: 在保存分类时，若无法从 DB 获取父级信息，通过 `parentId` 前缀 (`L1_`, `L2_`, `L3_`) 智能推断父级层级，计算当前 `level`。

### 1.3 关键代码逻辑 (Backend)
```java
// CategoryServiceImpl.java
int parentLevel = 0;
if (!"0".equals(parentId)) {
    Category parent = categoryRepository.findByCategoryId(parentId);
    if (parent != null) {
        parentLevel = parent.getLevel();
    } else {
        // Fallback: infer from ID format
        if (parentId.startsWith("L1_")) parentLevel = 1;
        else if (parentId.startsWith("L2_")) parentLevel = 2;
        else if (parentId.startsWith("L3_")) parentLevel = 3;
    }
}
category.setLevel(parentLevel + 1);
```

### 1.4 前端实现
*   使用 Ant Design `Cascader` 组件。
*   启用 `loadData` 动态加载子节点，避免一次性加载海量数据。

---

## 2. 品牌展示优化方案 (Brand Display Optimization)

### 2.1 问题描述
商品列表和详情页原仅显示 `brandId`，用户无法直观识别品牌。

### 2.2 解决方案 (Redundant Field Population)
*   **策略**: 空间换时间。在 `Product` 实体中保留 `brandId`，但在 API 返回数据前，动态填充 `brandZhName`, `brandEnName`, `brandLogo` 瞬态字段。
*   **实现**:
    *   前端: 列表页直接展示 `brandZhName`。
    *   后端: 在 `ProductController` 的 `create` 和 `update` 接口中，根据 `brandId` 查询 `Brand` 实体，将名称和 Logo 写入 Product 对象的对应字段（注意：这些字段可能不持久化或作为冗余字段存储）。
    *   **当前现状**: Product 实体已有 `brandZhName` 等字段，直接利用 setter 填充。

### 2.3 关键代码逻辑
```java
// ProductController.java
Brand brand = brandRepository.findById(product.getBrandId()).orElse(null);
if (brand != null) {
    product.setBrandZhName(brand.getName());
    product.setBrandEnName(null); // Brand实体缺字段，暂置空
    product.setBrandLogo(brand.getIcon());
}
```

---

## 3. 税务分类同步与变更记录 (Tax Classification Sync & Audit)

### 3.1 核心流程
税务数据包含分类编码、名称及对应税率。由于外部 API 不稳定，采用"本地缓存 + 定时同步"策略。
- **同步频率**: 每日凌晨 2 点 (Cron: `0 0 2 * * ?`)。
- **智能匹配**: 使用正则 `(?<=[a-zA-Z0-9])(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])(?=[a-zA-Z0-9])` 对商品名称分词，支持中英文混合匹配。

### 3.2 自动填充机制 (Auto-fill)
*   **前端交互**: 用户在新增/编辑商品时，选择"税务分类"。
*   **联动逻辑**: `Select` 组件 `onChange` 事件触发，查找选中项对应的 `rate` (税率)，自动调用 `form.setFieldsValue({ taxRate: rate })` 填充税率输入框。
*   **数据格式化**: 税率在后端存储为小数 (0.13)，前端展示为百分比 (13%)。使用 `InputNumber` 的 `formatter` 和 `parser` 处理转换。

### 3.3 税率变更日志 (Tax Rate Audit Log)
*   **需求**: 记录商品税率的变更历史（原值、新值、变更人、时间）。
*   **实现**:
    *   新增实体 `ProductTaxChangeLog`。
    *   在 `ProductController.update` 方法中，对比 `oldRate` 和 `newRate`。
    *   若发生变更，自动插入一条日志记录。

### 3.4 关键代码逻辑 (Backend)
```java
// ProductController.java - Update Method
if (existingProduct != null && isTaxRateChanged(existingProduct.getTaxRate(), product.getTaxRate())) {
    ProductTaxChangeLog log = new ProductTaxChangeLog();
    log.setProductId(id);
    log.setOldRate(existingProduct.getTaxRate());
    log.setNewRate(product.getTaxRate());
    log.setReason("Manual Update");
    productTaxChangeLogRepository.save(log);
}
```

---

## 4. 错误处理最佳实践 (Error Handling Best Practices)

### 4.1 预防机制
1.  **输入校验**: 前端使用 Form `rules` 校验必填项；后端 Controller 使用 `@Valid` 和 Service 层逻辑校验。
2.  **空指针防御**: 在调用链中（如 `brand.getName()`）前务必判空 (`brand != null`)。
3.  **类型安全**: 数据库 `DECIMAL` 类型对应 Java `BigDecimal`，前端 `number`。避免精度丢失。

### 4.2 异常捕获与日志
*   **GlobalExceptionHandler**: 统一捕获未处理异常，返回标准化 JSON 错误响应。
*   **日志记录**: 关键操作（如数据同步、文件上传）必须记录 `log.error("Action failed: {}", e.getMessage(), e)`。

### 4.3 开发规范
*   **Skills 文档**: 修改核心模块前，先查阅 `docs/` 下的相关 Skills 文档，避免重复历史错误。
*   **Linter 检查**: 提交代码前必须解决所有 ESLint/TSLint 警告。
