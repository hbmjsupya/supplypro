package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.LogisticsTrack;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.LogisticsTrackRepository;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.service.impl.PurchaseOrderServiceImpl;
import com.supplypro.service.PurchaseOrderSnapshotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderShippingTest {

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private com.supplypro.repository.PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;
    @Mock private LogisticsProviderRepository logisticsProviderRepository;
    @Mock private LogisticsTrackRepository logisticsTrackRepository;
    @Mock private InboundOrderRepository inboundOrderRepository;
    @Mock private PurchaseOrderSnapshotService snapshotService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ValueOperations<String, Object> valueOperations;

    private PurchaseOrder po;
    private Supplier supplier;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.increment(anyString())).thenReturn(1L);

        supplier = new Supplier();
        supplier.setId(10L);
        supplier.setName("Product Supplier");

        po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setStatus(PurchaseOrder.Status.CONFIRMED);
        po.setSupplier(supplier);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED); // Add this to allow updateLogisticsInfo
    }

    @Test
    void testShipPurchaseOrder_Dropshipping_RuleCompliance() {
        // Scenario: Ship with Dropshipping (LogisticsProviderId = null) and Fee > 0
        // Expectation:
        // 1. SettlementOrder created with Supplier = Product Supplier
        // 2. SettlementOrder.settlementNo is NULL (Pending)
        // 3. LogisticsTrack.logisticsProvider = Product Supplier Name
        
        when(purchaseOrderRepository.findByIdWithLock(1L)).thenReturn(Optional.of(po));
        when(settlementOrderRepository.save(any(SettlementOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        
        // Act
        purchaseOrderService.updateLogisticsInfo(
            1L, 
            "TRACK123", 
            null, // trackingNo
            LocalDateTime.now(), 
            LocalDateTime.now().plusDays(3), 
            "Deliverer", "123456", "Plate123", 
            new BigDecimal("50.00"), 
            null, // logisticsProviderId = NULL (Dropshipping)
            "SelfDelivery"
        );

        // Assert
        // Verify SettlementOrder creation
        verify(settlementOrderRepository).save(argThat(settlement -> {
            // Rule 1: Supplier must be Product Supplier
            if (settlement.getSupplier() == null || !settlement.getSupplier().getId().equals(10L)) return false;
            if (settlement.getLogisticsProvider() != null) return false;
            
            // Rule 2: SettlementNo must be null (Pending)
            if (settlement.getSettlementNo() != null) return false;
            
            // Status must be PENDING
            if (settlement.getStatus() != SettlementOrder.Status.PENDING) return false;
            
            return true;
        }));
        
        // Verify LogisticsTrack creation
        verify(logisticsTrackRepository).save(argThat(track -> {
            // Rule 1: Logistics Provider Name must be the express company (TRACK123)
            return "TRACK123".equals(track.getLogisticsProvider());
        }));
    }
}
