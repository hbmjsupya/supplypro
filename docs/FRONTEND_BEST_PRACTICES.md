# 前端开发最佳实践与预防规范

## 1. 状态管理规范

### 1.1 异步状态更新
**问题**: React `useState` 的更新是异步的。在事件处理函数中调用 `setState` 后立即读取状态会得到旧值。
**规范**:
- 当需要在事件处理函数中立即使用更新后的值时，使用 `useRef` 存储该值。
- 或者在 `useEffect` 中监听状态变化来执行后续逻辑（但要注意依赖项闭包问题）。
- 禁止在 `setState` 后直接读取该 state 变量用于 API 提交。

**示例**:
```typescript
// 错误
const [status, setStatus] = useState('pending');
const submit = () => {
    setStatus('active');
    api.post({ status }); // 发送的是 'pending'
};

// 正确 (使用 useRef)
const statusRef = useRef('pending');
const submit = () => {
    statusRef.current = 'active';
    api.post({ status: statusRef.current });
};
```

### 1.2 闭包陷阱
**问题**: 在 `useEffect`、`useCallback` 或定时器中访问 state，容易因为依赖项缺失导致访问到旧的闭包变量。
**规范**:
- 必须正确填写 `useEffect` 和 `useCallback` 的依赖数组。
- 使用 `useRef` 来保持对最新值的引用，特别是在定时器或异步回调中。

## 2. API 请求与错误处理

### 2.1 全局错误处理
**规范**:
- 所有 API 请求必须经过统一封装的 `request.ts`。
- 必须处理 HTTP 401/403 (认证/权限) 和 500 (服务器错误)。
- 对于网络错误或超时，必须给予用户明确的 Toast 提示。
- 禁止在组件内部吞掉错误（catch 后不处理），除非有特定的业务降级逻辑。

### 2.2 加载状态
**规范**:
- 所有异步操作（提交表单、加载列表）必须有 Loading 状态反馈。
- 防止用户重复点击提交按钮（设置 `disabled` 或 `loading` 属性）。

## 3. 代码审查清单 (Checklist)

在提交代码前，请自查以下项目：

- [ ] **状态同步**: 是否在 setState 后立即使用了该 state？如果是，请改用 useRef 或传参方式。
- [ ] **闭包依赖**: useEffect/useCallback 的依赖项是否完整？是否使用了 ESLint 插件检查 hooks 依赖？
- [ ] **错误处理**: API 调用是否包含 catch 块？全局拦截器是否能捕获该错误？
- [ ] **用户反馈**: 点击按钮后是否有 Loading 效果？操作成功/失败是否有 Message 提示？
- [ ] **资源清理**: 组件卸载时是否清理了定时器、事件监听器？
- [ ] **数据校验**: 表单提交前是否进行了必要的前端校验？

## 4. 自动化测试建议

建议为关键业务路径编写集成测试（如 Cypress 或 Playwright）：

1. **表单提交**: 模拟填写表单 -> 点击提交 -> 验证 Loading 状态 -> 验证成功提示。
2. **异常流程**: 模拟断网或服务器 500 -> 验证错误提示是否出现。
3. **按钮防重**: 模拟快速多次点击 -> 验证请求只发送一次。

## 5. 部署验证流程

每次部署后，必须执行以下冒烟测试：

1. 打开浏览器控制台 (F12)。
2. 访问核心页面，确认无 JS 报错。
3. 执行一个完整的增删改查流程。
4. 观察 Network 面板，确认 API 请求状态码为 200。
5. 确认页面 UI 无明显错位或样式丢失。
