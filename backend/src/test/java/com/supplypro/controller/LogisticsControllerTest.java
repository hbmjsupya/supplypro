package com.supplypro.controller;

import com.supplypro.dto.LogisticsResponse;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.exception.LogisticsException;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.LogisticsCompanyRepository;
import com.supplypro.service.KuaidiNiaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class LogisticsControllerTest {

    @InjectMocks
    private LogisticsController logisticsController;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private LogisticsCompanyRepository logisticsCompanyRepository;

    @Mock
    private KuaidiNiaoService kuaidiNiaoService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void trackByPurchaseOrderId_OrderNotFound_Returns404() {
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByPurchaseOrderId(1L);

        assertEquals(404, response.getStatusCodeValue());
        assertEquals("Purchase Order not found", response.getBody().get("message"));
    }

    @Test
    void trackByPurchaseOrderId_MissingLogisticsInfo_Returns400() {
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO123");
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByPurchaseOrderId(1L);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("物流信息缺失 (公司编码或单号为空)", response.getBody().get("message"));
    }

    @Test
    void trackByPurchaseOrderId_CachedResponse_Returns200() {
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO123");
        po.setLogisticsCompany("SF");
        po.setTrackingNumber("123456");
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));

        LogisticsResponse cachedResponse = new LogisticsResponse();
        cachedResponse.setSuccess(true);
        when(valueOperations.get(anyString())).thenReturn(cachedResponse);

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByPurchaseOrderId(1L);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("Success", response.getBody().get("message"));
    }

    @Test
    void trackByPurchaseOrderId_ServiceSuccess_Returns200AndCaches() {
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO123");
        po.setLogisticsCompany("SF");
        po.setTrackingNumber("123456");
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));
        when(valueOperations.get(anyString())).thenReturn(null);

        LogisticsResponse serviceResponse = new LogisticsResponse();
        serviceResponse.setSuccess(true);
        serviceResponse.setTraces(java.util.Collections.singletonList(new LogisticsResponse.Trace()));
        when(kuaidiNiaoService.track("SF", "123456")).thenReturn(serviceResponse);

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByPurchaseOrderId(1L);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("Success", response.getBody().get("message"));
        verify(valueOperations).set(anyString(), any(), anyLong(), any());
    }

    @Test
    void trackByPurchaseOrderId_SelfDelivery_ReturnsMock() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setDeliveryMethod("SelfDelivery");
        po.setTrackingNumber("SELF123");
        po.setDeliverer("张三");
        po.setDelivererPhone("13800138000");
        po.setShippedAt(java.time.LocalDateTime.now());
        
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByPurchaseOrderId(1L);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("Success", response.getBody().get("message"));
        
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertEquals("SELF", data.get("shipperCode"));
        assertEquals("自配送", data.get("shipperName"));
        
        // Verify KuaidiNiao service was NOT called
        verify(kuaidiNiaoService, never()).track(anyString(), anyString());
    }

    @Test
    void trackByTrackingNumber_SelfDelivery_ReturnsMock() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setDeliveryMethod("SelfDelivery");
        po.setTrackingNumber("SELF123");
        
        java.util.List<PurchaseOrder> pos = new java.util.ArrayList<>();
        pos.add(po);
        
        when(purchaseOrderRepository.findByTrackingNumber("SELF123")).thenReturn(pos);

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByTrackingNumber("SELF123");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("Success", response.getBody().get("message"));
        
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertEquals("SELF", data.get("shipperCode"));
        
        // Verify KuaidiNiao service was NOT called
        verify(kuaidiNiaoService, never()).track(anyString(), anyString());
    }

    @Test
    void trackByPurchaseOrderId_ServiceException_ThrowsLogisticsException() {
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO123");
        po.setLogisticsCompany("SF");
        po.setTrackingNumber("123456");
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));
        when(valueOperations.get(anyString())).thenReturn(null);

        when(kuaidiNiaoService.track("SF", "123456")).thenThrow(new LogisticsException("API Error", HttpStatus.BAD_GATEWAY));

        LogisticsException exception = assertThrows(LogisticsException.class, () -> {
            logisticsController.trackByPurchaseOrderId(1L);
        });

        assertEquals(HttpStatus.BAD_GATEWAY, exception.getStatus());
    }

    @Test
    void trackByTrackingNumber_InvalidFormat_Returns400() {
        ResponseEntity<Map<String, Object>> response = logisticsController.trackByTrackingNumber("INV");
        assertEquals(400, response.getStatusCodeValue());
        assertEquals("Invalid tracking number format (Alphanumeric, 5-30 chars)", response.getBody().get("message"));
    }

    @Test
    void trackByTrackingNumber_OrderNotFound_Returns404() {
        when(purchaseOrderRepository.findByTrackingNumber("TRACK123")).thenReturn(new java.util.ArrayList<>());

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByTrackingNumber("TRACK123");

        assertEquals(404, response.getStatusCodeValue());
        assertEquals("LOGISTICS_NOT_FOUND", response.getBody().get("errorCode"));
        assertEquals("物流单号不存在或尚未录入", response.getBody().get("message"));
    }

    @Test
    void trackByTrackingNumber_Success_Returns200() {
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO123");
        po.setLogisticsCompany("SF");
        po.setTrackingNumber("TRACK123");
        po.setId(1L);
        java.util.List<PurchaseOrder> pos = new java.util.ArrayList<>();
        pos.add(po);
        when(purchaseOrderRepository.findByTrackingNumber("TRACK123")).thenReturn(pos);
        when(valueOperations.get(anyString())).thenReturn(null);

        LogisticsResponse serviceResponse = new LogisticsResponse();
        serviceResponse.setSuccess(true);
        when(kuaidiNiaoService.track("SF", "TRACK123")).thenReturn(serviceResponse);

        ResponseEntity<Map<String, Object>> response = logisticsController.trackByTrackingNumber("TRACK123");

        assertEquals(200, response.getStatusCodeValue());
        assertEquals("Success", response.getBody().get("message"));
    }
}
