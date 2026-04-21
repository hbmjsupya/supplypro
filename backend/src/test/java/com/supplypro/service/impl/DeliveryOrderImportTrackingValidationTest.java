package com.supplypro.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class DeliveryOrderImportTrackingValidationTest {

    @InjectMocks
    private DeliveryOrderImportServiceImpl importService;

    @Test
    @DisplayName("错误类型判断-单号不存在")
    void testDetermineTrackingErrorType_TrackingNotFound() {
        String result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "单号不存在");
        assertEquals("TRACKING_NOT_FOUND", result);

        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "Tracking not found");
        assertEquals("TRACKING_NOT_FOUND", result);
        
        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "快递单号不存在");
        assertEquals("TRACKING_NOT_FOUND", result);
    }

    @Test
    @DisplayName("错误类型判断-公司不匹配")
    void testDetermineTrackingErrorType_CompanyMismatch() {
        String result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "快递公司错误");
        assertEquals("COMPANY_MISMATCH", result);

        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "Logistics company mismatch");
        assertEquals("COMPANY_MISMATCH", result);
        
        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "物流公司不匹配");
        assertEquals("COMPANY_MISMATCH", result);
    }

    @Test
    @DisplayName("错误类型判断-参数错误")
    void testDetermineTrackingErrorType_InvalidParameter() {
        String result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "参数格式错误");
        assertEquals("INVALID_PARAMETER", result);

        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "Invalid format");
        assertEquals("INVALID_PARAMETER", result);
    }

    @Test
    @DisplayName("错误类型判断-授权错误")
    void testDetermineTrackingErrorType_AuthError() {
        String result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "用户权限不足");
        assertEquals("AUTH_ERROR", result);

        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "API key invalid");
        assertEquals("AUTH_ERROR", result);
        
        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "授权失败");
        assertEquals("AUTH_ERROR", result);
    }

    @Test
    @DisplayName("错误类型判断-网络错误")
    void testDetermineTrackingErrorType_NetworkError() {
        String result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "网络超时");
        assertEquals("NETWORK_ERROR", result);

        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "Connection timeout");
        assertEquals("NETWORK_ERROR", result);
    }

    @Test
    @DisplayName("错误类型判断-频率限制")
    void testDetermineTrackingErrorType_RateLimit() {
        String result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "请求频率超限");
        assertEquals("RATE_LIMIT", result);

        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "Rate limit exceeded");
        assertEquals("RATE_LIMIT", result);
    }

    @Test
    @DisplayName("错误类型判断-未知错误")
    void testDetermineTrackingErrorType_UnknownError() {
        String result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", "Some random error");
        assertEquals("API_ERROR", result);

        result = ReflectionTestUtils.invokeMethod(importService, "determineTrackingErrorType", (String) null);
        assertEquals("UNKNOWN_ERROR", result);
    }

    @Test
    @DisplayName("警告消息构建-单号不存在")
    void testBuildTrackingWarningMessage_TrackingNotFound() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "TRACKING_NOT_FOUND", "单号不存在");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("查询无结果"), "应包含查询无结果提示");
        assertTrue(result.contains("单号输入错误"), "应包含单号输入错误提示");
        assertTrue(result.contains("快递尚未揽收"), "应包含快递尚未揽收提示");
    }

    @Test
    @DisplayName("警告消息构建-公司不匹配")
    void testBuildTrackingWarningMessage_CompanyMismatch() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "顺丰速运", "COMPANY_MISMATCH", "快递公司不匹配");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("顺丰速运"), "应包含物流公司名称");
        assertTrue(result.contains("不匹配"), "应包含不匹配提示");
    }

    @Test
    @DisplayName("警告消息构建-参数错误")
    void testBuildTrackingWarningMessage_InvalidParameter() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "INVALID_PARAMETER", "参数格式错误");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("参数格式错误"), "应包含参数格式错误提示");
    }

    @Test
    @DisplayName("警告消息构建-授权错误")
    void testBuildTrackingWarningMessage_AuthError() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "AUTH_ERROR", "权限不足");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("API授权失败"), "应包含API授权失败提示");
        assertTrue(result.contains("系统管理员"), "应提示联系系统管理员");
    }

    @Test
    @DisplayName("警告消息构建-网络错误")
    void testBuildTrackingWarningMessage_NetworkError() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "NETWORK_ERROR", "网络超时");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("网络连接超时"), "应包含网络超时提示");
    }

    @Test
    @DisplayName("警告消息构建-频率限制")
    void testBuildTrackingWarningMessage_RateLimit() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "RATE_LIMIT", "请求频率超限");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("API调用频率超限"), "应包含频率超限提示");
    }

    @Test
    @DisplayName("警告消息构建-API异常")
    void testBuildTrackingWarningMessage_ApiException() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "API_EXCEPTION", "NullPointerException: test error");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("API调用异常"), "应包含API调用异常提示");
        assertTrue(result.contains("NullPointerException"), "应包含异常详情");
    }

    @Test
    @DisplayName("警告消息构建-未知错误")
    void testBuildTrackingWarningMessage_UnknownError() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "UNKNOWN_ERROR", "未知系统错误");
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("查询失败"), "应包含查询失败提示");
    }

    @Test
    @DisplayName("警告消息构建-null原因")
    void testBuildTrackingWarningMessage_NullReason() {
        String result = ReflectionTestUtils.invokeMethod(importService, "buildTrackingWarningMessage", 
            "JD123456", "京东快递", "API_EXCEPTION", null);
        
        assertNotNull(result);
        assertTrue(result.contains("JD123456"), "应包含物流单号");
        assertTrue(result.contains("未知异常"), "应包含未知异常提示");
    }
}
