package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.impl.PurchaseOrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderCrossMethodValidationTest {

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    // Mock other dependencies
    @Mock private com.supplypro.repository.LogisticsProviderRepository logisticsProviderRepository;
    @Mock private com.supplypro.repository.SettlementOrderRepository settlementOrderRepository;
    @Mock private com.supplypro.repository.InboundOrderRepository inboundOrderRepository;
    @Mock private com.supplypro.repository.LogisticsTrackRepository logisticsTrackRepository;
    @Mock private com.supplypro.repository.PurchaseOrderLogRepository purchaseOrderLogRepository;
    @Mock private com.supplypro.service.PurchaseOrderSnapshotService snapshotService;

    private PurchaseOrder currentPo;

    @BeforeEach
    void setUp() {
        currentPo = new PurchaseOrder();
        currentPo.setId(1L);
        currentPo.setOrderNo("C20230101001");
        currentPo.setDeliveryMethod("SelfDelivery");
    }

    @Test
    void testCrossMethodValidation_LogisticsDuplicate_ShouldBeDetected() {
        // Scenario: 
        // 1. Existing PO (Logistics) has tracking number "T1" and Fee 10.
        // 2. Current PO (SelfDelivery) tries to use "T1" and Fee 10.
        // 3. Should throw exception.

        String trackingNo = "T1";
        BigDecimal fee = new BigDecimal("10.00");

        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(currentPo));

        // Mock existing Logistics PO
        PurchaseOrder duplicatePo = new PurchaseOrder();
        duplicatePo.setOrderNo("C20230101002");
        duplicatePo.setLogisticsFee(new BigDecimal("10.00"));
        duplicatePo.setDeliveryMethod("Logistics");
        duplicatePo.setTrackingNumber(trackingNo);

        // MOCK BEHAVIOR: 
        // The service now uses findByTrackingNumber
        when(purchaseOrderRepository.findByTrackingNumber(trackingNo))
                .thenReturn(List.of(duplicatePo));

        // Act & Assert
        // This SHOULD fail (i.e. throw exception) now.
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            purchaseOrderService.updateLogisticsInfo(
                    1L, "Self", trackingNo, null, null, "Driver", "123", "Plate",
                    fee, null, "SelfDelivery"
            );
        });
        
        assertTrue(exception.getMessage().contains("不可重复计费"));
    }
}
