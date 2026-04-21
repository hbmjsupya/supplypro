package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.PurchaseOrderSnapshotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = "supplypro.rate-limit.enabled=false")
public class PurchaseOrderSortTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseOrderSnapshotService snapshotService;

    @Autowired
    private com.supplypro.repository.PurchaseOrderSnapshotRepository snapshotRepository;

    @BeforeEach
    public void setup() {
        snapshotRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
    }

    private void createPurchaseOrder(String orderNo, LocalDateTime createdAt, Long id) {
        PurchaseOrder po = new PurchaseOrder();
        // If we could set ID, we would, but usually it's auto-generated.
        // We will rely on save order for ID generation.
        po.setOrderNo(orderNo);
        po.setTotalAmount(new BigDecimal("100.00"));
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setCreatedAt(createdAt);
        po.setSupplierId(1L); // Dummy
        po.setType(PurchaseOrder.Type.STANDARD);
        
        PurchaseOrder saved = purchaseOrderRepository.saveAndFlush(po);
        // Force the createdAt (since @PrePersist might override it if null, but we passed it)
        // Actually @PrePersist only sets if null.
        // But let's make sure repository saves what we want.
        
        // We need to ensure ID order matches creation order for simple tests,
        // or manipulate them if we want to test secondary sort.
        // Since ID is auto-increment, we can't easily force it without native queries or resetting sequence.
        // So we will just create them in order.
        
        snapshotService.captureSnapshot(saved);
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testStrictSortByCreatedAtDesc() throws Exception {
        LocalDateTime now = LocalDateTime.now();

        // Create 3 orders with different times
        // Order 1: Oldest
        createPurchaseOrder("PO-OLD", now.minusHours(2), null);
        
        // Order 2: Middle
        createPurchaseOrder("PO-MID", now.minusHours(1), null);
        
        // Order 3: Newest
        createPurchaseOrder("PO-NEW", now, null);

        // Expect order: NEW, MID, OLD
        mockMvc.perform(get("/api/purchase-orders")
                .param("page", "0")
                .param("size", "10")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(3)))
                .andExpect(jsonPath("$.data.records[0].orderNo", is("PO-NEW")))
                .andExpect(jsonPath("$.data.records[1].orderNo", is("PO-MID")))
                .andExpect(jsonPath("$.data.records[2].orderNo", is("PO-OLD")));
    }
    
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testSortStabilityWithSameTime() throws Exception {
        LocalDateTime fixedTime = LocalDateTime.now();

        // Create 3 orders with SAME time
        // Since ID is auto-increment, they will have IDs 1, 2, 3 (relative)
        
        // PO1 (ID=1)
        createPurchaseOrder("PO-SAME-1", fixedTime, null);
        
        // PO2 (ID=2)
        createPurchaseOrder("PO-SAME-2", fixedTime, null);
        
        // PO3 (ID=3)
        createPurchaseOrder("PO-SAME-3", fixedTime, null);

        // Expect order: PO-SAME-3, PO-SAME-2, PO-SAME-1 (ID DESC)
        // If we only sort by createdAt, the order is indeterminate for same time.
        // We want to enforce ID DESC as secondary sort.
        
        mockMvc.perform(get("/api/purchase-orders")
                .param("page", "0")
                .param("size", "10")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(3)))
                .andExpect(jsonPath("$.data.records[0].orderNo", is("PO-SAME-3")))
                .andExpect(jsonPath("$.data.records[1].orderNo", is("PO-SAME-2")))
                .andExpect(jsonPath("$.data.records[2].orderNo", is("PO-SAME-1")));
    }
}
