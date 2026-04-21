package com.supplypro.service;

import com.supplypro.entity.Product;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.Warehouse;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.LogisticsTrackRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.entity.LogisticsTrack;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.service.impl.PurchaseOrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

import javax.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class PurchaseOrderServiceTest {

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private InboundOrderRepository inboundOrderRepository;
    
    @Mock
    private WarehouseRepository warehouseRepository;
    
    @Mock
    private ProductRepository productRepository;

    @Mock
    private LogisticsTrackRepository logisticsTrackRepository;

    @Mock
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Mock
    private com.supplypro.repository.SettlementOrderRepository settlementOrderRepository;

    @Mock
    private com.supplypro.repository.LogisticsProviderRepository logisticsProviderRepository;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    
    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private EntityManager entityManager;

    @Mock
    private PurchaseOrderSnapshotService snapshotService;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Mock
    private NotificationService notificationService;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Mock
    private TransactionStatus transactionStatus;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        when(purchaseOrderRepository.saveAndFlush(any(PurchaseOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        when(inboundOrderRepository.save(any(InboundOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        when(inboundOrderRepository.saveAndFlush(any(InboundOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        when(warehouseRepository.findById(anyLong())).thenReturn(Optional.of(new Warehouse()));
        when(productRepository.findById(anyLong())).thenReturn(Optional.of(new Product()));
        when(logisticsTrackRepository.save(any(LogisticsTrack.class))).thenAnswer(i -> i.getArguments()[0]);
        when(purchaseOrderLogRepository.save(any(PurchaseOrderLog.class))).thenAnswer(i -> i.getArguments()[0]);
        when(transactionManager.getTransaction(any(TransactionDefinition.class))).thenReturn(transactionStatus);
    }

    @Test
    public void testAutoReceivePurchaseOrder_Success() {
        Long poId = 1L;
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setStatus(PurchaseOrder.Status.SHIPPED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
        po.setOrderNo("PO123");
        po.setCreatedBy("admin");

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(inboundOrderRepository.findByPurchaseOrder(po)).thenReturn(Optional.empty());

        purchaseOrderService.autoReceivePurchaseOrder(poId);

        verify(purchaseOrderRepository, times(1)).save(po);
        assertEquals(PurchaseOrder.Status.RECEIVED, po.getStatus());
        assertEquals(PurchaseOrder.ShippingStatus.RECEIVED, po.getShippingStatus());
        verify(purchaseOrderLogRepository, times(1)).save(any(PurchaseOrderLog.class));
        verify(notificationService, times(1)).sendNotification(eq("admin"), anyString());
    }

    @Test
    public void testAutoReceivePurchaseOrder_AlreadyReceived() {
        Long poId = 1L;
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setStatus(PurchaseOrder.Status.RECEIVED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.RECEIVED);

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        purchaseOrderService.autoReceivePurchaseOrder(poId);

        verify(purchaseOrderRepository, never()).save(po);
        verify(purchaseOrderLogRepository, never()).save(any(PurchaseOrderLog.class));
    }

    @Test
    public void testGenerateInboundPurchaseOrder_PopulatesCreatedBy_WhenSecurityContextEmpty() {
        // Clear SecurityContext
        SecurityContextHolder.clearContext();

        PurchaseOrder po = new PurchaseOrder();
        po.setWarehouseId(1L);
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(1L);
        item.setQuantity(1);
        item.setUnitPrice(new BigDecimal("10.00"));
        items.add(item);
        po.setItems(items);
        
        po.setTotalAmount(new BigDecimal("100.00"));

        PurchaseOrder result = purchaseOrderService.generateInboundPurchaseOrder(po);

        assertNotNull(result.getCreatedBy());
        assertEquals("SYSTEM", result.getCreatedBy());
    }

    @Test
    public void testGenerateInboundPurchaseOrder_PopulatesCreatedBy_FromSecurityContext() {
        // Mock SecurityContext
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("testuser");
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("testuser");

        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);

        PurchaseOrder po = new PurchaseOrder();
        po.setWarehouseId(1L);
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(1L);
        item.setQuantity(1);
        item.setUnitPrice(new BigDecimal("10.00"));
        items.add(item);
        po.setItems(items);
        
        po.setTotalAmount(new BigDecimal("100.00"));

        PurchaseOrder result = purchaseOrderService.generateInboundPurchaseOrder(po);

        assertNotNull(result.getCreatedBy());
        assertEquals("testuser", result.getCreatedBy());
    }

    @Test
    public void testGenerateInboundPurchaseOrder_AssociatesItemsWithOrder() {
        PurchaseOrder po = new PurchaseOrder();
        po.setWarehouseId(1L);
        po.setTotalAmount(new BigDecimal("100.00"));
        
        PurchaseOrderItem item1 = new PurchaseOrderItem();
        item1.setProductId(101L);
        item1.setQuantity(5);
        item1.setUnitPrice(new BigDecimal("10.00"));
        item1.setTotalPrice(new BigDecimal("50.00"));
        
        PurchaseOrderItem item2 = new PurchaseOrderItem();
        item2.setProductId(102L);
        item2.setQuantity(5);
        item2.setUnitPrice(new BigDecimal("10.00"));
        item2.setTotalPrice(new BigDecimal("50.00"));
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        items.add(item1);
        items.add(item2);
        po.setItems(items);

        PurchaseOrder result = purchaseOrderService.generateInboundPurchaseOrder(po);

        assertNotNull(result.getItems());
        assertEquals(2, result.getItems().size());
        assertEquals(result, result.getItems().get(0).getPurchaseOrder());
        assertEquals(result, result.getItems().get(1).getPurchaseOrder());

        // Check status
        assertEquals(PurchaseOrder.Status.PENDING, result.getStatus());
    }

    @Test
    public void testGenerateInboundPurchaseOrder_NullProductId_ThrowsException() {
        PurchaseOrder po = new PurchaseOrder();
        po.setWarehouseId(1L);
        po.setTotalAmount(new BigDecimal("100.00"));
        
        PurchaseOrderItem item1 = new PurchaseOrderItem();
        item1.setProductId(null); // Null Product ID
        item1.setQuantity(5);
        item1.setUnitPrice(new BigDecimal("10.00"));
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        items.add(item1);
        po.setItems(items);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            purchaseOrderService.generateInboundPurchaseOrder(po);
        });

        assertTrue(exception.getMessage().contains("Product ID cannot be null"));
    }

    @Test
    public void testGenerateInboundPurchaseOrder_CreatesInboundOrder_WithRKNumber() {
        // Mock Redis increment for sequence
        when(valueOperations.increment(anyString())).thenReturn(1L);

        PurchaseOrder po = new PurchaseOrder();
        po.setWarehouseId(1L);
        po.setTotalAmount(new BigDecimal("100.00"));
        
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(101L);
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        items.add(item);
        po.setItems(items);

        purchaseOrderService.generateInboundPurchaseOrder(po);

        // Verify InboundOrder creation
        verify(inboundOrderRepository, times(1)).saveAndFlush(argThat(inboundOrder -> {
            return inboundOrder.getInboundNo().startsWith("IN") && 
                   inboundOrder.getStatus() == InboundOrder.Status.PENDING &&
                   inboundOrder.getItems().size() == 1;
        }));
    }

    @Test
    public void testShipPurchaseOrder_UpdatesStatus() {
        Long poId = 1L;
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setStatus(PurchaseOrder.Status.PENDING);
        
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        purchaseOrderService.shipPurchaseOrder(poId);

        assertEquals(PurchaseOrder.Status.SHIPPED, po.getStatus());
        verify(purchaseOrderRepository, times(1)).save(po);
    }

    @Test
    public void testUpdateLogisticsInfo_UpdatesStatusAndLogs() {
        Long poId = 1L;
        String company = "SF Express";
        String trackingNo = "SF123456789";
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setOrderNo("PO-TEST-LOGISTICS");
        po.setStatus(PurchaseOrder.Status.CONFIRMED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
        
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        
        // Mock Security Context
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("testuser");
        when(authentication.isAuthenticated()).thenReturn(true);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);

        purchaseOrderService.updateLogisticsInfo(poId, company, trackingNo, null, null, null, null, null, null, null, "Logistics");

        // Verify PO updates
        assertEquals(company, po.getLogisticsCompany());
        assertEquals(trackingNo, po.getTrackingNumber());
        assertEquals(PurchaseOrder.ShippingStatus.SHIPPED, po.getShippingStatus());
        assertEquals(PurchaseOrder.Status.SHIPPED, po.getStatus()); // Should update main status too
        assertNotNull(po.getShippedAt());
        
        verify(purchaseOrderRepository, times(1)).save(po);

        // Verify Logistics Track creation
        verify(logisticsTrackRepository, times(1)).save(argThat(track -> 
            track.getBizNo().equals("PO-TEST-LOGISTICS") &&
            track.getTrackingNo().equals(trackingNo) &&
            track.getStatus().equals("SHIPPED")
        ));

        // Verify Operation Log creation
        verify(purchaseOrderLogRepository, times(1)).save(argThat(log -> 
            log.getPurchaseOrderId().equals(poId) &&
            log.getOperationType().equals("LOGISTICS_UPDATE") &&
            log.getOperator().equals("testuser")
        ));
    }

    @Test
    public void testUpdateLogisticsInfo_GeneratesSettlement_WithProvider() {
        Long poId = 1L;
        Long providerId = 10L;
        BigDecimal fee = new BigDecimal("50.00");
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setOrderNo("PO123");
        po.setStatus(PurchaseOrder.Status.CONFIRMED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
        
        com.supplypro.entity.LogisticsProvider provider = new com.supplypro.entity.LogisticsProvider();
        provider.setId(providerId);
        provider.setName("Test Provider");
        
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(logisticsProviderRepository.findById(providerId)).thenReturn(Optional.of(provider));
        
        purchaseOrderService.updateLogisticsInfo(poId, "Test Company", "123", null, null, null, null, null, fee, providerId, "Logistics");
        
        verify(settlementOrderRepository, times(1)).save(argThat(settlement -> 
            settlement.getType() == com.supplypro.entity.SettlementOrder.Type.LOGISTICS &&
            settlement.getStatus() == com.supplypro.entity.SettlementOrder.Status.PENDING &&
            settlement.getTotalAmount().equals(fee) &&
            settlement.getTaxAmount() != null &&
            settlement.getNetAmount() != null &&
            settlement.getLogisticsProvider().getId().equals(providerId) &&
            settlement.getRelatedOrderNo().equals("PO123")
        ));
    }

    @Test
    public void testUpdateLogisticsInfo_GeneratesSettlement_WithSupplierFallback() {
        Long poId = 2L;
        BigDecimal fee = new BigDecimal("30.00");
        
        com.supplypro.entity.Supplier supplier = new com.supplypro.entity.Supplier();
        supplier.setId(99L);
        supplier.setName("Test Supplier");
        
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setOrderNo("PO456");
        po.setStatus(PurchaseOrder.Status.CONFIRMED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
        po.setSupplier(supplier);
        
        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        
        // Call with null providerId but fee > 0
        purchaseOrderService.updateLogisticsInfo(poId, "Self Delivery", null, null, null, null, null, null, fee, null, "SelfDelivery");
        
        verify(settlementOrderRepository, times(1)).save(argThat(settlement -> 
            settlement.getType() == com.supplypro.entity.SettlementOrder.Type.LOGISTICS &&
            settlement.getStatus() == com.supplypro.entity.SettlementOrder.Status.PENDING &&
            settlement.getTotalAmount().equals(fee) &&
            settlement.getTaxAmount() != null &&
            settlement.getNetAmount() != null &&
            settlement.getSupplier().getId().equals(99L) &&
            settlement.getRelatedOrderNo().equals("PO456")
        ));
    }

    @Test
    public void testGenerateInboundPurchaseOrder_RequirementsMet() {
        // Mock Redis increment for sequence
        when(valueOperations.increment(anyString())).thenReturn(1L);

        PurchaseOrder po = new PurchaseOrder();
        po.setWarehouseId(1L);
        po.setTotalAmount(new BigDecimal("100.00"));
        // po.setType(PurchaseOrder.Type.INBOUND); // Optional, service should set it

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(101L);
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        items.add(item);
        po.setItems(items);

        PurchaseOrder result = purchaseOrderService.generateInboundPurchaseOrder(po);

        // Requirement 1: Type is INBOUND
        assertEquals(PurchaseOrder.Type.INBOUND, result.getType());

        // Requirement 2: Biz Type is "商品入库"
        assertEquals("商品入库", result.getBizType());

        // Requirement 3: Order No starts with C (Purchase Order numbering rule)
        assertTrue(result.getOrderNo().startsWith("C"));
        
        // Requirement 3: Inbound Order No matches generated Inbound No (starts with IN)
        assertTrue(result.getInboundOrderNo().startsWith("IN"));
        
        verify(inboundOrderRepository, times(1)).saveAndFlush(argThat(inboundOrder -> {
            return inboundOrder.getInboundNo().equals(result.getInboundOrderNo());
        }));
    }
}
