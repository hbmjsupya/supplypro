# 故障排查手册 (Troubleshooting Manual)

## 1. 前端问题排查

### 1.1 修改代码后页面不更新
**现象**: 修改了 TypeScript/CSS 文件，但刷新页面仍显示旧版本。
**原因**:
1.  **构建缓存**: `dist` 目录未清理，包含了旧文件。
2.  **Docker 镜像未更新**: 使用了 `docker-compose up` 而非 `--build`，导致容器内仍是旧镜像。
3.  **浏览器缓存**: 浏览器缓存了 `index.html` 或 JS 文件。

**解决方案**:
1.  执行全量重建脚本 `./scripts/rebuild_env.sh`（推荐）。
2.  若手动操作，先清理 `dist`: `npm run clean:build`，再 `docker-compose up --build frontend`。
3.  强制刷新浏览器 (Cmd+Shift+R)。
4.  检查 Nginx 配置 (`frontend/nginx.conf`) 是否包含了 `no-store` 头。

### 1.2 API 请求失败 (404/500/Network Error)
**现象**: 页面加载成功，但数据列表为空或报错。
**排查步骤**:
1.  检查后端是否启动: `docker ps` 确认 `supplypro-backend` 状态为 `Up`。
2.  查看后端日志: `docker-compose logs --tail=100 -f supplypro-backend`。
3.  检查 Nginx 代理:
    -   进入前端容器: `docker exec -it supplypro-frontend sh`
    -   测试后端连通性: `curl http://supplypro-backend:8080/actuator/health`
    -   若报错 `Could not resolve host`，说明 Docker 网络配置错误，检查 `docker-compose.yml` 的 `depends_on` 和 `networks` 配置。

## 2. 后端问题排查

### 2.1 数据库连接失败
**现象**: 后端启动失败，日志包含 `Communications link failure`。
**原因**: MySQL 容器尚未完全启动，后端尝试连接超时。
**解决方案**:
-   `docker-compose.yml` 已配置 `healthcheck`，确保 MySQL 就绪后再启动后端。
-   如果手动启动，请等待 MySQL 初始化完成（约 30 秒）。
-   检查端口占用: 宿主机 3307 是否被占用。

### 2.2 Redis 连接超时
**现象**: 日志包含 `RedisConnectionException`。
**解决方案**:
-   检查 Redis 容器状态: `docker ps | grep redis`。
-   确认后端环境变量 `SPRING_REDIS_HOST=redis` 配置正确。

### 2.3 内存溢出 (OOM)
**现象**: 容器频繁重启 (Exited 137)。
**原因**: Java 堆内存不足。
**解决方案**:
-   修改 `docker-compose.yml`，限制内存或增加宿主机内存。
-   调整 JVM 参数: `JAVA_OPTS="-Xmx512m"`。

## 3. 构建与部署问题

### 3.1 Maven 依赖下载慢/失败
**现象**: 构建后端镜像时卡在 `Download...` 或报错。
**解决方案**:
-   检查网络连接。
-   配置国内镜像源 (如阿里云) 到 `backend/settings.xml`。
-   使用 `mvn dependency:go-offline` 预下载依赖。

### 3.2 npm install 失败
**现象**: 前端构建失败，提示包缺失。
**解决方案**:
-   清理 `node_modules` 和 `package-lock.json`。
-   确保 Node 版本一致（推荐使用 Docker 构建以保证环境一致）。
