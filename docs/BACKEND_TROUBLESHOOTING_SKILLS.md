# Backend Troubleshooting Skills & Best Practices

## 1. 故障排查流程 (Fault Troubleshooting Process)

当系统出现“系统内部错误 (System Internal Error)”或 500 错误时，请遵循以下步骤进行排查：

### Phase 1: 定位错误 (Locate the Error)
1.  **查看应用日志**: 检查后端控制台输出或日志文件 (`logs/app.log`)。
    *   搜索关键字: `Exception`, `Error`, `Caused by`.
    *   关注堆栈跟踪 (Stack Trace) 的第一行业务代码。
2.  **检查数据库迁移状态 (Flyway)**:
    *   如果是启动失败，检查 Flyway 迁移日志。
    *   常见错误: `Duplicate column name`, `Table already exists`, `SQLSyntaxErrorException`.
3.  **检查数据库 Schema 一致性**:
    *   确保实体类 (`@Entity`) 字段与数据库表列完全匹配。
    *   特别注意: 新增字段 (`@Column`) 是否已在迁移脚本中添加。
    *   特别注意: JPA Auditing 字段 (`@CreatedBy`, `@CreatedDate`) 是否有对应的数据库列。

### Phase 2: 常见错误与解决方案 (Common Errors & Solutions)

#### 1. 数据库迁移失败 (Flyway Migration Failed)
*   **现象**: 应用启动失败，日志显示 `org.springframework.beans.factory.BeanCreationException`, `FlywayException`.
*   **原因**:
    *   脚本中重复添加列 (`ADD COLUMN` 已存在的列)。
    *   SQL 语法错误 (如 MySQL 8.0 不支持 SEQUENCE)。
    *   校验和不匹配 (修改了已执行过的迁移脚本)。
*   **解决方案**:
    *   **修复**: 修正 SQL 脚本 (如使用 `MODIFY COLUMN` 代替 `ADD COLUMN` 如果列已存在)。
    *   **重置**: 如果是本地开发环境，可删除数据库重建。如果是生产环境，需手动修复 `flyway_schema_history` 表。
    *   **MySQL 8 Sequence**: 避免使用 `CREATE SEQUENCE`，改用自动递增列或模拟表。

#### 2. JPA/Hibernate Schema 验证失败
*   **现象**: `SchemaManagementException: Schema-validation: missing column` 或 `Wrong column type`.
*   **原因**:
    *   Java 实体类中定义了字段，但数据库表中缺少对应列。
    *   `String` 字段映射到数据库 `TEXT` 类型时，未指定 `@Column(columnDefinition = "TEXT")`，Hibernate 默认为 `VARCHAR(255)` 导致校验失败。
*   **解决方案**:
    *   创建新的 Flyway 迁移脚本添加缺失列。
    *   在实体类中明确指定 `columnDefinition`。

#### 3. 数据库连接失败 (UnknownHostException)
*   **现象**: `java.net.UnknownHostException: supplypro-db` 或 `Connection refused`.
*   **原因**:
    *   配置文件 (`application.yml`) 使用了 Docker 容器名 (`supplypro-db`)，但在本地 Host 环境运行。
    *   未正确激活 `dev` 或 `local` Profile。
*   **解决方案**:
    *   使用 `dev` Profile: `mvn spring-boot:run -Dspring.profiles.active=dev`。
    *   强制指定 JDBC URL: `-Dspring.datasource.url=jdbc:mysql://127.0.0.1:3307/supplypro...`。

#### 4. 接口 500 错误 (Internal Server Error)
*   **原因**:
    *   **空指针 (NPE)**: 未做非空校验。
    *   **枚举不匹配**: 数据库存储的值不在 Java Enum 定义范围内。
    *   **Lombok 无限递归**: 双向关联 (`@ManyToMany`, `@OneToMany`) 使用 `@Data` 导致 `hashCode()` 无限递归栈溢出。
*   **解决方案**:
    *   在关联字段上使用 `@ToString.Exclude` 和 `@EqualsAndHashCode.Exclude`。
    *   检查日志堆栈，定位具体行号。

#### 5. 智能匹配分词问题 (Smart Match Tokenization)
*   **现象**: 中英文混合关键词 (如 "A4纸") 无法匹配。
*   **原因**: 简单的正则分词 `[\\s\\-]+` 无法切分 "A4" 和 "纸"。
*   **解决方案**: 使用高级正则 `(?<=[a-zA-Z0-9])(?=[^a-zA-Z0-9])|(?<=[^a-zA-Z0-9])(?=[a-zA-Z0-9])` 进行切分。

## 2. 最佳实践与预防措施 (Best Practices & Prevention)

### 数据库变更规范
1.  **永远不要修改已发布的迁移脚本**: 一旦脚本被执行，严禁修改其内容。
2.  **增量变更**: 所有 Schema 变更必须通过新的 `V{Version}__description.sql` 脚本完成。
3.  **审计字段**: 凡是添加 `@CreatedBy`, `@LastModifiedBy` 的实体，必须确保数据库表中有 `created_by`, `updated_by` 列。

### 权限控制 (Security)
1.  **Service 层校验**: 不要仅依赖 Controller 层校验。在 Service 方法中使用 `SecurityContextHolder` 获取当前用户并校验数据权限。
2.  **数据权限**: 对于敏感数据 (如 Brand)，使用关联表 (如 `supplier_purchaser`) 校验用户是否有权访问特定 ID。

## 3. 应急响应机制 (Emergency Response)

### 常用命令
*   **启动后端**: `./start_server.sh`
*   **跳过测试构建**: `mvn clean package -DskipTests`
*   **重启服务**: `pkill -f spring-boot && ./start_server.sh`

## 4. 前端登录与认证排查 (Frontend Login & Auth Troubleshooting)

### 常见问题
1.  **CORS 跨域错误**: 前端控制台显示 `Access to XMLHttpRequest ... has been blocked by CORS policy`.
    *   **修复**: 确保后端 `SecurityConfig` 或 `WebMvcConfig` 中配置了 `allowedOrigins` (如 `http://localhost:3000`).
2.  **Token 失效/格式错误**: 401 Unauthorized.
    *   **排查**: 检查 Request Header `Authorization: Bearer <token>`.
    *   **后端**: 检查 `JwtAuthenticationFilter` 解析逻辑，确保 `JwtSecret` 与生成时一致。

## 5. 环境与构建排查 (Environment & Build)

### Maven 环境
*   如果系统未安装 Maven，请使用项目内嵌 Maven:
    ```bash
    # 在 backend 目录下
    export M2_HOME=$(pwd)/tools/apache-maven-3.9.6
    export PATH=$M2_HOME/bin:$PATH
    mvn -v
    ```
*   **JDK 版本**: 确保 `JAVA_HOME` 指向 JDK 17+ (项目依赖 Spring Boot 2.7.18 + Java 17).
    ```bash
    export JAVA_HOME=$(pwd)/tools/amazon-corretto-17.jdk/Contents/Home
    export PATH=$JAVA_HOME/bin:$PATH
    ```

## 6. API 接口测试 (API Interface Testing)

### 快速验证
*   **健康检查**: `curl http://localhost:8080/actuator/health` (需开启 actuator).
*   **登录接口**:
    ```bash
    curl -X POST http://localhost:8080/api/auth/signin \
      -H "Content-Type: application/json" \
      -d '{"username": "admin", "password": "password"}'
    ```
*   **税务匹配测试**:
    ```bash
    # 获取 Token 并测试
    export TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/signin ... | python3 ...)
    curl -G "http://localhost:8080/api/tax-classifications/match" --data-urlencode "productName=A4纸" -H "Authorization: Bearer $TOKEN"
    ```
