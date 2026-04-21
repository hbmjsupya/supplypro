package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.SupplierPrepaymentLogRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.service.PurchaseOrderService;
import com.supplypro.service.PurchaseOrderSnapshotService;
import com.supplypro.service.RegionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderFeatureTest {

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @Mock
    private PurchaseOrderSnapshotService snapshotService;

    @Mock
    private RegionService regionService;

    @Mock
    private PurchaseOrderLogRepository purchaseOrderLogRepository;
    
    @Mock
    private SupplierPrepaymentLogRepository supplierPrepaymentLogRepository;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @InjectMocks
    private PurchaseOrderController purchaseOrderController;

    @org.junit.jupiter.api.AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    public void testGetById_AddressConversion() {
        Long id = 1L;
        PurchaseOrder po = new PurchaseOrder();
        po.setId(id);
        po.setProvince("110000");
        po.setCity("110100");
        po.setDistrict("110101");

        when(purchaseOrderRepository.findByIdWithItems(id)).thenReturn(java.util.List.of(po));
        when(snapshotService.getLatestSnapshotAsPO(id)).thenReturn(Optional.empty()); // Assume no snapshot for simplicity

        when(regionService.getNameByCode("110000")).thenReturn("Beijing");
        when(regionService.getNameByCode("110100")).thenReturn("Beijing City");
        when(regionService.getNameByCode("110101")).thenReturn("Dongcheng District");

        ResponseEntity<Map<String, Object>> response = purchaseOrderController.getById(id);
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        PurchaseOrder resultPo = (PurchaseOrder) body.get("data");

        assertEquals("Beijing", resultPo.getProvince());
        assertEquals("Beijing City", resultPo.getCity());
        assertEquals("Dongcheng District", resultPo.getDistrict());
    }

    @Test
    public void testReceive_Success() {
        Long id = 1L;
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        // when(authentication.isAuthenticated()).thenReturn(true); // Unused in controller
        when(authentication.getName()).thenReturn("admin");
        SecurityContextHolder.setContext(securityContext);

        doNothing().when(purchaseOrderService).receivePurchaseOrder(id, "admin");

        ResponseEntity<Map<String, Object>> response = purchaseOrderController.receive(id);

        assertEquals(200, response.getBody().get("code"));
        verify(purchaseOrderService, times(1)).receivePurchaseOrder(id, "admin");
    }

    @Test
    public void testReceive_Failure() {
        Long id = 1L;
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        // when(authentication.isAuthenticated()).thenReturn(true); // Unused in controller
        when(authentication.getName()).thenReturn("admin");
        SecurityContextHolder.setContext(securityContext);

        doThrow(new RuntimeException("Invalid status")).when(purchaseOrderService).receivePurchaseOrder(id, "admin");

        ResponseEntity<Map<String, Object>> response = purchaseOrderController.receive(id);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("Invalid status", response.getBody().get("message"));
    }
}
