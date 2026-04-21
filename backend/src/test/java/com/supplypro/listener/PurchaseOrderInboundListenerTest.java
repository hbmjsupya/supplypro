package com.supplypro.listener;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.event.PurchaseOrderInboundEvent;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.PurchaseOrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderInboundListenerTest {

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @Mock
    private InboundOrderRepository inboundOrderRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @InjectMocks
    private PurchaseOrderInboundListener listener;

    private PurchaseOrder po;

    @BeforeEach
    void setUp() {
        po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO-TEST-001");
        po.setStatus(PurchaseOrder.Status.CONFIRMED);
    }

    @Test
    void handleEvent_Success() {
        // Arrange
        when(inboundOrderRepository.findByPurchaseOrder(any())).thenReturn(Optional.empty());
        InboundOrder inbound = new InboundOrder();
        inbound.setInboundNo("RK-TEST-001");
        when(purchaseOrderService.createInboundOrder(any())).thenReturn(inbound);
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));

        // Act
        listener.handlePurchaseOrderInboundEvent(new PurchaseOrderInboundEvent(this, po));

        // Assert
        verify(purchaseOrderService, times(1)).createInboundOrder(po);
        verify(purchaseOrderRepository, times(1)).save(po); // Verifies reference update
    }

    @Test
    void handleEvent_Idempotency() {
        // Arrange
        when(inboundOrderRepository.findByPurchaseOrder(any())).thenReturn(Optional.of(new InboundOrder()));

        // Act
        listener.handlePurchaseOrderInboundEvent(new PurchaseOrderInboundEvent(this, po));

        // Assert
        verify(purchaseOrderService, never()).createInboundOrder(any());
    }

    @Test
    void handleEvent_RetryFailure() {
        // Arrange
        when(inboundOrderRepository.findByPurchaseOrder(any())).thenReturn(Optional.empty());
        when(purchaseOrderService.createInboundOrder(any())).thenThrow(new RuntimeException("DB Error"));

        // Act
        listener.handlePurchaseOrderInboundEvent(new PurchaseOrderInboundEvent(this, po));

        // Assert
        verify(purchaseOrderService, times(3)).createInboundOrder(po); // 3 attempts
    }
}
