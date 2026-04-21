package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.KuaidiNiaoService;
import com.supplypro.dto.LogisticsResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class LogisticsReproTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;
    
    @Autowired
    private com.supplypro.repository.SupplierRepository supplierRepository;

    @MockBean
    private KuaidiNiaoService kuaidiNiaoService;

    private String targetTrackingNo = "YT3761367226619";
    private String targetOrderNo = "C202602251527001";

    @BeforeEach
    public void setup() {
        // Setup Supplier
        com.supplypro.entity.Supplier supplier = new com.supplypro.entity.Supplier();
        supplier.setName("Repro Supplier");
        supplier.setSupplierNo("SUP-REPRO-001");
        supplier.setSettlementType(com.supplypro.entity.Supplier.SettlementType.CASH);
        supplier = supplierRepository.save(supplier);

        // Create PO 1 with the target OrderNo
        PurchaseOrder po1 = new PurchaseOrder();
        po1.setOrderNo(targetOrderNo);
        po1.setTrackingNumber(targetTrackingNo);
        po1.setLogisticsCompany("YTO");
        po1.setStatus(PurchaseOrder.Status.SHIPPED);
        po1.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
        po1.setTotalAmount(new BigDecimal("100.00"));
        po1.setType(PurchaseOrder.Type.STANDARD);
        po1.setSupplier(supplier);
        purchaseOrderRepository.save(po1);

        // Create PO 2 (Duplicate Tracking No) to trigger "NonUniqueResultException" if bug exists
        PurchaseOrder po2 = new PurchaseOrder();
        po2.setOrderNo("C202602251527002");
        po2.setTrackingNumber(targetTrackingNo); // Same tracking number
        po2.setLogisticsCompany("YTO");
        po2.setStatus(PurchaseOrder.Status.SHIPPED);
        po2.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
        po2.setTotalAmount(new BigDecimal("200.00"));
        po2.setType(PurchaseOrder.Type.STANDARD);
        po2.setSupplier(supplier);
        purchaseOrderRepository.save(po2);

        // Mock KuaidiNiao Response
        LogisticsResponse mockResponse = new LogisticsResponse();
        mockResponse.setSuccess(true);
        mockResponse.setState("2"); // In Transit
        mockResponse.setTraces(new ArrayList<>());
        when(kuaidiNiaoService.track(anyString(), anyString())).thenReturn(mockResponse);
    }

    @Test
    public void testTrackByTrackingNumber_ShouldReturn200_WithMultiplePOs() throws Exception {
        mockMvc.perform(get("/api/logistics/track/courier/" + targetTrackingNo)
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.relatedOrders").isArray())
                .andExpect(jsonPath("$.data.relatedOrders", hasSize(2)));
    }

    @Test
    public void testTrackByPurchaseOrderId_ShouldReturn200_WithMultiplePOs() throws Exception {
        // Find the PO ID
        PurchaseOrder po = purchaseOrderRepository.findByOrderNo(targetOrderNo);
        
        mockMvc.perform(get("/api/logistics/track/purchase-order/" + po.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.relatedOrders").isArray())
                .andExpect(jsonPath("$.data.relatedOrders", hasSize(2)));
    }
}
