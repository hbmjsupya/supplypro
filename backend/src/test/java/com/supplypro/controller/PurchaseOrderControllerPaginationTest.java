package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.service.PurchaseOrderService;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.mockito.ArgumentCaptor;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderControllerPaginationTest {

    private MockMvc mockMvc;

    @InjectMocks
    private PurchaseOrderController purchaseOrderController;

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private InboundOrderRepository inboundOrderRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @BeforeEach
    public void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(purchaseOrderController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    public void testListPagination() throws Exception {
        // Mock Service response
        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO-TEST-001");
        Page<PurchaseOrder> pageResult = new PageImpl<>(Collections.singletonList(po));

        when(purchaseOrderService.getPurchaseOrders(any(), any(Pageable.class))).thenReturn(pageResult);

        // Perform GET request with page=0 (frontend sends 0 after my fix)
        mockMvc.perform(get("/api/purchase-orders")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].orderNo").value("PO-TEST-001"))
                .andExpect(jsonPath("$.data.pageNum").value(1)); // Controller returns number + 1

        // Verify that Service was called with Page 0
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(purchaseOrderService).getPurchaseOrders(any(), pageableCaptor.capture());
        
        Pageable capturedPageable = pageableCaptor.getValue();
        // Since controller does PageRequest.of(page, size), if we send page=0, it should be 0.
        // Wait, controller code: PageRequest.of(page, size, Sort.by("id").descending());
        // So if param page=0, PageRequest page is 0.
        
        assert capturedPageable.getPageNumber() == 0;
    }
}
