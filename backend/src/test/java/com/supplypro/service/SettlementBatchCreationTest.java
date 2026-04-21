package com.supplypro.service;

import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SettlementBatchCreationTest {

    @InjectMocks
    private SettlementService settlementService;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;
    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private LogisticsProviderRepository logisticsProviderRepository;
    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private ValueOperations<String, Object> valueOperations;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.increment(anyString())).thenReturn(1L);
    }

    @Test
    void testCreateBatchSettlement_DeliverySource_WithSupplier() {
        // Scenario: Pending delivery is Self-Delivery (Supplier), so ID is SupplierID
        Long supplierId = 100L;
        Supplier supplier = new Supplier();
        supplier.setId(supplierId);
        supplier.setName("Product Supplier");

        when(logisticsProviderRepository.findById(supplierId)).thenReturn(Optional.empty());
        when(supplierRepository.findById(supplierId)).thenReturn(Optional.of(supplier));
        when(settlementOrderRepository.save(any(SettlementOrder.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        SettlementOrder result = settlementService.createBatchSettlement(supplierId, "Delivery", new BigDecimal("100"), "admin", null, null);

        // Assert
        assertNotNull(result);
        assertEquals(SettlementOrder.Type.LOGISTICS, result.getType()); // Must be LOGISTICS for delivery source
        assertNotNull(result.getSupplier());
        assertEquals("Product Supplier", result.getSupplier().getName());
        assertNull(result.getLogisticsProvider());
    }

    @Test
    void testCreateBatchSettlement_DeliverySource_WithLogisticsProvider() {
        // Scenario: Pending delivery is Logistics, so ID is LogisticsProviderID
        Long lpId = 200L;
        LogisticsProvider lp = new LogisticsProvider();
        lp.setId(lpId);
        lp.setName("SF Express");

        when(logisticsProviderRepository.findById(lpId)).thenReturn(Optional.of(lp));
        // supplierRepository not called if LP found
        when(settlementOrderRepository.save(any(SettlementOrder.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        SettlementOrder result = settlementService.createBatchSettlement(lpId, "Delivery", new BigDecimal("50"), "admin", null, null);

        // Assert
        assertEquals(SettlementOrder.Type.LOGISTICS, result.getType());
        assertNotNull(result.getLogisticsProvider());
        assertEquals("SF Express", result.getLogisticsProvider().getName());
        assertNull(result.getSupplier());
    }
}
