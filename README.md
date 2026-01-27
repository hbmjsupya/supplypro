# SupplyPro - 供应链管理系统

## 项目简介
SupplyPro 是一个基于 Spring Boot 和 React 构建的现代化供应链管理系统，涵盖采购、库存、配送、结算等核心业务模块。

## 技术栈
- **后端**: Java 11, Spring Boot 2.7, MySQL 8.0, JPA/MyBatis
- **前端**: React 18, TypeScript, Ant Design 5, Vite
- **部署**: Docker, Docker Compose

## 快速开始

### 前置要求
- Docker Desktop (建议最新版)
- Git

### 启动项目
1. 克隆仓库（如果是从压缩包解压则跳过）
2. 进入项目根目录：
   ```bash
   cd d:\AIPRO\supplypro
   ```
3. 使用 Docker Compose 构建并启动：
   ```bash
   docker-compose up --build
   ```
4. 等待容器启动完成（首次构建可能需要几分钟下载依赖）。

### 访问系统
- **前端页面**: [http://localhost](http://localhost)
- **后端 API**: [http://localhost:8080/api/purchase-orders](http://localhost:8080/api/purchase-orders)
- **数据库**: localhost:3307 (用户: root, 密码: password)

## 功能模块
1. **采购管理**: 采购单创建、审批、发货、入库。
2. **库存管理**: 多仓库管理、库存批次追踪。
3. **供应商管理**: 供应商信息及结算配置。

## 开发文档
- [技术架构文档](docs/Technical_Architecture.md)
- [部署指南](docs/Deployment_Guide.md)

## 数据初始化
系统启动时会自动执行 `backend/src/main/resources/db/migration` 下的 SQL 脚本：
- `V1.0__init_schema.sql`: 创建表结构
- `V1.1__init_data.sql`: 生成 1000+ 条模拟数据
