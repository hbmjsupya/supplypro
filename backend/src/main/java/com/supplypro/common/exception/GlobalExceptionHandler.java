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

import javax.servlet.http.HttpServletRequest;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

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
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleInternalAuthenticationServiceException(org.springframework.security.authentication.InternalAuthenticationServiceException e) {
        log.error("Authentication Service Error: ", e);
        return ApiResponse.error(500, "认证服务异常，请联系管理员");
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleMethodArgumentTypeMismatchException(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException e) {
        log.warn("Type Mismatch: {}", e.getMessage());
        return ApiResponse.error(400, "参数类型错误: " + e.getName() + " 应为 " + e.getRequiredType().getSimpleName());
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

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleException(Exception e, HttpServletRequest request) {
        log.error("Global Exception at {}: ", request.getRequestURI(), e);
        return ApiResponse.error(500, "系统内部错误: " + e.getMessage());
    }

    @ExceptionHandler(Throwable.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleThrowable(Throwable t, HttpServletRequest request) {
        log.error("Critical System Error at {}: ", request.getRequestURI(), t);
        return ApiResponse.error(500, "系统内部错误: " + t.getMessage());
    }
}
