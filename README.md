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

## API 更新日志 (2026-02-12)
### 入库单模块 (Inbound Orders)
- **GET /api/inbound-orders**: 
  - 新增列表查询接口，支持分页 (`page`, `size`)。
  - 返回包含入库单号、关联采购单号、供应商、仓库等概要信息。
- **GET /api/inbound-orders/{id}**:
  - 增强详情返回数据，包含关联采购单完整信息、供应商联系方式、入库明细列表（含SKU、税率、税额、总价）。
  - 新增汇总字段：`totalQuantity`, `totalAmount`, `totalTax`。
- **POST /api/inbound-orders/{id}/confirm**:
  - 确认入库操作，自动创建库存批次 (`StockBatch`) 和库存流水 (`StockFlow`)。
  - 同步更新关联采购单状态为 `RECEIVED`。

### 采购单模块 (Purchase Orders)
- **同步逻辑**: 
  - 创建 `INBOUND` 类型采购单时，自动触发入库单创建。
  - 修复了事务传播导致的死锁问题，确保高并发下数据一致性。

## Docker 构建优化指南 (2026-02-13)

为提升本地开发效率，项目已启用 Docker BuildKit 及多级缓存优化。

### 1. 启用高速构建
默认推荐使用 `docker buildx bake` 进行并行构建（需安装 Docker Buildx）：
```bash
# 构建并利用本地/远程缓存
./build-cache.sh
```

或者使用传统的 Docker Compose（已配置 BuildKit）：
```bash
# 首次构建
export DOCKER_BUILDKIT=1
docker-compose up -d --build
```

### 2. 缓存清理
如果遇到依赖缓存导致的问题，可以按需清理：
```bash
# 清理构建缓存
docker buildx prune --all

# 清理所有未使用的对象
docker system prune -a
```

### 3. 镜像源配置
项目 Dockerfile 已内置国内镜像源加速：
- **Backend**: 使用 Maven 阿里云镜像 (通过 `settings.xml`)
- **Frontend**: 使用 npmmirror (淘宝源) 及 Alpine 阿里云源

### 4. 性能指标
- **构建时间**: 首次约 3-5 分钟，增量构建 < 30 秒。
- **镜像体积**: 相比优化前减少约 40%。
