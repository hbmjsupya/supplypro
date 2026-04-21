package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.impl.PurchaseOrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.any;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderNumberingTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    
    // We need to mock other dependencies of PurchaseOrderServiceImpl to avoid NPEs
    @Mock
    private PurchaseOrderSnapshotService snapshotService;
    
    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void testGeneratePurchaseOrderNumberFormat() throws Exception {
        // Mock Redis increment to return 1
        when(valueOperations.increment(anyString())).thenReturn(1L);
        // Mock DB to return null (unique)
        when(purchaseOrderRepository.findByOrderNo(anyString())).thenReturn(null);

        // Access private method via reflection or test via public method
        // Here we test via reflection for precision
        java.lang.reflect.Method method = PurchaseOrderServiceImpl.class.getDeclaredMethod("generatePurchaseOrderNumber");
        method.setAccessible(true);
        String orderNo = (String) method.invoke(purchaseOrderService);

        // Verify Format: C + YYYYMMDDHHMM + 001
        assertNotNull(orderNo);
        assertTrue(orderNo.startsWith("C"));
        assertEquals(16, orderNo.length()); // C (1) + 12 + 3 = 16
        
        String timeStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
        // Allow 1 minute difference in case of test delay
        String expectedPrefix = "C" + timeStr;
        if (!orderNo.startsWith(expectedPrefix)) {
             // Fallback check for minute rollover
             String timeStrPrev = LocalDateTime.now().minusMinutes(1).format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
             assertTrue(orderNo.startsWith("C" + timeStrPrev));
        }
        
        assertTrue(orderNo.endsWith("001"));
    }

    @Test
    void testGeneratePurchaseOrderNumberSequence() throws Exception {
        // Mock Redis to return 123
        when(valueOperations.increment(anyString())).thenReturn(123L);
        when(purchaseOrderRepository.findByOrderNo(anyString())).thenReturn(null);

        java.lang.reflect.Method method = PurchaseOrderServiceImpl.class.getDeclaredMethod("generatePurchaseOrderNumber");
        method.setAccessible(true);
        String orderNo = (String) method.invoke(purchaseOrderService);

        assertTrue(orderNo.endsWith("123"));
    }
}
