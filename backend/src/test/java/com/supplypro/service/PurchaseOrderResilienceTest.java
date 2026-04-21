package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.impl.PurchaseOrderServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderResilienceTest {

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ListOperations<String, Object> listOperations;

    @Test
    public void testGetPurchaseOrdersFallback() {
        // Setup Redis Mock for fallback
        when(redisTemplate.opsForList()).thenReturn(listOperations);
        
        PurchaseOrder cachedPo = new PurchaseOrder();
        cachedPo.setId(999L);
        cachedPo.setOrderNo("PO-CACHED-001");
        
        List<Object> cachedList = Collections.singletonList(cachedPo);
        when(listOperations.range(anyString(), eq(0L), eq(-1L))).thenReturn(cachedList);

        // Execute Fallback directly (simulating Aspect invocation)
        Pageable pageable = PageRequest.of(0, 10);
        Throwable exception = new RuntimeException("Database Connection Failed");
        Page<PurchaseOrder> result = purchaseOrderService.getPurchaseOrdersFallback(null, pageable, exception);

        // Verify Fallback
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("PO-CACHED-001", result.getContent().get(0).getOrderNo());
    }
}
