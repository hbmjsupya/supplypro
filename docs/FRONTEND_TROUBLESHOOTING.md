# 前端故障排查与修复报告

## 1. 问题描述
用户反馈前端页面无法加载。经排查，主要表现为：
1.  **开发环境 (Dev Server)**: 启动正常，但控制台出现大量 `http proxy error: /api/... ECONNREFUSED` 错误。
2.  **构建过程 (Build)**: 运行 `npm run build` 失败，提示 TypeScript 无法识别测试文件中的 `describe`, `test` 等全局变量。

## 2. 系统性排查过程

### 2.1 环境与配置检查
- **Node Modules**: 检查确认 `node_modules` 完整存在。
- **端口配置**:
  - 前端开发服务器端口: `5173` (正常)。
  - 后端服务端口 (Docker): `8081` (映射到容器内的 8080)。
  - Vite 代理配置 (`vite.config.ts`): 目标指向 `http://localhost:8080`。
- **发现问题**: Vite 代理配置的后端端口 (8080) 与实际运行端口 (8081) 不一致，导致前端无法连接后端 API。

### 2.2 构建过程检查
- 运行 `npm run build` 触发 `tsc -b && vite build`。
- **发现问题**: `tsc` (TypeScript Compiler) 在编译过程中包含了 `src/components/Bank/BankSelect.test.tsx` 等测试文件，但 `tsconfig.app.json` 未配置测试框架的类型定义 (如 `vitest/globals`)，导致编译报错。

## 3. 解决方案

### 3.1 修复 API 代理连接 (Port Mismatch)
修改 `frontend/vite.config.ts`，将代理目标端口从 `8080` 更正为 `8081`，以匹配 `docker-compose.yml` 中的端口映射。

```typescript
// frontend/vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:8081', // 修正为 8081
    changeOrigin: true,
  },
  // ...
}
```

### 3.2 修复构建错误 (Build Failure)
修改 `frontend/tsconfig.app.json`，从生产环境构建配置中排除测试文件。测试文件应由 `vitest` 独立处理，不需要包含在 `tsc -b` 的构建流程中。

```json
// frontend/tsconfig.app.json
{
  "include": ["src"],
  "exclude": ["src/**/*.test.tsx", "src/**/*.test.ts", "src/**/__tests__/*", "src/test/**/*"]
}
```

## 4. 验证结果

### 4.1 构建验证
执行 `npm run build`：
- **结果**: ✅ **构建成功**
- 输出: `dist/index.html`, `dist/assets/...` 生成成功。

### 4.2 开发环境验证
- **Dev Server**: 启动正常 (Port 5173)。
- **API 连接**: 代理指向 `localhost:8081`，与后端 Docker 容器端口一致，解决了 `ECONNREFUSED` 错误。

## 5. 后续建议
- **多环境配置**: 建议使用 `.env` 文件 (`VITE_API_BASE_URL`) 来管理 API 地址，避免硬编码。
- **CI/CD**: 确保 CI/CD 流程中使用正确的环境变量构建 Docker 镜像。
