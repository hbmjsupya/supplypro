package com.supplypro.controller;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.entity.PurchaseOrderSnapshot;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.SupplierPrepaymentLogRepository;
import com.supplypro.service.PurchaseOrderService;
import com.supplypro.service.PurchaseOrderSnapshotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.mockito.Spy;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderControllerTest {

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private InboundOrderRepository inboundOrderRepository;

    @Mock
    private PurchaseOrderLogRepository purchaseOrderLogRepository;
    
    @Mock
    private SupplierPrepaymentLogRepository supplierPrepaymentLogRepository;
    
    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @Mock
    private PurchaseOrderSnapshotService snapshotService;

    @InjectMocks
    private PurchaseOrderController purchaseOrderController;

    @BeforeEach
    void setUp() {
        // No setup needed for simple mocks
        // For the new structure, we expect a flat map with both order fields and refundRecords
        // mockMvc.perform(get("/api/purchase-orders/" + po.getId()))
        //       .andExpect(status().isOk())
        //       .andExpect(jsonPath("$.code").value(200))
        //       .andExpect(jsonPath("$.data.orderNo").value("PO-TEST-123"))
        //       .andExpect(jsonPath("$.data.refundRecords").isArray());

        // Since we cannot easily rewrite the whole test file here without seeing it,
        // we assume the existing tests might fail if they check specific structure.
        // But let's check the test file content first.
    }

    @Test
    void testCheckWaybill_ReturnsResult() {
        // Arrange
        String waybillNo = "SF123";
        String deliveryType = "LOGISTICS";
        String excludePurchaseNo = "PO001";
        
        Map<String, Object> mockResult = new HashMap<>();
        mockResult.put("hasDuplicate", true);
        mockResult.put("duplicatePurchaseNo", "PO002");
        mockResult.put("duplicateAmount", 25.00);
        
        when(purchaseOrderService.checkWaybill(waybillNo, deliveryType, excludePurchaseNo))
                .thenReturn(mockResult);

        // Act
        ResponseEntity<Map<String, Object>> response = purchaseOrderController.checkWaybill(waybillNo, deliveryType, excludePurchaseNo);

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(true, response.getBody().get("hasDuplicate"));
        assertEquals("PO002", response.getBody().get("duplicatePurchaseNo"));
        assertEquals(25.00, response.getBody().get("duplicateAmount"));
    }

    @Test
    void testCheckWaybill_NoDuplicate() {
        // Arrange
        String waybillNo = "SF123";
        String deliveryType = "LOGISTICS";
        
        Map<String, Object> mockResult = new HashMap<>();
        mockResult.put("hasDuplicate", false);
        
        when(purchaseOrderService.checkWaybill(waybillNo, deliveryType, null))
                .thenReturn(mockResult);

        // Act
        ResponseEntity<Map<String, Object>> response = purchaseOrderController.checkWaybill(waybillNo, deliveryType, null);

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(false, response.getBody().get("hasDuplicate"));
    }

    @Test
    void testGetAll_PopulatesStockInNo() {
        // Arrange
        PurchaseOrderSnapshot snapshot = new PurchaseOrderSnapshot();
        snapshot.setId(1L);
        snapshot.setOrderNo("PO123");
        // snapshot.setType(PurchaseOrder.Type.INBOUND); // Snapshot might store type as string or enum, assuming PO conversion handles it
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setBizType(PurchaseOrder.BizType.INBOUND);
        po.setCurrentSnapshot(snapshot);

        List<PurchaseOrder> poList = Collections.singletonList(po);
        Page<PurchaseOrder> page = new PageImpl<>(poList);

        // Mock snapshot search (now PO search)
        when(purchaseOrderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page);
        
        // Mock conversion
        when(snapshotService.convertSnapshotToPO(any(PurchaseOrderSnapshot.class))).thenReturn(po);

        InboundOrder inboundOrder = new InboundOrder();
        inboundOrder.setInboundNo("IN123");
        inboundOrder.setPurchaseOrder(po);

        when(inboundOrderRepository.findByPurchaseOrderIn(any())).thenReturn(Collections.singletonList(inboundOrder));

        // Act
        ResponseEntity<Map<String, Object>> response = purchaseOrderController.getAll(
                0, 10, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        // Assert
        assertNotNull(response.getBody());
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        List<PurchaseOrder> content = (List<PurchaseOrder>) data.get("records");
        
        assertEquals(1, content.size());
        assertEquals("IN123", content.get(0).getStockInNo());
    }

    @Test
    void testGetAll_HandlesNullInboundOrderData() {
        // Arrange
        PurchaseOrderSnapshot snapshot = new PurchaseOrderSnapshot();
        snapshot.setId(1L);
        snapshot.setOrderNo("PO123");
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setBizType(PurchaseOrder.BizType.INBOUND);
        po.setCurrentSnapshot(snapshot);

        List<PurchaseOrder> poList = Collections.singletonList(po);
        Page<PurchaseOrder> page = new PageImpl<>(poList);

        when(purchaseOrderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page);
        
        when(snapshotService.convertSnapshotToPO(any(PurchaseOrderSnapshot.class))).thenReturn(po);

        // Create problematic InboundOrder with null InboundNo
        InboundOrder badInboundOrder = new InboundOrder();
        badInboundOrder.setInboundNo(null); // Null inboundNo causes NPE in Collectors.toMap without filter
        badInboundOrder.setPurchaseOrder(po);

        when(inboundOrderRepository.findByPurchaseOrderIn(any())).thenReturn(Collections.singletonList(badInboundOrder));

        // Act
        ResponseEntity<Map<String, Object>> response = purchaseOrderController.getAll(
                0, 10, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        // Assert
        assertNotNull(response.getBody());
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        List<PurchaseOrder> content = (List<PurchaseOrder>) data.get("records");
        
        assertEquals(1, content.size());
        // stockInNo should be null, but no exception thrown
        assertEquals(null, content.get(0).getStockInNo());
    }

    @Test
    void testGetById_TranslatesRemarks() {
        // Arrange
        Long poId = 1L;
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setOrderNo("PO123");
        po.setStatus(PurchaseOrder.Status.PENDING); // Set status for comparison

        // Mock live fetch
        when(purchaseOrderRepository.findByIdWithItems(poId)).thenReturn(java.util.List.of(po));
        
        // Mock snapshot fetch (return null or same status to avoid async update logic interference)
        when(snapshotService.getLatestSnapshotAsPO(poId)).thenReturn(Optional.of(po));
        
        PurchaseOrderLog log1 = new PurchaseOrderLog();
        log1.setRemark("Order Created");
        
        PurchaseOrderLog log2 = new PurchaseOrderLog();
        log2.setRemark("Updated logistics info with ETA: 2023-10-01");
        
        PurchaseOrderLog log3 = new PurchaseOrderLog();
        log3.setRemark("Status changed from PENDING to CONFIRMED");

        PurchaseOrderLog log4 = new PurchaseOrderLog();
        log4.setRemark("Inbound Purchase Order initialized with PENDING status");

        PurchaseOrderLog log5 = new PurchaseOrderLog();
        log5.setRemark("Order Shipped");

        // Add remaining types requested by user
        PurchaseOrderLog log6 = new PurchaseOrderLog();
        log6.setRemark("Order Submitted");
        PurchaseOrderLog log7 = new PurchaseOrderLog();
        log7.setRemark("Order Approved");
        PurchaseOrderLog log8 = new PurchaseOrderLog();
        log8.setRemark("Order Rejected");
        PurchaseOrderLog log9 = new PurchaseOrderLog();
        log9.setRemark("Order Closed");
        PurchaseOrderLog log10 = new PurchaseOrderLog();
        log10.setRemark("Order Completed");
        PurchaseOrderLog log11 = new PurchaseOrderLog();
        log11.setRemark("Order Cancelled");

        List<PurchaseOrderLog> logs = Arrays.asList(log1, log2, log3, log4, log5, log6, log7, log8, log9, log10, log11);
        when(purchaseOrderLogRepository.findByPurchaseOrderIdOrderByCreatedAtDesc(poId)).thenReturn(logs);
        
        when(supplierPrepaymentLogRepository.findByRelatedOrderNoAndType(any(), any())).thenReturn(Collections.emptyList());
        when(settlementOrderRepository.findByRelatedOrderNo(any())).thenReturn(Collections.emptyList());

        // Act
        ResponseEntity<Map<String, Object>> response = purchaseOrderController.getById(poId);

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        Map<String, Object> responseData = (Map<String, Object>) response.getBody().get("data");
        assertEquals("SNAPSHOT", responseData.get("dataSource")); // Since statuses match
        
        List<Map<String, Object>> returnedLogs = (List<Map<String, Object>>) responseData.get("orderLogs");
        assertEquals("订单已创建", returnedLogs.get(0).get("remark"));
        assertEquals("更新物流信息，预计送达：2023-10-01", returnedLogs.get(1).get("remark"));
        assertEquals("状态变更：从 待处理 变为 待发货", returnedLogs.get(2).get("remark"));
        assertEquals("初始化入库单，状态：待处理", returnedLogs.get(3).get("remark"));
        assertEquals("订单已发货", returnedLogs.get(4).get("remark"));
        
        // Assert new types
        assertEquals("订单已提交", returnedLogs.get(5).get("remark"));
        assertEquals("订单已审核", returnedLogs.get(6).get("remark"));
        assertEquals("订单已拒绝", returnedLogs.get(7).get("remark"));
        assertEquals("订单已关闭", returnedLogs.get(8).get("remark"));
        assertEquals("订单已完成", returnedLogs.get(9).get("remark"));
        assertEquals("订单已取消", returnedLogs.get(10).get("remark"));
    }

    @Test
    void testShip_CapturesSnapshot() {
        // Arrange
        Long poId = 1L;
        Map<String, Object> payload = new HashMap<>();
        payload.put("shipType", "SelfDelivery");
        payload.put("shipNo", "SD123");
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setOrderNo("PO123");
        
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        
        // Act
        purchaseOrderController.ship(poId, payload);
        
        // Assert
        verify(purchaseOrderService).shipWithLogisticsInfo(
            eq(poId), 
            eq(null), 
            eq("SD123"), 
            eq(null), 
            eq(null), 
            eq(null), 
            eq(null), 
            eq(null), 
            eq(null), 
            eq(null), 
            eq("SelfDelivery")
        );
        
        // Verify snapshot capture
        verify(snapshotService).captureSnapshot(eq(po), eq("FIRST_SHIP"));
    }

    @Test
    void testShip_CapturesFeeAndSupplier() {
        // Arrange
        Long poId = 1L;
        Map<String, Object> payload = new HashMap<>();
        payload.put("shipType", "Logistics");
        payload.put("logisticsFee", 100);
        payload.put("logisticsSupplier", "123"); // String ID
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setOrderNo("PO123");
        
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        
        // Act
        purchaseOrderController.ship(poId, payload);
        
        // Assert
        verify(purchaseOrderService).shipWithLogisticsInfo(
            eq(poId), 
            any(), 
            any(), 
            any(), 
            any(), 
            any(), 
            any(), 
            any(), 
            eq(new java.math.BigDecimal(100)), // Fee
            eq(123L), // Provider ID
            eq("Logistics")
        );
    }

    @Test
    void testShip_Dropship() {
        // Arrange
        Long poId = 1L;
        Map<String, Object> payload = new HashMap<>();
        payload.put("shipType", "Logistics");
        payload.put("logisticsSupplier", "DROPSHIP");
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setOrderNo("PO123");
        
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        
        // Act
        purchaseOrderController.ship(poId, payload);
        
        // Assert
        verify(purchaseOrderService).shipWithLogisticsInfo(
            eq(poId), 
            any(), 
            any(), 
            any(), 
            any(), 
            any(), 
            any(), 
            any(), 
            eq(null), // Fee null if not provided
            eq(null), // Provider ID null
            eq("Logistics")
        );
    }

    @Test
    void testGetLogisticsDetail_ReturnsSelfDeliveryInfo() {
        // Arrange
        String trackingNo = "SD123456";
        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setOrderNo("PO123");
        po.setDeliveryMethod("SelfDelivery");
        po.setDeliverer("John Doe");
        po.setDelivererPhone("13800138000");
        po.setPlateNumber("京A88888");
        po.setTrackingNumber(trackingNo);

        when(purchaseOrderRepository.findByTrackingNumber(trackingNo))
                .thenReturn(Collections.singletonList(po));

        // Act
        ResponseEntity<Map<String, Object>> response = purchaseOrderController.getLogisticsDetail(trackingNo);

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        List<Map<String, Object>> orders = (List<Map<String, Object>>) data.get("orders");
        
        assertEquals(1, orders.size());
        Map<String, Object> orderDetail = orders.get(0);
        
        assertEquals("SelfDelivery", orderDetail.get("deliveryMethod"));
        assertEquals("John Doe", orderDetail.get("deliverer"));
        assertEquals("13800138000", orderDetail.get("delivererPhone"));
        assertEquals("京A88888", orderDetail.get("plateNumber"));
    }
}
