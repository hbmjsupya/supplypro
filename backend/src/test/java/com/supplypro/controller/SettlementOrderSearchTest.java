package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.service.SettlementService;
import com.supplypro.repository.OutboundOrderRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.SupplierRepository;
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

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class SettlementOrderSearchTest {

    @InjectMocks
    private SettlementOrderController settlementOrderController;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    
    // Mock unused dependencies to avoid context load issues if this were an integration test
    @Mock private OutboundOrderRepository outboundOrderRepository;
    @Mock private LogisticsProviderRepository logisticsProviderRepository;
    @Mock private SupplierRepository supplierRepository;
    @Mock private SettlementService settlementService;

    private SettlementOrder validSettlement;
    private SettlementOrder invalidSettlement;
    private PurchaseOrder po;

    @BeforeEach
    void setUp() {
        validSettlement = new SettlementOrder();
        validSettlement.setId(1L);
        validSettlement.setSettlementNo("SET001");
        validSettlement.setRelatedOrderNo("PO-VALID");
        validSettlement.setType(SettlementOrder.Type.LOGISTICS);
        validSettlement.setStatus(SettlementOrder.Status.PENDING);

        invalidSettlement = new SettlementOrder();
        invalidSettlement.setId(2L);
        invalidSettlement.setSettlementNo("SET002");
        invalidSettlement.setRelatedOrderNo("PO-INVALID"); // No matching PO
        invalidSettlement.setType(SettlementOrder.Type.LOGISTICS);
        invalidSettlement.setStatus(SettlementOrder.Status.PENDING);

        po = new PurchaseOrder();
        po.setOrderNo("PO-VALID");
        po.setId(100L);
    }

    @Test
    void testSearch_ReturnsOnlyValidAssociations() {
        // Arrange
        String searchKeyword = "PO";
        List<SettlementOrder> mockPageContent = List.of(validSettlement, invalidSettlement);
        Page<SettlementOrder> mockPage = new PageImpl<>(mockPageContent);

        when(settlementOrderRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(mockPage);

        // Mock PO fetch - Only return PO for the valid one
        when(purchaseOrderRepository.findByOrderNoIn(any())).thenReturn(List.of(po));

        // Act
        ResponseEntity<Map<String, Object>> response = settlementOrderController.getPendingDeliverySettlements(searchKeyword, null, null, null, null, null, 0, 10);

        // Assert
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        List<Map<String, Object>> result = (List<Map<String, Object>>) body.get("records");
        assertEquals(1, result.size());
        assertEquals("PO-VALID", result.get(0).get("relatedOrderNo"));
        assertEquals(1L, result.get(0).get("id"));
    }

    @Test
    void testSearch_EmptyResult_WhenNoAssociationsFound() {
        // Arrange
        String searchKeyword = "PO-INVALID";
        List<SettlementOrder> mockPageContent = List.of(invalidSettlement);
        Page<SettlementOrder> mockPage = new PageImpl<>(mockPageContent);

        when(settlementOrderRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(mockPage);

        // Mock PO fetch - Return empty list (no PO found)
        when(purchaseOrderRepository.findByOrderNoIn(any())).thenReturn(Collections.emptyList());

        // Act
        ResponseEntity<Map<String, Object>> response = settlementOrderController.getPendingDeliverySettlements(searchKeyword, null, null, null, null, null, 0, 10);

        // Assert
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        List<Map<String, Object>> result = (List<Map<String, Object>>) body.get("records");
        assertTrue(result.isEmpty());
    }
}
