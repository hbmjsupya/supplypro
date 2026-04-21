package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.UserRepository;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderReceiveTest {

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private SettlementOrderRepository settlementOrderRepository;
    @Mock
    private PurchaseOrderLogRepository purchaseOrderLogRepository;
    @Mock
    private InboundOrderRepository inboundOrderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PurchaseOrderSnapshotService snapshotService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private PurchaseOrder po;
    private SettlementOrder settlement;

    @BeforeEach
    void setUp() {
        po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setStatus(PurchaseOrder.Status.SHIPPED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);

        settlement = new SettlementOrder();
        settlement.setId(10L);
        settlement.setSettlementNo("PS123");
        settlement.setRelatedOrderNo("PO123");
        settlement.setType(SettlementOrder.Type.LOGISTICS);
        settlement.setTotalAmount(new BigDecimal("50.00"));
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setShippingStatus("SHIPPED"); // Initial status
    }

    @Test
    void testReceivePurchaseOrder_Success() {
        // Arrange
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));
        when(settlementOrderRepository.findByRelatedOrderNo("PO123")).thenReturn(List.of(settlement));
        
        // Act
        purchaseOrderService.receivePurchaseOrder(1L, "admin");

        // Assert
        // 1. Check PO Status
        assertEquals(PurchaseOrder.Status.RECEIVED, po.getStatus());
        assertEquals(PurchaseOrder.ShippingStatus.RECEIVED, po.getShippingStatus());
        assertNotNull(po.getReceiveTime());
        
        // 2. Check Settlement Order Status
        assertEquals("RECEIVED", settlement.getShippingStatus());
        verify(settlementOrderRepository).save(settlement);
        
        // 3. Check Logs
        verify(purchaseOrderLogRepository).save(any(PurchaseOrderLog.class));
        
        // 4. Check Snapshot
        verify(snapshotService).captureSnapshot(po);
    }

    @Test
    void testReceivePurchaseOrder_SettlementSyncFailure_ShouldThrow() {
        // Arrange
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));
        when(settlementOrderRepository.findByRelatedOrderNo("PO123")).thenThrow(new RuntimeException("DB Error"));

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            purchaseOrderService.receivePurchaseOrder(1L, "admin");
        });

        assertTrue(exception.getMessage().contains("Failed to sync settlement status"));
    }
}
