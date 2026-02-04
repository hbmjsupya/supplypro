# 物流供应商模块关键问题排查与修复文档

## 1. 采购负责人数据同步问题

### 问题描述
新增物流供应商后，列表页“采购负责人”列显示为空，且排序功能无效。

### 排查步骤
1.  **前端检查**：
    *   检查 `LogisticsProviderList.tsx` 中的 `columns` 定义。
    *   发现 `dataIndex` 设为 `purchaserName`，但接口返回数据中可能缺失该字段或为 null。
2.  **后端接口检查**：
    *   调用 `/api/logistics-suppliers`，查看返回 JSON。
    *   发现 DTO 中 `purchaserName` 有值，但部分旧数据可能只有 `procurementOwner` 字段（历史遗留）。
3.  **数据同步机制分析**：
    *   对比供应商模块，发现使用了 `procurementOwner` 作为主要字段。

### 解决方案
1.  **后端 DTO 映射增强**：
    *   在 `LogisticsProviderDTO` 中确保 `procurementOwner` 和 `purchaserName` 同步。
    *   添加单元测试 `LogisticsProviderTest` 验证映射逻辑。
2.  **前端容错处理**：
    *   修改列表渲染逻辑，优先显示 `purchaserName`，若为空则回退到 `procurementOwner`。
    *   代码示例：
        ```typescript
        render: (text, record) => text || record.procurementOwner || '-'
        ```

### 验证方法
*   运行 `LogisticsProviderTest`。
*   刷新前端列表，确认所有记录均显示负责人姓名。

---

## 2. 删除功能 500 错误

### 问题描述
删除物流供应商时，后端返回 500 Internal Server Error。

### 排查步骤
1.  **日志分析**：
    *   查看后端堆栈信息，发现 `ConstraintViolationException`。
    *   错误信息提示 `logistics_provider_files` 表存在外键引用。
2.  **数据库约束检查**：
    *   `logistics_provider_files` 表的 `logistics_provider_id` 外键未设置 `ON DELETE CASCADE`。
3.  **代码分析**：
    *   `LogisticsProvider` 实体类中，`files` 关联关系缺少 `cascade = CascadeType.ALL`。

### 解决方案
1.  **实体类修改**：
    *   在 `LogisticsProvider.java` 中修改 `@OneToMany` 注解：
        ```java
        @OneToMany(mappedBy = "logisticsProvider", cascade = CascadeType.ALL, orphanRemoval = true)
        private List<LogisticsProviderFile> files;
        ```
2.  **验证**：
    *   尝试删除包含文件的供应商，确认删除成功且文件记录也被级联删除。

---

## 3. 详情页 404 及文件服务不可用

### 问题描述
进入详情页后，文件相关接口报 404 或 500，无法加载文件列表。

### 排查步骤
1.  **服务部署检查**：
    *   检查 Docker 容器配置，发现未挂载文件存储卷。
    *   容器重启后，之前上传的临时文件丢失，导致物理文件不存在。
2.  **目录权限检查**：
    *   后端应用启动时未检查上传目录是否可写。

### 解决方案
1.  **部署配置更新**：
    *   `docker-compose.yml` 增加卷映射：`./uploads:/app/uploads`。
    *   `Dockerfile` 增加 `RUN mkdir -p uploads`。
2.  **健康检查机制**：
    *   在 `FileStorageService` 中新增 `healthCheck()` 方法，启动时及关键操作前检查目录状态。

---

## 4. 文件上传 404 错误

### 问题描述
点击上传文件，接口返回 404 Not Found。

### 排查步骤
1.  **路由检查**：
    *   检查 `LogisticsProviderFileController`，确认为 `/api/logistics-files/temp/upload`。
    *   检查 Nginx 配置，`/api/` 已正确代理到后端。
2.  **环境自检**：
    *   调用上传接口时，若存储目录不存在（例如刚部署未初始化），Java IO 会抛出异常，可能被全局异常处理器由于未细分异常类型而误报为 404 或 500。

### 解决方案
1.  **上传前自检**：
    *   在 `uploadTempFile` 方法中，先调用 `fileStorageService.healthCheck()`。
    *   如果目录不存在，尝试自动创建或抛出明确的 `RuntimeException`。
2.98→2.  **前端错误处理**：
99→    *   在 `SupplierFileManager.tsx` 中细分 Axios 错误状态，对 404/500 分别提示。

---

## 5. Ant Design Deprecation Warnings

### 问题描述
浏览器控制台出现大量 Warning: `[antd: Card] 'bordered' is deprecated. Please use 'variant' instead.` 和 `chunk-2DPJS5JB.js` 中的相关警告。

### 排查步骤
1.  **全局搜索**：使用 Grep 搜索 `bordered={false}` 和 `bordered={true}`。
2.  **版本检查**：确认项目依赖的 Ant Design 版本为 v5.x。

### 解决方案
1.  **批量替换**：
    *   将所有 `<Card bordered={false} ...>` 替换为 `<Card variant="borderless" ...>`。
    *   移除 `chunk-2DPJS5JB.js` 中因第三方库（如 `rc-util`）导致的间接警告（通常随主库升级解决，暂通过业务代码规避）。

---

## 6. 问题复查与部署验证记录 (2026-01-30)

### 复查结果
*   **采购负责人同步**：后端单元测试 `LogisticsProviderTest` 通过，验证 DTO 映射正确。前端列表页已包含回退显示逻辑。
*   **删除功能**：实体类 `CascadeType.ALL` 配置已生效，本地测试通过。
*   **文件服务**：`FileStorageService` 健康检查逻辑已集成，Docker 卷挂载配置已更新。
*   **代码规范**：所有 Java 文件编译通过，无语法错误。

### 部署步骤
1.  **停止旧服务**：终止正在运行的 Java 和 Node 进程。
2.  **后端启动**：
    ```bash
    mvn spring-boot:run -Dspring-boot.run.profiles=dev
    ```
    *   验证：日志无 ERROR，显示 `Started SupplyProApplication in ... seconds`。
3.  **前端启动**：
    ```bash
    npm run dev
    ```
    *   验证：控制台显示 `Local: http://localhost:5173/`，无启动报错。

### 验证结论
所有关键问题均已修复，系统启动正常，准备进行功能验收。

