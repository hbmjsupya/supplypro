package com.supplypro.service;

import com.supplypro.entity.*;
import com.supplypro.repository.*;
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

import javax.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.springframework.context.ApplicationEventPublisher;
import com.supplypro.event.PurchaseOrderInboundEvent;

public class PurchaseOrderInboundSyncTest {

    @InjectMocks
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

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
    private PurchaseOrderSnapshotService snapshotService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    
    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private EntityManager entityManager;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.increment(anyString())).thenReturn(1L);
        
        lenient().when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        lenient().when(inboundOrderRepository.save(any(InboundOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        lenient().when(inboundOrderRepository.saveAndFlush(any(InboundOrder.class))).thenAnswer(i -> i.getArguments()[0]);
    }

    @Test
    public void testGenerateInboundPurchaseOrder_StatusAndEvent() {
        // Setup
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setWarehouseId(10L);
        po.setItems(Collections.singletonList(createItem()));
        po.setCreatedBy("TestUser");

        Warehouse warehouse = new Warehouse();
        warehouse.setId(10L);
        warehouse.setCode("WH001");
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(warehouse));
        when(productRepository.findById(anyLong())).thenReturn(Optional.of(new Product()));
        when(inboundOrderRepository.saveAndFlush(any(InboundOrder.class))).thenAnswer(i -> {
            InboundOrder io = i.getArgument(0);
            io.setInboundNo("IN202310271430001");
            io.setId(99L);
            return io;
        });
        
        // Mock save to return the same object
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));
        when(purchaseOrderRepository.saveAndFlush(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        // Execute
        PurchaseOrder result = purchaseOrderService.generateInboundPurchaseOrder(po);

        // Assert
        assertEquals(PurchaseOrder.Status.PENDING, result.getStatus());
        verify(eventPublisher, times(1)).publishEvent(any(PurchaseOrderInboundEvent.class));
        // We verify that log was saved
        verify(purchaseOrderLogRepository, times(1)).save(any(PurchaseOrderLog.class));
    }

    @Test
    public void testInboundOrderAddressPopulation_FromWarehouse() {
        // Setup Warehouse with full address and manager
        Warehouse warehouse = new Warehouse();
        warehouse.setId(10L);
        warehouse.setName("Test WH");
        warehouse.setProvince("Guangdong");
        warehouse.setCity("Shenzhen");
        warehouse.setDistrict("Nanshan");
        warehouse.setAddress("Tech Park");
        warehouse.setCode("WH001");
        
        User manager = new User();
        manager.setUsername("ManagerBob");
        manager.setPhone("13800000000");
        manager.setEmail("bob@example.com");
        Set<User> managers = new HashSet<>();
        managers.add(manager);
        warehouse.setManagers(managers);
        
        when(warehouseRepository.findById(10L)).thenReturn(Optional.of(warehouse));
        when(productRepository.findById(anyLong())).thenReturn(Optional.of(new Product()));

        // Setup PO with NO address/contact
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setWarehouseId(10L);
        po.setItems(Collections.singletonList(createItem()));
        // Explicitly null fields
        po.setProvince(null);
        po.setCity(null);
        po.setDetailAddress(null);
        po.setContactName(null);

        // Execute
        InboundOrder io = purchaseOrderService.createInboundOrder(po);

        // Assert
        assertEquals("Guangdong", io.getProvince());
        assertEquals("Shenzhen", io.getCity());
        assertEquals("Nanshan", io.getDistrict());
        assertEquals("Tech Park", io.getDetailAddress());
        assertEquals("WH001", io.getWarehouseCode());
        assertEquals("ManagerBob", io.getContactName());
        assertEquals("13800000000", io.getContactPhone());
        assertEquals("bob@example.com", io.getContactEmail());
    }

    @Test
    public void testStatusSync_ShipPO_UpdatesInboundOrder() {
        // Setup PO and associated Inbound Order
        Long poId = 1L;
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setStatus(PurchaseOrder.Status.CONFIRMED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
        po.setOrderNo("PO123");

        InboundOrder io = new InboundOrder();
        io.setId(100L);
        io.setStatus(InboundOrder.Status.PENDING);
        io.setPurchaseOrder(po);

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(inboundOrderRepository.findByPurchaseOrder(po)).thenReturn(Optional.of(io));

        // Execute
        purchaseOrderService.shipPurchaseOrder(poId);

        // Assert
        assertEquals(PurchaseOrder.ShippingStatus.SHIPPED, po.getShippingStatus());
        assertEquals(InboundOrder.Status.PENDING, io.getStatus()); // Inbound status remains PENDING until confirmed
        
        verify(inboundOrderRepository, atLeastOnce()).save(io);
    }
    
    @Test
    public void testStatusSync_UpdateLogistics_UpdatesInboundOrder() {
        // Setup PO and associated Inbound Order
        Long poId = 1L;
        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setStatus(PurchaseOrder.Status.CONFIRMED);
        po.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
        po.setOrderNo("PO123");

        InboundOrder io = new InboundOrder();
        io.setId(100L);
        io.setStatus(InboundOrder.Status.PENDING);
        io.setPurchaseOrder(po);

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(inboundOrderRepository.findByPurchaseOrder(po)).thenReturn(Optional.of(io));

        // Execute
        String company = "SF Express";
        String trackingNo = "SF123456";
        LocalDateTime expectedArrival = LocalDateTime.now().plusDays(3);
        purchaseOrderService.updateLogisticsInfo(poId, company, trackingNo, LocalDateTime.now(), expectedArrival, null, null, null, null, null, "Logistics");

        // Assert
        assertEquals(PurchaseOrder.ShippingStatus.SHIPPED, po.getShippingStatus());
        assertEquals(InboundOrder.Status.PENDING, io.getStatus()); // Inbound status remains PENDING until confirmed
        assertEquals(company, io.getLogisticsCompany());
        assertEquals(trackingNo, io.getTrackingNo());
        assertEquals(expectedArrival, io.getExpectedArrival());
        
        verify(inboundOrderRepository, atLeastOnce()).save(io);
    }

    private PurchaseOrderItem createItem() {
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(1L);
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("100"));
        item.setTotalPrice(new BigDecimal("1000"));
        return item;
    }
}
