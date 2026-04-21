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
@org.springframework.test.context.TestPropertySource(properties = "supplypro.rate-limit.enabled=false")
public class PurchaseOrderSearchTest {

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

        // Create PO 1: C202603021401003
        createPurchaseOrder("C202603021401003", new BigDecimal("100.00"));

        // Create PO 2: C202603021401004
        createPurchaseOrder("C202603021401004", new BigDecimal("200.00"));
        
        // Create PO 3: Similar prefix
        createPurchaseOrder("C202603021401003-1", new BigDecimal("150.00"));
    }

    private void createPurchaseOrder(String orderNo, BigDecimal amount) {
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo(orderNo);
        po.setTotalAmount(amount);
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setCreatedAt(LocalDateTime.now());
        po.setSupplierId(1L); // Dummy
        po.setType(PurchaseOrder.Type.STANDARD);
        
        PurchaseOrder saved = purchaseOrderRepository.saveAndFlush(po);
        
        // Ensure snapshot is created (since search uses snapshots primarily)
        snapshotService.captureSnapshot(saved);
    }

    @Test
    public void testRepositoryDirectly() {
        org.springframework.data.jpa.domain.Specification<com.supplypro.entity.PurchaseOrderSnapshot> spec = (root, query, cb) -> {
            return cb.equal(root.get("orderNo"), "C202603021401");
        };
        
        java.util.List<com.supplypro.entity.PurchaseOrderSnapshot> results = snapshotRepository.findAll(spec);
        System.out.println("DEBUG: Direct Repository Search Size: " + results.size());
        
        org.junit.jupiter.api.Assertions.assertEquals(0, results.size());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testExactMatch_003() throws Exception {
        // Search for ...003
        // Expect ONLY ...003 (Strict Exact Match)
        mockMvc.perform(get("/api/purchase-orders")
                .param("keyword", "C202603021401003")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(1)))
                .andExpect(jsonPath("$.data.records[0].orderNo", is("C202603021401003")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testExactMatch_004() throws Exception {
        // Search for ...004
        mockMvc.perform(get("/api/purchase-orders")
                .param("keyword", "C202603021401004")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(1)))
                .andExpect(jsonPath("$.data.records[0].orderNo", is("C202603021401004")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testPrefixMatch_ShouldFail() throws Exception {
        // Search for prefix C202603021401
        // With fuzzy match, this would return all 3 (via Fallback LIKE).
        // With exact match, this should return 0 (Fallback EQUAL).
        
        mockMvc.perform(get("/api/purchase-orders")
                .param("keyword", "C202603021401")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(0))); // Expect 0
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testStability_1000RandomSearches() throws Exception {
        // 6) Stability test: 1000 random searches
        int iterations = 1000;
        long startTime = System.currentTimeMillis();
        
        for (int i = 0; i < iterations; i++) {
            String randomOrderNo = "RANDOM-" + java.util.UUID.randomUUID().toString();
            
            mockMvc.perform(get("/api/purchase-orders")
                    .param("keyword", randomOrderNo)
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.records", hasSize(0)));
        }
        
        long duration = System.currentTimeMillis() - startTime;
        System.out.println("Stability Test (1000 searches) took: " + duration + "ms");
        System.out.println("Average time per search: " + (duration / (double)iterations) + "ms");
    }
}
