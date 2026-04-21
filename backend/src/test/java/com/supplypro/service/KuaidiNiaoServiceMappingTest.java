package com.supplypro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class KuaidiNiaoServiceMappingTest {

    @InjectMocks
    private KuaidiNiaoService kuaidiNiaoService;

    @Mock
    private RestTemplate restTemplate;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(kuaidiNiaoService, "objectMapper", objectMapper);
    }

    @Test
    void track_ShouldMapChineseNamesToCodes() throws Exception {
        // Mock successful response to avoid exception
        String jsonResponse = "{\"Success\": true, \"Traces\": []}";
        when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(jsonResponse, HttpStatus.OK));

        // Test cases: Name -> Expected Code
        String[][] testCases = {
            {"韵达快递", "YUNDA"},
            {"邮政EMS", "EMS"},
            {"德邦快递", "DBL"},
            {"圆通速递", "YTO"},
            {"中通快递", "ZTO"},
            {"京东物流", "JD"},
            {"顺丰速运", "SF"},
            {"SF Express", "SF"}
        };

        for (String[] testCase : testCases) {
            String inputName = testCase[0];
            String expectedCode = testCase[1];

            kuaidiNiaoService.track(inputName, "123456");

            ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(any(String.class), captor.capture(), eq(String.class));

            HttpEntity<MultiValueMap<String, String>> entity = captor.getValue();
            String requestData = entity.getBody().getFirst("RequestData");
            
            // RequestData is a JSON string, so it should contain "ShipperCode":"CODE"
            assertTrue(requestData.contains("\"ShipperCode\":\"" + expectedCode + "\""), 
                "Failed to map " + inputName + " to " + expectedCode + ". RequestData: " + requestData);
                
            // Reset mock for next iteration
            org.mockito.Mockito.reset(restTemplate);
            when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(jsonResponse, HttpStatus.OK));
        }
    }
}
