# 采购单数据一致性问题根因分析与修复方案报告

## 1. 问题描述
用户反馈采购单列表页面的分页总数（Total）与实际数据库记录数不符，且状态筛选统计（Status Summary）的数量与列表展示数量存在潜在不一致。具体表现为：
- 分页组件显示的总页数错误（例如总共 100 条数据，每页 10 条，但显示只有 1 页）。
- 某些状态下的订单数量在统计栏显示正常，但在列表中无法完全展示。

## 2. 根因分析 (Root Cause Analysis)

经过详细的代码审查和测试验证，发现以下两个核心问题：

### 2.1 分页总数计算错误 (Critical Bug)
在 `PurchaseOrderController.java` 的 `getAll` 方法中，计算 `total` 变量的逻辑存在严重错误：
```java
// 错误代码
total = records.size(); 
```
`records.size()` 实际上是**当前页**经过转换后的记录数（例如每页 10 条，这里最大为 10）。这导致前端接收到的 `total` 永远小于或等于 `size`（页大小），从而使分页组件误判为只有一页数据，无法翻页查看剩余数据。

### 2.2 数据过滤逻辑不一致
- **统计接口 (`getStatusSummary`)**:
  - SQL 查询显式过滤了 `snapshot_data IS NOT NULL` 的记录。
  - 显式排除了 `CONFIRMED` 和 `PARTIAL_RECEIVED` 状态。
- **列表接口 (`getAll`)**:
  - 原 JPA Specification **未过滤** `snapshot_data IS NOT NULL` 的记录。虽然 Java 代码后续会过滤掉转换失败（null）的记录，但这会导致：
    - 如果使用数据库层面的 `count`，总数会包含坏数据，而实际展示时不包含，导致总数虚高。
    - 如果使用 `records.size()`（如前所述的错误），则分页完全失效。

## 3. 修复方案 (Fix Implementation)

### 3.1 修正分页总数计算
将 `total` 的取值来源改为数据库查询返回的分页元数据 `Page.getTotalElements()`，确保反映真实的数据库记录总数。

### 3.2 统一数据过滤条件
在 `getAll` 的 JPA Specification 中增加 `snapshotData IS NOT NULL` 的过滤条件，确保列表查询与统计查询基于相同的数据集，排除坏数据对总数计算的影响。

**修复后代码片段**:
```java
// 1. 添加过滤条件
predicates.add(cb.isNotNull(root.get("snapshotData")));

// 2. 修正总数计算
total = pageResult.getTotalElements();
totalPages = pageResult.getTotalPages();
```

## 4. 验证结果 (Verification)

编写了单元测试 `PurchaseOrderConsistencyTest` 进行验证：
- **场景**: 模拟数据库中有 15 条符合条件的记录，每页大小为 10。
- **修复前**: `getAll` 返回 `total = 10`（错误）。
- **修复后**: `getAll` 返回 `total = 15`（正确），且 `records` 列表包含 10 条数据。

测试结果显示修复方案有效，分页逻辑恢复正常，且数据一致性得到保障。

## 5. 建议
- **监控**: 建议在生产环境持续监控 `PurchaseOrderSnapshot` 表中 `snapshot_data` 为 NULL 的记录数量，若有增加需排查快照生成逻辑。
- **前端**: 前端应信任后端返回的 `total` 字段进行分页渲染。

---
**报告人**: Trae AI Agent
**日期**: 2026-03-06
