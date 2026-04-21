package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class SettlementOrderPendingMappingTest {

    @InjectMocks
    private SettlementOrderController settlementOrderController;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    private SettlementOrder settlement;
    private PurchaseOrder po;
    private Supplier supplier;

    @BeforeEach
    void setUp() {
        supplier = new Supplier();
        supplier.setId(10L);
        supplier.setName("Test Supplier");
        supplier.setSettlementType(Supplier.SettlementType.PERIOD); // Use valid Enum
        supplier.setSettlementPeriod(30);

        po = new PurchaseOrder();
        po.setId(100L);
        po.setOrderNo("PO-TEST");
        po.setSupplier(supplier);
        po.setStatus(PurchaseOrder.Status.SHIPPED);

        settlement = new SettlementOrder();
        settlement.setId(1L);
        settlement.setSettlementNo("PS20230101001");
        settlement.setRelatedOrderNo("PO-TEST");
        settlement.setType(SettlementOrder.Type.LOGISTICS);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        // Important: settlement has NO direct supplier or logistics provider linked initially
        // This simulates the issue where "unknown" was shown
    }

    @Test
    void testGetPendingDeliverySettlements_ShouldInferSupplierFromPO() {
        // Arrange
        Page<SettlementOrder> page = new PageImpl<>(List.of(settlement));
        when(settlementOrderRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(page);
        
        when(purchaseOrderRepository.findByOrderNoIn(any())).thenReturn(List.of(po));

        // Act
        ResponseEntity<Map<String, Object>> response = settlementOrderController.getPendingDeliverySettlements(null, null, null, null, null, 0, 10);

        // Assert
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        List<Map<String, Object>> result = (List<Map<String, Object>>) body.get("records");
        assertNotNull(result);
        assertEquals(1, result.size());
        
        Map<String, Object> item = result.get(0);
        
        // 1. Check Supplier Name Inference
        assertEquals("Test Supplier", item.get("supplierName"));
        assertEquals(10L, item.get("supplierId"));
        
        // 2. Check Chinese Translation
        assertEquals("月结", item.get("settlementType"));
        assertEquals("月结", item.get("settlementCycle"));
        assertEquals("已发货", item.get("status"));
    }
}
