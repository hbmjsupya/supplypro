# 前端故障排查指南 (Frontend Troubleshooting Guide)

本文档旨在帮助开发人员排查和解决前端项目中出现的常见问题，特别是针对"未修改代码却出现异常"的情况。

## 1. 快速恢复 (Quick Recovery)

如果你遇到了莫名其妙的构建错误、白屏或依赖丢失问题，请首先尝试执行清理脚本：

```bash
# 在 frontend 目录下执行
npm run clean
```

该命令会执行以下操作：
1. 删除 `node_modules`
2. 删除 `.vite` 缓存目录
3. 删除 `dist` 构建产物
4. 重新执行 `npm install`

## 2. 常见问题及解决方案

### 2.1 页面白屏 (White Screen)

**现象**：页面加载后一片空白，没有任何内容。
**原因**：通常是 React 组件渲染过程中发生了运行时错误（Runtime Error），导致整个 React 树卸载。
**排查**：
1. 打开浏览器控制台 (Console)。
2. 查看红色的错误信息。
3. 如果看到 `Uncaught Error: ...` 或 `Minified React error`，请根据堆栈信息定位组件。
4. 我们已在 `App.tsx` 中集成了 `ErrorBoundary`，现在页面应该会显示具体的错误堆栈而不是白屏。

### 2.2 依赖报错 / 找不到模块

**现象**：`Module not found` 或 `Cannot find package`。
**原因**：
- `node_modules` 损坏。
- 依赖版本冲突（由于使用了 `^` 版本号导致安装了不兼容的次要版本）。
**解决**：
- 我们已将核心依赖（React, Antd, Vite）的版本号固定（移除了 `^`），以确保环境一致性。
- 执行 `npm run clean` 重新安装。

### 2.3 样式丢失或错乱

**现象**：组件样式不符合预期，或者 Antd 样式未加载。
**原因**：Vite 缓存了旧的 CSS 文件。
**解决**：
- 在浏览器中强制刷新 (Cmd+Shift+R / Ctrl+F5)。
- 停用浏览器缓存 (Network -> Disable cache)。
- 执行 `rm -rf node_modules/.vite`。

## 3. 预防措施

为了防止此类问题再次发生，我们采取了以下措施：

1. **版本锁定**：在 `package.json` 中移除了核心库的 `^` 前缀，强制使用固定版本。
2. **错误边界**：在 `App.tsx` 中添加了全局 `ErrorBoundary`，捕获渲染错误并展示友好的错误页面。
3. **清理脚本**：添加了 `npm run clean` 方便快速重置环境。

## 4. 日志收集

目前错误日志主要输出到浏览器控制台。
如果遇到无法复现的生产环境问题，请要求用户提供控制台截图或网络请求 (Network) 的 HAR 文件。

---
**维护建议**：
每次修改 `package.json` 后，请务必更新 `package-lock.json` 并提交。
