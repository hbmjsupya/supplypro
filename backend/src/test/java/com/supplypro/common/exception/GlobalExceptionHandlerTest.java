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
        // The implementation returns "系统内部错误: " + message
        assertEquals("系统内部错误: Unexpected Error", response.getMessage());
    }
}
