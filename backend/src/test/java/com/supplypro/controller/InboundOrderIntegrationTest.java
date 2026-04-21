package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.Product;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.Warehouse;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.repository.search.ProductSearchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.supplypro.entity.StockFlow;
import com.supplypro.repository.StockFlowRepository;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(properties = "spring.data.redis.repositories.enabled=false")
@AutoConfigureMockMvc
@Transactional
public class InboundOrderIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;
    
    @Autowired
    private StockFlowRepository stockFlowRepository;

    @MockBean
    private ProductSearchRepository productSearchRepository;

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @MockBean
    private ReactiveRedisConnectionFactory reactiveRedisConnectionFactory;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private Product testProduct;
    private Supplier testSupplier;
    private Warehouse testWarehouse;

    @BeforeEach
    public void setup() {
        // Mock Redis
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        when(valueOperations.increment(anyString())).thenReturn(1L);

        // Create test data
        testSupplier = new Supplier();
        testSupplier.setName("Test Supplier " + System.currentTimeMillis());
        testSupplier.setSupplierNo("SUP-" + System.currentTimeMillis());
        testSupplier.setStatus(Supplier.Status.ACTIVE);
        testSupplier.setSettlementType(Supplier.SettlementType.CASH);
        testSupplier = supplierRepository.save(testSupplier);

        testWarehouse = new Warehouse();
        testWarehouse.setName("Test Warehouse " + System.currentTimeMillis());
        testWarehouse.setCode("WH-" + System.currentTimeMillis());
        testWarehouse.setStatus(Warehouse.Status.ACTIVE);
        testWarehouse = warehouseRepository.save(testWarehouse);

        testProduct = new Product();
        testProduct.setName("Test Product " + System.currentTimeMillis());
        testProduct.setSkuCode("SKU-" + System.currentTimeMillis());
        testProduct.setStatus(Product.Status.ON_SHELF);
        testProduct = productRepository.save(testProduct);
    }

    @Test
    @WithMockUser(username = "admin")
    public void testCreateInboundPurchaseOrder_TriggersInboundOrderGeneration() throws Exception {
        // Create Purchase Order DTO
        PurchaseOrder po = new PurchaseOrder();
        po.setSupplier(testSupplier);
        po.setWarehouseId(testWarehouse.getId());
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setOrderNo("PO1770700950851"); // Specific PO from user request
        po.setTotalAmount(new BigDecimal("100.00"));
        po.setRemark("Auto-generated inbound test");
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(testProduct.getId());
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        items.add(item);
        po.setItems(items);

        // Perform POST request to create Purchase Order
        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // Verify Inbound Order was created
        List<InboundOrder> inboundOrders = inboundOrderRepository.findAll();
        boolean found = inboundOrders.stream()
                .anyMatch(io -> io.getPurchaseOrder().getOrderNo().equals("PO1770700950851"));
        
        if (!found) {
            throw new RuntimeException("Inbound Order was not created for PO1770700950851");
        }

        // Verify List API (Serialization Check)
        mockMvc.perform(get("/api/inbound-orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records").isArray())
                .andExpect(jsonPath("$.data.records[0].inboundNo").exists());
    }

    @Test
    @WithMockUser(username = "admin")
    public void testConfirmInboundOrder() throws Exception {
        // 1. Create Inbound Order (via PO)
        PurchaseOrder po = new PurchaseOrder();
        po.setSupplier(testSupplier);
        po.setWarehouseId(testWarehouse.getId());
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setOrderNo("PO_CONFIRM_" + System.currentTimeMillis());
        po.setTotalAmount(new BigDecimal("200.00"));
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(testProduct.getId());
        item.setQuantity(5);
        item.setUnitPrice(new BigDecimal("40.00"));
        item.setTotalPrice(new BigDecimal("200.00"));
        item.setSpec("TestSpec");
        items.add(item);
        po.setItems(items);

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk());

        // 2. Get the Inbound Order
        List<InboundOrder> inboundOrders = inboundOrderRepository.findAll();
        InboundOrder inboundOrder = inboundOrders.stream()
                .filter(io -> io.getPurchaseOrder().getOrderNo().equals(po.getOrderNo()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Inbound Order not found"));

        // 3. Confirm it
        mockMvc.perform(post("/api/inbound-orders/" + inboundOrder.getId() + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 4. Verify Status
        InboundOrder updatedOrder = inboundOrderRepository.findById(inboundOrder.getId()).orElseThrow();
        assertEquals(InboundOrder.Status.RECEIVED, updatedOrder.getStatus());
        assertNotNull(updatedOrder.getInboundDate());
        assertEquals("admin", updatedOrder.getConfirmedBy());

        // 5. Verify Stock Flow
        List<StockFlow> flows = stockFlowRepository.findAll();
        StockFlow flow = flows.stream()
                .filter(f -> f.getReferenceNo().equals(updatedOrder.getInboundNo()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Stock Flow not found"));
        
        assertEquals(StockFlow.FlowType.INBOUND, flow.getFlowType());
        assertEquals(5, flow.getQuantity());
        assertEquals("admin", flow.getOperator());
    }

    @Test
    @WithMockUser(username = "admin")
    public void testUpdateInboundDetails() throws Exception {
        // 1. Create Inbound Order (via PO)
        PurchaseOrder po = new PurchaseOrder();
        po.setSupplier(testSupplier);
        po.setWarehouseId(testWarehouse.getId());
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setOrderNo("PO_UPDATE_" + System.currentTimeMillis());
        po.setTotalAmount(new BigDecimal("100.00"));
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(testProduct.getId());
        item.setQuantity(1);
        item.setUnitPrice(new BigDecimal("100.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        items.add(item);
        po.setItems(items);

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk());

        // 2. Get the Inbound Order
        List<InboundOrder> inboundOrders = inboundOrderRepository.findAll();
        InboundOrder inboundOrder = inboundOrders.stream()
                .filter(io -> io.getPurchaseOrder().getOrderNo().equals(po.getOrderNo()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Inbound Order not found"));

        // 3. Update Details
        com.supplypro.dto.InboundOrderUpdateRequest updateRequest = new com.supplypro.dto.InboundOrderUpdateRequest();
        updateRequest.setContactName("Test Contact");
        updateRequest.setCity("Beijing");
        updateRequest.setLogisticsCompany("JD Logistics");
        updateRequest.setTrackingNo("JD123456789");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/inbound-orders/" + inboundOrder.getId() + "/details")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 4. Verify Updates
        InboundOrder updatedOrder = inboundOrderRepository.findById(inboundOrder.getId()).orElseThrow();
        assertEquals("Test Contact", updatedOrder.getContactName());
        assertEquals("Beijing", updatedOrder.getCity());
        assertEquals("JD Logistics", updatedOrder.getLogisticsCompany());
        assertEquals("JD123456789", updatedOrder.getTrackingNo());
    }
}
