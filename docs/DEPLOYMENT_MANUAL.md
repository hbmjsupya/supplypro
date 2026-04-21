# 部署运维手册 (Deployment Manual)

## 1. 环境概览

本系统采用 Docker Compose 进行全栈容器化部署，包含以下服务组件：

| 服务名称 | 容器名 | 端口映射 | 说明 |
| :--- | :--- | :--- | :--- |
| **Frontend** | `supplypro-frontend` | `80:80` | Nginx 静态服务，反向代理 API |
| **Backend** | `supplypro-backend` | `8080:8080` | Spring Boot 应用服务 |
| **Database** | `supplypro-mysql` | `3307:3306` | MySQL 8.0 数据库 (宿主机端口 3307) |
| **Redis** | `supplypro-redis` | `6379:6379` | Redis 7.0 缓存服务 |

## 2. 前置要求

- **Docker**: 版本 >= 20.10
- **Docker Compose**: 版本 >= 2.0
- **可用端口**: 80, 8080, 3307, 6379 未被占用

## 3. 快速部署 (推荐)

使用自动化脚本一键重建环境（包含清理、构建、启动）：

```bash
# 赋予脚本执行权限 (首次运行)
chmod +x scripts/rebuild_env.sh

# 执行重建
./scripts/rebuild_env.sh
```

**脚本执行流程**：
1.  检查 Docker 环境。
2.  清理前端 `dist` 旧产物。
3.  停止并移除旧容器。
4.  强制重新构建 Docker 镜像（确保代码修改生效）。
5.  启动服务并等待健康检查通过。

## 4. 手动操作指南

若需单独操作某个服务，可使用 Docker Compose 命令：

### 启动服务
```bash
docker-compose up -d
```

### 查看日志
```bash
# 查看后端日志
docker-compose logs -f supplypro-backend

# 查看前端访问日志
docker-compose logs -f frontend
```

### 强制重新构建前端
若修改了前端代码，需执行：
```bash
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### 数据库管理
数据库文件持久化存储于 Docker Volume `mysql_data` 中，重启容器不会丢失数据。
连接地址：`localhost:3307`
用户名：`root`
密码：`password`
数据库：`supplypro`

## 5. 常见维护操作

### 清理所有数据
**警告**: 此操作将删除数据库所有数据！
```bash
docker-compose down -v
```

### 更新依赖
如果修改了 `pom.xml` 或 `package.json`，建议执行全量重建脚本 `./scripts/rebuild_env.sh` 以确保依赖正确下载。
