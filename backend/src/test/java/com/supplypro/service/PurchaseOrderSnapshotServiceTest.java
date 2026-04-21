package com.supplypro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderSnapshot;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.PurchaseOrderSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderSnapshotServiceTest {

    @InjectMocks
    private PurchaseOrderSnapshotService snapshotService;

    @Mock
    private PurchaseOrderSnapshotRepository snapshotRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private SnapshotStorageService storageService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ObjectMapper objectMapper;

    private PurchaseOrder po;

    @BeforeEach
    public void setup() {
        po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setTotalAmount(new BigDecimal("100.00"));
        po.setCreatedAt(LocalDateTime.now());
        po.setCreatedBy("testUser");
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        po.setSupplier(supplier);
    }

    @Test
    public void testConvertSnapshotToPO() throws Exception {
        // Prepare Snapshot
        PurchaseOrderSnapshot snapshot = new PurchaseOrderSnapshot();
        snapshot.setPurchaseOrderId(99L);
        snapshot.setSnapshotData("{\"id\":99,\"orderNo\":\"PO99\"}");
        snapshot.setInboundOrderNo("INB123");
        snapshot.setInboundOrderId(55L);

        // Mock ObjectMapper
        PurchaseOrder deserializedPO = new PurchaseOrder();
        deserializedPO.setId(99L);
        deserializedPO.setOrderNo("PO99");
        when(objectMapper.readValue(snapshot.getSnapshotData(), PurchaseOrder.class)).thenReturn(deserializedPO);

        // Execute
        PurchaseOrder result = snapshotService.convertSnapshotToPO(snapshot);

        // Verify
        assertNotNull(result);
        assertEquals(99L, result.getId());
        assertEquals("PO99", result.getOrderNo());
        assertEquals("INB123", result.getInboundOrderNo()); // Transient field populated from snapshot
        assertEquals(55L, result.getInboundOrderId());      // Transient field populated from snapshot
    }

    @Test
    public void testCaptureSnapshot_New() throws Exception {
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"id\":1}");
        when(snapshotRepository.findLatestByPurchaseOrderId(1L)).thenReturn(Collections.emptyList());

        snapshotService.captureSnapshot(po);

        verify(snapshotRepository, times(1)).save(any(PurchaseOrderSnapshot.class));
        verify(storageService, times(1)).storeSnapshot(eq("PO123"), eq(1), anyString());
    }

    @Test
    public void testCaptureSnapshot_Identical() throws Exception {
        String json = "{\"id\":1}";
        when(objectMapper.writeValueAsString(any())).thenReturn(json);
        
        PurchaseOrderSnapshot existing = new PurchaseOrderSnapshot();
        existing.setVersion(1);
        // Correct hash for {"id":1}
        existing.setSnapshotHash("037c9214eef74cc3887f3a4f085b4e17d76280dafd273b0ee160c09c4ba1cfd4"); 
        existing.setIsLatest(true);
        
        when(snapshotRepository.findLatestByPurchaseOrderId(1L)).thenReturn(List.of(existing));

        snapshotService.captureSnapshot(po);

        verify(snapshotRepository, never()).save(any(PurchaseOrderSnapshot.class));
    }

    @Test
    public void testCaptureSnapshot_Changed() throws Exception {
        String json = "{\"id\":1,\"amount\":200}";
        when(objectMapper.writeValueAsString(any())).thenReturn(json);
        
        PurchaseOrderSnapshot existing = new PurchaseOrderSnapshot();
        existing.setVersion(1);
        existing.setSnapshotHash("oldhash");
        existing.setIsLatest(true);
        
        when(snapshotRepository.findLatestByPurchaseOrderId(1L)).thenReturn(List.of(existing));

        snapshotService.captureSnapshot(po);

        verify(snapshotRepository, times(2)).save(any(PurchaseOrderSnapshot.class)); // 1 update old, 1 save new
        verify(storageService, times(1)).storeSnapshot(eq("PO123"), eq(2), anyString());
    }

    @Test
    public void testBackfillSnapshotSync() throws Exception {
        when(snapshotRepository.findLatestByPurchaseOrderId(1L)).thenReturn(Collections.emptyList());
        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(po));
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"id\":1}");

        snapshotService.backfillSnapshotSync(1L);

        verify(snapshotRepository, times(1)).save(argThat(snapshot -> 
            "BACKFILL".equals(snapshot.getSnapshotType()) && snapshot.getIsLatest()
        ));
        verify(notificationService, times(1)).sendNotification(eq("testUser"), contains("backfill completed"));
    }
}
