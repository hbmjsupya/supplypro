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
import org.springframework.security.core.context.SecurityContextHolder;

import javax.persistence.EntityManager;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class PurchaseOrderInboundFieldTest {

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
    private RedisTemplate<String, Object> redisTemplate;
    
    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private EntityManager entityManager;

    @Mock
    private PurchaseOrderSnapshotService snapshotService;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

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
        
        // Ensure Inbound Order Repo returns empty for duplicate check in numbering
        when(inboundOrderRepository.findByInboundNo(anyString())).thenReturn(Optional.empty());
    }

    @Test
    public void testGenerateInboundPurchaseOrder_EnforcesFourFieldRules() {
        // Prepare Input Data
        PurchaseOrder inputPo = new PurchaseOrder();
        inputPo.setWarehouseId(1L);
        inputPo.setDeliveryDate(LocalDate.of(2026, 12, 31)); // Rule 4 Input
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(1L);
        item.setQuantity(10);
        items.add(item);
        inputPo.setItems(items);

        // Execute
        PurchaseOrder result = purchaseOrderService.generateInboundPurchaseOrder(inputPo);

        // Verify Rule 1: Purchase Type must be INBOUND
        assertEquals(PurchaseOrder.Type.INBOUND, result.getType(), "Rule 1 Failed: Purchase Type must be INBOUND");

        // Verify Rule 2: Biz Type must be "商品入库"
        assertEquals("商品入库", result.getBizType(), "Rule 2 Failed: Biz Type must be '商品入库'");

        // Verify Rule 3: Order No must start with "IN"
        assertNotNull(result.getOrderNo(), "Rule 3 Failed: Order No cannot be null");
        assertTrue(result.getOrderNo().startsWith("IN"), "Rule 3 Failed: Order No must start with 'IN'");

        // Verify Rule 4: Delivery Date must match input (no timezone shift)
        assertEquals(LocalDate.of(2026, 12, 31), result.getDeliveryDate(), "Rule 4 Failed: Delivery Date must match input exactly");
    }
}
