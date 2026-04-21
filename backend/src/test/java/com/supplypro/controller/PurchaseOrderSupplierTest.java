package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class PurchaseOrderSupplierTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PurchaseOrderRepository purchaseOrderRepository;

    @MockBean
    private InboundOrderRepository inboundOrderRepository;

    @MockBean
    private WarehouseRepository warehouseRepository;

    @MockBean
    private ProductRepository productRepository;

    @Test
    @WithMockUser(username = "testuser")
    public void testCreatePurchaseOrderWithSupplierId() throws Exception {
        // Construct JSON payload mimicking Frontend
        Map<String, Object> payload = new HashMap<>();
        payload.put("supplierId", 123L);
        payload.put("type", "INBOUND");
        payload.put("totalAmount", 100.00);
        payload.put("status", "PENDING");
        // Add other required fields if any (e.g. nullable=false)
        // PurchaseOrder.orderNo is handled by backend if null/empty
        
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> {
            PurchaseOrder saved = i.getArgument(0);
            saved.setId(101L);
            return saved;
        });

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(new ObjectMapper().writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Verify that the saved entity has supplier set
        ArgumentCaptor<PurchaseOrder> captor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository).save(captor.capture());
        
        PurchaseOrder savedPo = captor.getValue();
        assertNotNull(savedPo.getSupplier(), "Supplier should not be null");
        assertEquals(123L, savedPo.getSupplier().getId(), "Supplier ID should be 123");
    }
}
