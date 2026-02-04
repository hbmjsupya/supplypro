package com.supplypro.common.exception;

import com.supplypro.common.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import javax.servlet.http.HttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

public class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler globalExceptionHandler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        globalExceptionHandler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
    }

    @Test
    void handleBusinessException() {
        BusinessException ex = new BusinessException(400, "Invalid Data");
        ApiResponse<Void> response = globalExceptionHandler.handleBusinessException(ex);

        assertNotNull(response);
        assertEquals(400, response.getCode());
        assertEquals("Invalid Data", response.getMessage());
    }

    @Test
    void handleException() {
        Exception ex = new Exception("Unexpected Error");
        ApiResponse<Void> response = globalExceptionHandler.handleException(ex, request);

        assertNotNull(response);
        assertEquals(500, response.getCode());
        assertEquals("系统内部错误，请联系管理员", response.getMessage());
    }

    @Test
    void handleThrowable() {
        Throwable th = new OutOfMemoryError("Critical Failure");
        ApiResponse<Void> response = globalExceptionHandler.handleThrowable(th, request);

        assertNotNull(response);
        assertEquals(500, response.getCode());
        assertEquals("系统内部错误，请联系管理员", response.getMessage());
    }
}
