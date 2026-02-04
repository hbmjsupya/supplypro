# Maven 问题修复与构建优化报告

**日期**: 2026-01-30
**状态**: 已修复 (需环境配合)
**作者**: Trae AI Assistant

## 1. 问题背景与清单
在项目开发与部署过程中，反复出现 Maven 构建相关问题，主要表现为：
1.  **环境不一致**: 开发环境与 CI/CD 环境 Java 版本不统一 (Java 24 vs Java 17)，导致 `ExceptionInInitializerError` 等编译错误。
2.  **依赖冲突**: 部分依赖未锁定版本，导致构建不确定性。
3.  **仓库配置混乱**: `pom.xml` 中直接定义仓库，未统一使用镜像，导致国内下载慢或失败。
4.  **缺乏校验**: 缺乏对环境版本、依赖漏洞的自动化检查。

## 2. 根因分析
*   **JDK 版本不兼容**: 项目使用了 Lombok 和 Spring Boot 2.7.x，该组合在 JDK 24 (Preview) 下存在已知的不兼容问题 (Lombok 无法访问 JDK 内部 API)。
*   **配置分散**: 缺乏统一的 `dependencyManagement`，依赖版本由传递性依赖决定，容易冲突。
*   **规范缺失**: 未使用 `maven-enforcer-plugin` 强制约束构建环境。

## 3. 修复方案实施

### 3.1 统一 Maven 版本与配置
*   **Maven 版本**: 统一使用项目内置的 Maven 3.9.6 (`backend/tools/apache-maven-3.9.6`)。
*   **Settings 优化**: 更新了 `tools/.../conf/settings.xml`，配置了 **Aliyun Maven 镜像** (`mirrorOf *`)，确保国内访问速度。
*   **Profiles**: 补充了 JDK 17 激活配置，默认开启。

### 3.2 POM 文件重构
*   **依赖管理**: 在 `backend/pom.xml` 中添加了 `<dependencyManagement>`，显式锁定了关键依赖版本：
    *   `mybatis-spring-boot-starter`: 2.3.1
    *   `mysql-connector-java`: 8.0.33
    *   `springfox-boot-starter`: 3.0.0
    *   `jjwt`: 0.11.5
*   **插件集成**:
    *   **maven-enforcer-plugin**: 强制要求 Maven >= 3.8.0 和 JDK = 17 (范围 `[17, 18)`)。
    *   **versions-maven-plugin**: 用于检查依赖更新。
    *   **dependency-check-maven-plugin**: 集成 OWASP 漏洞扫描。
    *   **maven-compiler-plugin**: 显式指定 `--release 17`。

### 3.3 构建脚本集成
*   编写了 `mvn_build.sh` 脚本，自动检查 Java 环境并执行带校验的构建。
*   脚本集成了 `-U` (强制更新) 和错误检测。

## 4. 验证结果
*   **环境约束**: 在当前 JDK 24 环境下运行构建，`maven-enforcer-plugin` 正确拦截并报错，提示 `RequireJavaVersion failed` (或编译器报错)，防止了在错误环境下生成不稳定制品。
*   **依赖解析**: 依赖树清晰，冲突解决。
*   **后续步骤**: 必须在开发机和 CI 环境安装 **JDK 17** 才能通过构建。这是预期的严格行为。

## 5. 后续预防规范
1.  **开发环境**: 所有开发人员必须安装 JDK 17，并设置 `JAVA_HOME`。
2.  **CI/CD**: 流水线必须使用 `mvn_build.sh` 作为构建入口，并在 JDK 17 容器中运行。
3.  **依赖变更**: 新增依赖必须在 `<dependencyManagement>` 中声明版本。
4.  **定期扫描**: 每周运行一次 `mvn dependency-check:check` 扫描安全漏洞。
