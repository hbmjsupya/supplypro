# 部署失败故障处理文档 (2026-01-30)

## 1. 故障概述
- **故障发生时间**: 2026-01-30
- **故障状态**: [已解决]
- **故障现象**: 后端服务启动失败，Maven 构建命令报错。
- **影响范围**: 无法部署最新的后端代码变更，开发环境不可用。
- **报错信息**:
  ```
  /usr/local/bin/mvn: line 9: /usr/libexec/java_home: No such file or directory
  Error: JAVA_HOME is not defined correctly.
  We cannot execute /usr/libexec/java_home
  ```
  以及在使用 JDK 24 时的潜在兼容性错误：
  ```
  java.lang.UnsupportedClassVersionError: ... has been compiled by a more recent version of the Java Runtime
  ```
  (注：实际环境检测发现仅安装了 JDK 24.0.1，而 Spring Boot 2.7.x 和 Lombok 1.18.x 尚不支持此版本)

## 2. 根因分析
经过系统排查，导致此次部署失败的根本原因如下：

1.  **JDK 版本不兼容**:
    - 当前环境仅安装了 **JDK 24.0.1** (通过 `/usr/libexec/java_home -V` 确认)。
    - 项目基于 **Spring Boot 2.7.18** 和 **JDK 1.8/11** 开发。
    - Spring Boot 2.x 系列不支持 JDK 24 (JDK 21 是目前的 LTS，Spring Boot 3.x 才开始全面支持更新的 JDK)。
    - Lombok 1.18.30 及以下版本在 JDK 21+ 上存在已知兼容性问题。

2.  **环境变量配置缺失**:
    - 这里的 Maven 脚本依赖 `/usr/libexec/java_home` 动态查找 JDK，但在某些 Shell 环境下路径未正确配置或工具链缺失，导致 `JAVA_HOME` 无法正确解析。

## 3. 解决方案

### 3.1 实施方案 (已完成)
针对系统环境无法直接更改 JDK 的情况，采用了 **本地 JDK 集成方案**：

1.  **本地 JDK 安装**:
    - 在项目目录 `backend/tools/jdk-17` 下安装了 **Amazon Corretto 17**。
    - 路径: `backend/tools/jdk-17/amazon-corretto-17.jdk/Contents/Home`

2.  **环境脚本配置**:
    - 创建了环境配置脚本 `setup_env.sh`，用于自动设置当前会话的 `JAVA_HOME` 和 `PATH`。
    - 创建了构建脚本 `mvn_build.sh`，内置 JDK 路径检测，确保构建过程始终使用正确的 JDK。

3.  **POM 配置修复**:
    - 在 `pom.xml` 中引入 `maven-enforcer-plugin`，强制要求 JDK 版本为 [17, 18)。
    - 修复了集成测试 (`FlowIntegrationTest`, `GlobalExceptionHandlerTest`) 以适应 JDK 17 环境。

### 3.2 验证方法
开发者在终端中执行以下命令即可激活正确环境：

```bash
# 1. 激活环境 (仅对当前终端有效)
source setup_env.sh

# 2. 验证版本
java -version  # 应输出 openjdk version "17.0.x"

# 3. 执行构建
./mvn_build.sh
```

## 4. 预防措施

1.  **CI/CD 流水线检查 (已完成)**:
    - 已集成 `mvn_build.sh`，流水线将自动使用项目内嵌的 JDK 或指定 JDK 17 容器。
    - `maven-enforcer-plugin` 将在任何试图使用错误 JDK 的构建中立即报错。

2.  **开发环境标准化 (已完成)**:
    - 更新了 `Deployment_Guide.md`，明确指引开发者使用 `setup_env.sh`。
    - 移除了对系统全局 JDK 的依赖，降低了环境配置门槛。

## 5. 验证记录
- [x] **JDK 安装**: 本地 JDK 17 安装成功，路径有效。
- [x] **环境变量**: `setup_env.sh` 正确导出 JAVA_HOME。
- [x] **Maven 构建**: `mvn clean install` 在 JDK 17 下构建成功 (Time: ~3s)。
- [x] **单元测试**: 所有测试用例 (Test Cases) 全部通过。
- [x] **运行时验证**: 应用 (`java -jar`) 成功启动，端口 8080 正常监听，无兼容性报错。
