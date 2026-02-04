# CI/CD Cypress 集成指南

本指南详细说明了如何在 GitHub Actions 流水线中集成 Cypress 端到端测试，特别是如何利用预装镜像加速构建过程。

## 核心配置策略

为了避免在每次 CI 运行时重复下载庞大的 Cypress 二进制文件（通常超过 500MB），我们采用了以下优化策略：

1.  **使用预装镜像**：使用 `cypress/included` Docker 镜像，该镜像已预先安装了 Cypress 二进制文件和必要的浏览器（Chrome, Firefox, Electron）。
2.  **跳过二进制下载**：在安装 npm 依赖时，通过环境变量 `CYPRESS_INSTALL_BINARY: 0` 告诉 Cypress 安装脚本跳过下载步骤。

## GitHub Actions 配置 (`.github/workflows/ci.yml`)

### 任务定义

```yaml
frontend-test:
  runs-on: ubuntu-latest
  # 关键：指定包含 Cypress 的容器镜像
  container: cypress/included:latest
  defaults:
    run:
      working-directory: ./frontend
```

### 步骤说明

1.  **检出代码**：
    ```yaml
    - uses: actions/checkout@v3
    ```

2.  **安装依赖（不下载 Cypress）**：
    ```yaml
    - name: Install Dependencies
      run: npm ci
      env:
        # 关键：禁止下载二进制文件，直接使用容器内预装的版本
        CYPRESS_INSTALL_BINARY: 0
    ```

3.  **运行测试**：
    ```yaml
    - name: Run Cypress Tests
      run: |
        # 启动前端开发服务器（后台运行）
        npm run dev -- --host &
        # 等待服务器就绪（使用 wait-on 工具）
        npx wait-on http://localhost:5173
        # 执行 Cypress 测试
        npm run cypress:run
    ```

## 依赖管理

为了确保 CI 流程的稳定性，请确保 `package.json` 中包含 `wait-on` 依赖：

```json
"devDependencies": {
  "cypress": "^13.6.3",
  "wait-on": "^7.2.0"
}
```

注意：虽然我们跳过了二进制下载，但 `package.json` 中仍需包含 `cypress` 依赖，以便 `npm run cypress:run` 能够正确调用容器内的 Cypress 可执行文件。

## 常见问题排查

1.  **版本不匹配**：如果容器中的 Cypress 版本与 `package.json` 中的版本差异过大，可能会导致 API 不兼容。建议定期更新 `package.json` 中的版本以匹配 `cypress/included:latest`，或者在 CI 配置中指定具体的镜像标签（例如 `container: cypress/included:13.6.3`）。
2.  **服务器启动超时**：如果 `npx wait-on` 超时，可能是开发服务器启动过慢。可以增加 `wait-on` 的超时参数，或者检查前端构建是否有错误。
3.  **浏览器缺失**：`cypress/included` 镜像包含了 Chrome 和 Firefox。如果需要测试其他浏览器，请确认镜像是否支持。
