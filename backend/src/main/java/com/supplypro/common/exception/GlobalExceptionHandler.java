package com.supplypro.common.exception;

import com.supplypro.common.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.supplypro.exception.LogisticsException;
import javax.servlet.http.HttpServletRequest;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(LogisticsException.class)
    public org.springframework.http.ResponseEntity<ApiResponse<Void>> handleLogisticsException(LogisticsException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return org.springframework.http.ResponseEntity.status(e.getStatus())
                .body(ApiResponse.error(e.getStatus().value(), e.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleBusinessException(BusinessException e) {
        log.warn("Business Exception: {}", e.getMessage());
        return ApiResponse.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleConstraintViolationException(ConstraintViolationException ex) {
        log.warn("Database Constraint Violation: {}", ex.getMessage());
        return ApiResponse.error(400, "数据库约束校验失败: " + ex.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        String message = "数据完整性校验失败";
        String rootMsg = ex.getMostSpecificCause().getMessage();
        if (rootMsg != null) {
            if (rootMsg.contains("Duplicate entry")) {
                if (rootMsg.contains("sku_code")) {
                    message = "数据完整性错误: SKU编码已存在，请刷新重试";
                } else if (rootMsg.contains("name")) {
                    message = "数据完整性错误: 商品名称已存在";
                } else {
                    message = "数据完整性错误: 存在重复数据 - " + rootMsg;
                }
            } else if (rootMsg.contains("foreign key constraint fails")) {
                message = "数据完整性错误: 关联数据不存在 (外键约束失败)";
            } else {
                message += ": " + rootMsg;
            }
        } else {
             message += ": " + ex.getMessage();
        }
        log.warn("Data Integrity Violation: {}", message);
        return ApiResponse.error(400, message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal Argument: {}", ex.getMessage());
        return ApiResponse.error(400, "参数错误: " + ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        log.warn("Validation Failed: {}", message);
        return ApiResponse.error(400, message);
    }

    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResponse<Void> handleBadCredentialsException(org.springframework.security.authentication.BadCredentialsException e) {
        log.warn("Authentication Failed: {}", e.getMessage());
        return ApiResponse.error(401, "用户名或密码错误");
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException e) {
        log.warn("Access Denied: {}", e.getMessage());
        return ApiResponse.error(403, "无权访问该资源");
    }

    @ExceptionHandler(org.springframework.security.authentication.InternalAuthenticationServiceException.class)
    public org.springframework.http.ResponseEntity<ApiResponse<Void>> handleInternalAuthenticationServiceException(org.springframework.security.authentication.InternalAuthenticationServiceException e) {
        log.error("Authentication Service Error: ", e);
        if (e.getCause() instanceof org.springframework.dao.DataAccessException) {
            return org.springframework.http.ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error(503, "数据库连接异常，请稍后重试"));
        }
        return org.springframework.http.ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(500, "认证服务异常，请联系管理员"));
    }

    @ExceptionHandler(io.github.resilience4j.circuitbreaker.CallNotPermittedException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ApiResponse<Void> handleCircuitBreakerOpenException(io.github.resilience4j.circuitbreaker.CallNotPermittedException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(503, "服务暂时不可用，请稍后重试 (Circuit Open)");
    }

    @ExceptionHandler(org.springframework.dao.IncorrectResultSizeDataAccessException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleIncorrectResultSizeDataAccessException(org.springframework.dao.IncorrectResultSizeDataAccessException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(500, "数据查询结果异常: 期望返回唯一结果但存在多条记录，请联系管理员");
    }

    @ExceptionHandler(org.springframework.dao.ConcurrencyFailureException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleConcurrencyFailureException(org.springframework.dao.ConcurrencyFailureException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(409, "数据操作冲突，请刷新后重试");
    }

    @ExceptionHandler(org.springframework.dao.QueryTimeoutException.class)
    @ResponseStatus(HttpStatus.GATEWAY_TIMEOUT)
    public ApiResponse<Void> handleQueryTimeoutException(org.springframework.dao.QueryTimeoutException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(504, "数据库查询超时，请稍后重试");
    }

    @ExceptionHandler(org.springframework.dao.DataAccessResourceFailureException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ApiResponse<Void> handleDataAccessResourceFailureException(org.springframework.dao.DataAccessResourceFailureException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(503, "数据库连接异常，请联系管理员");
    }

    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleDataAccessException(org.springframework.dao.DataAccessException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        // Default to 500 for other data access errors (e.g., bad SQL grammar, mapping errors)
        return ApiResponse.error(500, "数据服务内部错误，请联系管理员");
    }

    @ExceptionHandler(java.net.ConnectException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ApiResponse<Void> handleConnectException(java.net.ConnectException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(503, "服务连接失败，请稍后重试");
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotWritableException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleHttpMessageNotWritableException(org.springframework.http.converter.HttpMessageNotWritableException e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(500, "数据序列化异常，请联系管理员检查实体配置");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleException(Exception e, HttpServletRequest request) {
        logErrorDetails(e, request);
        return ApiResponse.error(500, "系统内部错误: " + e.getMessage());
    }

    private void logErrorDetails(Exception e, HttpServletRequest request) {
        String userId = "anonymous";
        try {
            if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null) {
                userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            }
        } catch (Exception ignored) {}
        
        log.error("Exception caught: [User: {}] [URL: {}] [Params: {}] [Error: {}]", 
                userId, request.getRequestURI(), request.getQueryString(), e.getMessage(), e);
    }

    @ExceptionHandler(org.springframework.data.redis.RedisConnectionFailureException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ApiResponse<Void> handleRedisConnectionFailureException(org.springframework.data.redis.RedisConnectionFailureException e) {
        log.error("Redis Connection Error: ", e);
        return ApiResponse.error(503, "缓存服务暂时不可用");
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleMethodArgumentTypeMismatchException(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException e) {
        log.warn("Method Argument Type Mismatch: {}", e.getMessage());
        return ApiResponse.error(400, "参数类型错误: " + e.getName());
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleHttpMessageNotReadableException(org.springframework.http.converter.HttpMessageNotReadableException e) {
        log.warn("Message Not Readable: {}", e.getMessage());
        if (e.getMessage() != null && e.getMessage().contains("java.time.LocalDate")) {
            return ApiResponse.error(400, "日期格式应为yyyy-MM-dd");
        }
        return ApiResponse.error(400, "请求参数格式错误");
    }

    @ExceptionHandler(org.springframework.transaction.TransactionSystemException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleTransactionSystemException(org.springframework.transaction.TransactionSystemException e) {
        log.error("Transaction Error: ", e);
        Throwable cause = e.getRootCause();
        String message = "系统事务异常";
        if (cause != null) {
            message += ": " + cause.getMessage();
        }
        return ApiResponse.error(500, message);
    }
}
