package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.impl.PurchaseOrderServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderSnapshotRollbackTest {

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderSnapshotService snapshotService;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Test
    void testCreatePurchaseOrder_RollbackOnSnapshotFailure() {
        // Prepare PO
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("C202310271030001");
        
        // Mock Repository to return saved PO
        when(purchaseOrderRepository.saveAndFlush(any(PurchaseOrder.class))).thenReturn(po);

        // Mock Snapshot Service to throw exception
        doThrow(new RuntimeException("Snapshot generation failed")).when(snapshotService).captureSnapshot(any(PurchaseOrder.class));

        // Execute & Verify
        assertThrows(RuntimeException.class, () -> {
            purchaseOrderService.createGeneralPurchaseOrder(po);
        });

        // Verify save was called (simulating initial save)
        verify(purchaseOrderRepository, times(1)).saveAndFlush(any(PurchaseOrder.class));
        
        // Verify snapshot was attempted
        verify(snapshotService, times(1)).captureSnapshot(any(PurchaseOrder.class));
        
        // In a real @Transactional environment, the RuntimeException thrown above 
        // would trigger a rollback of the purchaseOrderRepository.save() operation.
    }
}
