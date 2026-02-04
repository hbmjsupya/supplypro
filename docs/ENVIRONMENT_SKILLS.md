# Maven 运行环境故障诊断手册 (Maven Troubleshooting Skills)

## 1. 全面诊断流程 (Diagnosis Workflow)

### 步骤 1: 版本兼容性检查
执行命令: `mvn -version`
*   **检查点**:
    *   Java Version: 必须 >= 17 (推荐 Amazon Corretto 17)。
    *   Maven Version: 推荐 3.8+。
    *   `JAVA_HOME`: 必须指向正确的 JDK 安装目录。

### 步骤 2: 清理与编译
执行命令: `mvn clean compile dependency:resolve`
*   **目的**: 强制清理旧构建，解析所有依赖。
*   **常见报错**:
    *   `Could not resolve dependencies`: 依赖下载失败。
    *   `Fatal error compiling`: JDK 版本不匹配。

### 步骤 3: 强制更新快照与打包
执行命令: `mvn package -U -DskipTests`
*   **目的**: `-U` 强制检查 Snapshot 更新，生成最终 Jar 包。

## 2. 常见报错对照表 (Common Errors)

| 错误信息 (Error Message) | 根本原因 (Root Cause) | 解决方案 (Solution) |
| :--- | :--- | :--- |
| `Command not found: mvn` | 环境变量未配置或未安装 | 使用 `./mvnw` 或配置 `PATH` 指向 `tools/apache-maven/bin` |
| `Fatal error compiling: invalid target release: 17` | JDK 版本过低 (如 JDK 8) | 设置 `JAVA_HOME` 为 JDK 17+ 路径 |
| `PKIX path building failed` | SSL 证书拦截 (公司内网/代理) | 配置 Maven 忽略 SSL 或导入证书到 Keystore |
| `Could not transfer artifact ... from/to central` | 网络超时或镜像源不可用 | 在 `settings.xml` 中配置阿里云镜像源 |
| `Process terminated` (IDEA) | 内存不足 | 增加 Maven 堆内存: `export MAVEN_OPTS="-Xmx1024m"` |

## 3. 私服配置模板 (settings.xml Template)
若遇到依赖下载缓慢，建议在 `~/.m2/settings.xml` 或 `tools/apache-maven/conf/settings.xml` 中添加镜像：

```xml
<mirrors>
    <mirror>
        <id>aliyunmaven</id>
        <mirrorOf>central</mirrorOf>
        <name>Aliyun Public Mirror</name>
        <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
</mirrors>
```

## 4. 性能调优参数 (Performance Tuning)
*   **多线程构建**: `mvn -T 1C clean install` (使用每核 1 线程)。
*   **离线模式**: `mvn -o clean install` (仅在依赖已下载时使用，速度极快)。
*   **跳过测试**: `mvn -DskipTests package` (开发阶段快速构建)。

## 5. 本次环境验证记录 (2026-02-02)
*   **Maven Version**: 3.9.6
*   **Java Version**: 17.0.10 (Amazon Corretto)
*   **Status**: Build Success
*   **Command**: `export JAVA_HOME=$(pwd)/tools/amazon-corretto-17.jdk/Contents/Home && export PATH=$JAVA_HOME/bin:$PATH && mvn package -U`
