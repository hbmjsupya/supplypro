package com.supplypro.controller;

import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.InboundOrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
public class CleanupTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PurchaseOrderRepository purchaseOrderRepository;

    @MockBean
    private InboundOrderRepository inboundOrderRepository;

    @Test
    @WithMockUser(username = "admin")
    public void testCleanupPurchaseOrders() throws Exception {
        // Mock data for backup
        when(purchaseOrderRepository.findAll()).thenReturn(Collections.emptyList());
        when(purchaseOrderRepository.count()).thenReturn(10L).thenReturn(0L);
        when(inboundOrderRepository.count()).thenReturn(5L).thenReturn(0L);

        // Execute cleanup with confirm=true
        mockMvc.perform(post("/api/system/maintenance/cleanup-purchase-orders")
                .param("confirm", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.report.purchase_orders_deleted").value(10))
                .andExpect(jsonPath("$.report.inbound_orders_deleted").value(5));

        // Verify deletions
        verify(inboundOrderRepository).deleteAll();
        verify(purchaseOrderRepository).deleteAll();
    }
    
    @Test
    @WithMockUser(username = "admin")
    public void testCleanupPurchaseOrdersWithoutConfirm() throws Exception {
        mockMvc.perform(post("/api/system/maintenance/cleanup-purchase-orders"))
                .andExpect(status().is4xxClientError()); // Should be 400 or 500 depending on exception handler
    }
}
