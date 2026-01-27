# 部署指南

## 本地开发环境部署

### 1. 环境准备
确保已安装 Docker 和 Docker Compose。

### 2. 构建与启动
在项目根目录下运行：
```bash
docker-compose up --build -d
```
`-d` 参数表示后台运行。

### 3. 验证部署
- 查看容器状态：
  ```bash
  docker-compose ps
  ```
  应看到 `supplypro-backend`, `supplypro-frontend`, `supplypro-db` 均为 Up 状态。

- 查看日志：
  ```bash
  docker-compose logs -f supplypro-backend
  ```

### 4. 停止与清理
```bash
docker-compose down
```
若要删除数据卷（清空数据库）：
```bash
docker-compose down -v
```

## 模块测试指南

### 1. 商品池与采购
- **商品新增**：访问 `/supply-chain/product-pool/add`，测试商品基本信息录入、多规格生成（支持二级规格）、状态流转（待选品->已选品->已上架）。
- **组合商品**：访问 `/supply-chain/bundle/add`，测试组合商品创建及子商品关联。
- **采购下单**：访问 `/supply-chain/purchase-order/create`，测试选择供应商、添加商品、自动拆单逻辑（按规格拆分采购单）。

### 2. 仓储物流
- **分仓管理**：访问 `/supply-chain/warehouse`，测试仓库增删改查及地区级联选择。
- **库存查看**：访问 `/supply-chain/warehouse-product`，验证分仓库存聚合数据准确性。
- **出入库流程**：
  - **入库**：从采购单详情页发起入库，或在 `/supply-chain/inbound` 查看入库单，测试确认入库后库存增加。
  - **出库**：访问 `/supply-chain/platform-confirm` 平台确认单，测试发货操作及出库单生成。
  - **流水**：访问 `/supply-chain/stock-flow` 查看商品出入库流水记录。

### 3. 结算管理
- **供应商结算**：访问 `/supply-chain/settlement/supplier`，测试结算单生成、审批流程及状态更新。
- **物流费用**：访问 `/supply-chain/settlement/delivery`，测试物流费用结算。

## 生产环境部署建议

1. **数据库外置**: 生产环境建议使用云数据库（如 RDS）替代 Docker 容器内的 MySQL。
2. **配置分离**: 使用 Docker Secrets 或环境变量管理敏感信息（数据库密码等）。
3. **前端优化**: 前端构建产物应上传至 CDN 或使用 Nginx 进行 gzip 压缩。
4. **日志监控**: 集成 ELK 或 Prometheus + Grafana 进行监控。
5. **CI/CD**: 配置 Jenkins 或 GitHub Actions 自动构建镜像并推送到镜像仓库。
