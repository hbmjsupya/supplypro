package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

class SettlementOrderControllerTest {

    @InjectMocks
    private SettlementOrderController controller;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }
    
    @Mock
    private com.supplypro.service.SettlementService settlementService;

    @Test
    void testGenerateSettlement_TypeSafety() {
        // Arrange
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("supplierId", 123); // Integer
        java.util.List<Object> ids = new java.util.ArrayList<>();
        ids.add(1);
        ids.add("2");
        ids.add(3L);
        payload.put("orderIds", ids);
        
        when(settlementService.createSettlement(any(Long.class), anyList(), any(String.class)))
            .thenReturn(new SettlementOrder());

        // Act
        controller.generate(payload);
        
        // Assert: no exception thrown
    }

    @Test
    void testGetPendingDeliverySettlements_SelfDelivery_Fisherman() {
        // Mock Settlement Order
        SettlementOrder so = new SettlementOrder();
        so.setId(1L);
        so.setSettlementNo("PS202602271200000001");
        so.setRelatedOrderNo("PO123");
        so.setDeliveryMethod("SelfDelivery");
        so.setTotalAmount(new BigDecimal("100.00"));
        so.setType(SettlementOrder.Type.LOGISTICS);
        
        // Mock Supplier with FISHERMAN type
        Supplier supplier = new Supplier();
        supplier.setId(10L);
        supplier.setName("Test Supplier");
        supplier.setSettlementType(Supplier.SettlementType.FISHERMAN);
        so.setSupplier(supplier);
        
        when(settlementOrderRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(Collections.singletonList(so)));

        // Mock PO
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO123");
        po.setDeliveryMethod("SelfDelivery");
        po.setDeliverer("Driver");
        po.setDelivererPhone("1234567890");
        po.setTrackingNumber("SD123456"); // Set internal tracking number
        
        when(purchaseOrderRepository.findByOrderNoIn(anyList()))
            .thenReturn(Collections.singletonList(po));

        ResponseEntity<Map<String, Object>> response = controller.getPendingDeliverySettlements(null, null, null, null, null, null, 0, 10);
        List<Map<String, Object>> list = (List<Map<String, Object>>) response.getBody().get("records");
        
        assertEquals(1, list.size());
        Map<String, Object> item = list.get(0);
        
        assertEquals("SD123456", item.get("deliveryNo")); // Expect tracking number
        assertEquals("SelfDelivery", item.get("type"));
        // Details format: "配送员: Driver, 电话: 1234567890"
        assertTrue(((String)item.get("details")).contains("配送员: Driver"));
        
        // Check Settlement Type Logic
        assertEquals("FISHERMAN", item.get("settlementType"));
        assertEquals("", item.get("settlementCycle")); // Should be empty for Fisherman
    }

    @Test
    void testGetPendingDeliverySettlements_Logistics_Monthly() {
        // Mock Settlement Order
        SettlementOrder so = new SettlementOrder();
        so.setId(2L);
        so.setSettlementNo("PS202602271200000002");
        so.setRelatedOrderNo("PO456");
        so.setDeliveryMethod("Logistics"); 
        so.setTotalAmount(new BigDecimal("50.00"));
        so.setType(SettlementOrder.Type.LOGISTICS);
        
        // Mock Logistics Provider with PERIOD type
        LogisticsProvider lp = new LogisticsProvider();
        lp.setId(20L);
        lp.setName("SF Express");
        lp.setSettlementType(LogisticsProvider.SettlementType.PERIOD);
        lp.setSettlementPeriod(30);
        so.setLogisticsProvider(lp);
        
        when(settlementOrderRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(Collections.singletonList(so)));

        // Mock PO
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO456");
        po.setLogisticsCompany("SF");
        po.setTrackingNumber("SF123456");
        
        when(purchaseOrderRepository.findByOrderNoIn(anyList()))
            .thenReturn(Collections.singletonList(po));

        ResponseEntity<Map<String, Object>> response = controller.getPendingDeliverySettlements(null, null, null, null, null, null, 0, 10);
        List<Map<String, Object>> list = (List<Map<String, Object>>) response.getBody().get("records");
        
        assertEquals(1, list.size());
        Map<String, Object> item = list.get(0);
        
        assertEquals("SF123456", item.get("deliveryNo")); // Expect tracking number
        assertEquals("Logistics", item.get("type"));
        assertTrue(((String)item.get("details")).contains("单号: SF123456"));
        
        // Check Settlement Type Logic
        assertEquals("PERIOD", item.get("settlementType"));
        assertEquals("Monthly", item.get("settlementCycle")); // 30 days -> Monthly
    }
}
