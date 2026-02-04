# 错误处理模板与日志规范

## 1. 统一错误响应结构 (JSON)
所有 API 异常情况必须返回统一的 JSON 格式，禁止直接返回 HTML 堆栈。

```json
{
  "timestamp": "2024-01-30T10:00:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "文件上传失败：目录不可写",
  "path": "/api/logistics-files/temp/upload",
  "traceId": "c0a80101-..."
}
```

## 2. 后端日志规范
使用 SLF4J + Logback。

*   **ERROR 级别**：系统异常，需要人工介入。
    *   数据库连接失败
    *   文件系统不可写
    *   未捕获的 RuntimeException
    *   *格式*: `logger.error("Action failed: [Action Name], Context: [ID/User], Error: {}", e.getMessage(), e);`
*   **WARN 级别**：业务异常，预期内错误。
    *   参数校验失败
    *   资源未找到 (404)
    *   权限不足
    *   *格式*: `logger.warn("Business exception: {}, User: {}", e.getMessage(), userId);`
*   **INFO 级别**：关键流程节点。
    *   实体创建/删除成功
    *   状态变更
    *   *格式*: `logger.info("Logistics Provider created. ID: {}", id);`

## 3. 前端 Axios 错误处理模板 (SupplierFileManager 示例)

```typescript
const handleRequestError = (error: any, action: string) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;

    if (status === 404) {
      message.error(`${action}失败：接口或资源不存在 (404)。请检查网络或联系管理员。`);
      console.error(`[${action}] 404 Not Found:`, msg);
    } else if (status === 401 || status === 403) {
      message.error(`${action}失败：权限不足，请重新登录。`);
    } else if (status === 500) {
      message.error(`${action}失败：服务器内部错误。请稍后重试。`);
      console.error(`[${action}] 500 Server Error:`, msg);
    } else {
      message.error(`${action}失败：${msg}`);
    }
  } else {
    message.error(`${action}发生未知错误`);
    console.error(error);
  }
};
```

## 4. 全局异常处理器 (GlobalExceptionHandler)
Java 后端必须配置 `@ControllerAdvice`。

```java
@ExceptionHandler(MaxUploadSizeExceededException.class)
public ResponseEntity<ErrorResponse> handleMaxSizeException(MaxUploadSizeExceededException exc) {
    return ResponseEntity.status(HttpStatus.EXPECTATION_FAILED).body(new ErrorResponse("文件过大，请上传小于 10MB 的文件"));
}
```
