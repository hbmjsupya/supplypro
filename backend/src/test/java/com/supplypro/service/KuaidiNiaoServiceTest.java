package com.supplypro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.dto.LogisticsResponse;
import com.supplypro.exception.LogisticsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class KuaidiNiaoServiceTest {

    @InjectMocks
    private KuaidiNiaoService kuaidiNiaoService;

    @Mock
    private RestTemplate restTemplate;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // Inject real ObjectMapper to test actual JSON parsing
        ReflectionTestUtils.setField(kuaidiNiaoService, "objectMapper", objectMapper);
    }

    @Test
    void track_MockCode_ReturnsMockResponse() {
        LogisticsResponse response = kuaidiNiaoService.track("SF", "MOCK_123");
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals("MOCK_123", response.getLogisticCode());
    }

    @Test
    void track_ValidResponse_ParsesCorrectly() throws Exception {
        String jsonResponse = "{" +
                "\"EBusinessID\": \"123456\"," +
                "\"Success\": true," +
                "\"LogisticCode\": \"SF123456\"," +
                "\"State\": \"2\"," +
                "\"Traces\": [" +
                "{\"AcceptTime\": \"2023-10-27 10:00:00\", \"AcceptStation\": \"Station A\", \"Remark\": \"Picked up\"}" +
                "]" +
                "}";

        when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(jsonResponse, HttpStatus.OK));

        LogisticsResponse response = kuaidiNiaoService.track("SF", "SF123456");

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals("SF123456", response.getLogisticCode());
        assertEquals("2", response.getState());
        assertEquals(1, response.getTraces().size());
        assertEquals("Station A", response.getTraces().get(0).getAcceptStation());
    }

    @Test
    void track_ApiFailure_ThrowsException() {
        when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.INTERNAL_SERVER_ERROR));

        LogisticsException exception = assertThrows(LogisticsException.class, () -> {
            kuaidiNiaoService.track("SF", "SF123456");
        });
        
        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatus());
    }

    @Test
    void track_EmptyBody_ThrowsException() {
        when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

        LogisticsException exception = assertThrows(LogisticsException.class, () -> {
            kuaidiNiaoService.track("SF", "SF123456");
        });

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatus());
    }

    @Test
    void track_BusinessFailure_ReturnsResponseWithReason() throws Exception {
        String jsonResponse = "{" +
                "\"Success\": false," +
                "\"Reason\": \"Invalid Order\"" +
                "}";

        when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(jsonResponse, HttpStatus.OK));

        LogisticsResponse response = kuaidiNiaoService.track("SF", "SF123456");

        assertNotNull(response);
        assertFalse(response.isSuccess());
        assertEquals("Invalid Order", response.getReason());
    }
}
