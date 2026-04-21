package com.supplypro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderSnapshot;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.PurchaseOrderSnapshotRepository;
import com.supplypro.repository.InboundOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderSnapshotSyncTest {

    @Mock
    private PurchaseOrderSnapshotRepository snapshotRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private InboundOrderRepository inboundOrderRepository;

    @Mock
    private SnapshotStorageService storageService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private PurchaseOrderSnapshotService snapshotService;

    @Test
    void testSnapshotSyncFields() throws Exception {
        // Prepare PO
        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("C202310271030001");
        po.setBizType(PurchaseOrder.BizType.INBOUND);
        po.setBizNo("IN202310271030001");
        po.setDeliveryDate(LocalDate.of(2023, 10, 30));
        po.setStatus(PurchaseOrder.Status.PENDING);
        
        // Mock dependencies
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(snapshotRepository.findLatestByPurchaseOrderId(1L)).thenReturn(Collections.emptyList());
        when(snapshotRepository.save(any(PurchaseOrderSnapshot.class))).thenAnswer(i -> i.getArguments()[0]);

        // Execute
        PurchaseOrderSnapshot snapshot = snapshotService.captureSnapshot(po);

        // Verify
        assertEquals("C202310271030001", snapshot.getOrderNo());
        assertEquals("商品入库", snapshot.getBizType());
        assertEquals("IN202310271030001", snapshot.getBizNo());
        assertEquals(LocalDate.of(2023, 10, 30), snapshot.getDeliveryDate());
        assertEquals(1, snapshot.getVersion());
    }

    @Test
    void testSnapshotSyncInboundFields() throws Exception {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(2L);
        po.setOrderNo("C202310271030002");
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setInboundOrderId(100L);
        po.setInboundOrderNo("IN202310271030002");
        
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(snapshotRepository.findLatestByPurchaseOrderId(2L)).thenReturn(Collections.emptyList());
        when(snapshotRepository.save(any(PurchaseOrderSnapshot.class))).thenAnswer(i -> i.getArguments()[0]);
        
        PurchaseOrderSnapshot snapshot = snapshotService.captureSnapshot(po);
        
        assertEquals(100L, snapshot.getInboundOrderId());
        assertEquals("IN202310271030002", snapshot.getInboundOrderNo());
    }
}
