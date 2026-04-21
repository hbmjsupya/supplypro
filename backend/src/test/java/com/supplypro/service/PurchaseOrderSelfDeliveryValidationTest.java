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
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderSelfDeliveryValidationTest {

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    // We need to mock other dependencies of PurchaseOrderServiceImpl to avoid NPEs during test execution
    // even if we don't use them directly in the test method, because @InjectMocks might fail or leave them null.
    // However, since we are testing a specific method, we just need to ensure the methods called inside updateLogisticsInfo work.
    // It calls: findById, checkWaybill (internal), save, logisticsProviderRepository.findById (if providerId set), etc.
    // We should be careful about internal calls.

    @Mock
    private com.supplypro.repository.LogisticsProviderRepository logisticsProviderRepository;
    @Mock
    private com.supplypro.repository.SettlementOrderRepository settlementOrderRepository;
    @Mock
    private com.supplypro.repository.InboundOrderRepository inboundOrderRepository;
    @Mock
    private com.supplypro.repository.LogisticsTrackRepository logisticsTrackRepository;
    @Mock
    private com.supplypro.repository.PurchaseOrderLogRepository purchaseOrderLogRepository;
    @Mock
    private com.supplypro.service.PurchaseOrderSnapshotService snapshotService;

    private PurchaseOrder currentPo;

    @BeforeEach
    void setUp() {
        currentPo = new PurchaseOrder();
        currentPo.setId(1L);
        currentPo.setOrderNo("C20230101001");
        currentPo.setDeliveryMethod("SelfDelivery");
    }

    @Test
    void testSelfDelivery_DuplicateWaybill_WithFee_ShouldThrowException() {
        // Arrange
        String trackingNo = "SD123456";
        BigDecimal fee = new BigDecimal("10.00");

        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(currentPo));

        // Mock duplication check
        PurchaseOrder duplicatePo = new PurchaseOrder();
        duplicatePo.setOrderNo("C20230101002");
        duplicatePo.setLogisticsFee(new BigDecimal("20.00")); // Existing fee > 0
        duplicatePo.setDeliveryMethod("SelfDelivery");

        when(purchaseOrderRepository.findByTrackingNumberAndDeliveryMethodAndOrderNoNot(
                eq(trackingNo), eq("SelfDelivery"), eq(currentPo.getOrderNo())
        )).thenReturn(List.of(duplicatePo));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            purchaseOrderService.updateLogisticsInfo(
                    1L, "Self", trackingNo, null, null, "Driver", "123", "Plate",
                    fee, null, "SelfDelivery"
            );
        });

        assertTrue(exception.getMessage().contains("不可重复计费"));
        assertTrue(exception.getMessage().contains("C20230101002"));
    }

    @Test
    void testSelfDelivery_DuplicateWaybill_ZeroFee_ShouldPass() {
        // Arrange
        String trackingNo = "SD123456";
        BigDecimal fee = new BigDecimal("10.00");

        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(currentPo));

        // Mock duplication check - Existing PO has 0 fee
        PurchaseOrder duplicatePo = new PurchaseOrder();
        duplicatePo.setOrderNo("C20230101002");
        duplicatePo.setLogisticsFee(BigDecimal.ZERO); // Existing fee is 0
        duplicatePo.setDeliveryMethod("SelfDelivery");

        when(purchaseOrderRepository.findByTrackingNumberAndDeliveryMethodAndOrderNoNot(
                eq(trackingNo), eq("SelfDelivery"), eq(currentPo.getOrderNo())
        )).thenReturn(List.of(duplicatePo));

        // Act
        assertDoesNotThrow(() -> {
            purchaseOrderService.updateLogisticsInfo(
                    1L, "Self", trackingNo, null, null, "Driver", "123", "Plate",
                    fee, null, "SelfDelivery"
            );
        });

        // Verify save was called
        verify(purchaseOrderRepository).save(any(PurchaseOrder.class));
    }

    @Test
    void testSelfDelivery_NoDuplicate_ShouldPass() {
        // Arrange
        String trackingNo = "SDNew123";
        BigDecimal fee = new BigDecimal("10.00");

        when(purchaseOrderRepository.findById(1L)).thenReturn(Optional.of(currentPo));

        // Mock no duplication
        when(purchaseOrderRepository.findByTrackingNumberAndDeliveryMethodAndOrderNoNot(
                eq(trackingNo), eq("SelfDelivery"), eq(currentPo.getOrderNo())
        )).thenReturn(Collections.emptyList());

        // Act
        assertDoesNotThrow(() -> {
            purchaseOrderService.updateLogisticsInfo(
                    1L, "Self", trackingNo, null, null, "Driver", "123", "Plate",
                    fee, null, "SelfDelivery"
            );
        });

        // Verify save
        verify(purchaseOrderRepository).save(any(PurchaseOrder.class));
    }
}
