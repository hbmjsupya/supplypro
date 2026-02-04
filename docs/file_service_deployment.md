# 文件服务部署标准化流程

## 1. 目录规划
所有文件服务应遵循统一的目录结构，确保容器化部署时的持久化。

*   **宿主机路径**: `/opt/supplypro/data/uploads` (示例)
*   **容器内路径**: `/app/uploads`
*   **配置方式**: Docker Volume 映射

## 2. Docker 配置规范
### Dockerfile
后端 Dockerfile 必须显式创建上传目录，以确保权限正确初始化。

```dockerfile
WORKDIR /app
# 显式创建目录
RUN mkdir -p uploads
# 设置权限（如果非 root 运行）
# RUN chown -R spring:spring uploads
```

### docker-compose.yml
必须包含 Volume 映射，防止容器重启数据丢失。

```yaml
services:
  backend:
    volumes:
      - ./uploads:/app/uploads
    environment:
      # 显式指定配置项，覆盖默认值
      - FILE_UPLOAD_DIR=/app/uploads
```

## 3. 应用配置 (application.yml)
强制使用绝对路径或相对于 `WORKDIR` 的明确路径。

```yaml
file:
  upload-dir: uploads  # 相对于 WORKDIR /app -> /app/uploads
  allowed-types: jpg,jpeg,png,pdf,doc,docx,xls,xlsx
  max-size: 10MB
```

## 4. Nginx 路由配置
如果文件需要直接通过 HTTP 访问（非流式下载），需配置 Nginx 静态资源映射。**注意鉴权风险**。

推荐模式：所有文件访问经过后端 API (`/api/files/download/{id}`) 进行鉴权，**不配置** Nginx 直接访问 `/uploads`。

## 5. 健康检查 (Health Check)
应用启动时及运行期间需自检文件服务状态。

*   **启动时**：检查 `file.upload-dir` 是否存在、是否可写。如果不可写，应用应启动失败或打印 ERROR 日志。
*   **运行时**：提供 `/actuator/health` 或专用接口，返回文件系统状态（剩余空间、读写权限）。

## 6. 备份策略
*   定期备份宿主机 `uploads` 目录。
*   建议迁移至对象存储（S3/OSS）以彻底解决单机存储风险（未来规划）。
