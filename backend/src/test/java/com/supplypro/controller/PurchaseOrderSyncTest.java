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
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.supplypro.repository.search.ProductSearchRepository;
import org.springframework.boot.test.mock.mockito.MockBean;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
@AutoConfigureMockMvc
public class PurchaseOrderSyncTest {

    @MockBean
    private ProductSearchRepository productSearchRepository;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

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
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    private Product testProduct;
    private Supplier testSupplier;
    private Warehouse testWarehouse;

    @BeforeEach
    public void setup() {
        // Mock Redis
        ValueOperations valueOperations = mock(ValueOperations.class);
        ListOperations listOperations = mock(ListOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForList()).thenReturn(listOperations);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);

        // Create test data
        testSupplier = new Supplier();
        testSupplier.setName("Test Supplier Sync " + System.currentTimeMillis());
        testSupplier.setSupplierNo("SUP-SYNC-" + System.currentTimeMillis());
        testSupplier.setStatus(Supplier.Status.ACTIVE);
        testSupplier.setSettlementType(Supplier.SettlementType.CASH);
        testSupplier = supplierRepository.save(testSupplier);

        testWarehouse = new Warehouse();
        testWarehouse.setName("Test Warehouse Sync " + System.currentTimeMillis());
        testWarehouse.setCode("WH-SYNC-" + System.currentTimeMillis());
        testWarehouse.setStatus(Warehouse.Status.ACTIVE);
        testWarehouse = warehouseRepository.save(testWarehouse);

        testProduct = new Product();
        testProduct.setName("Test Product Sync " + System.currentTimeMillis());
        testProduct.setSkuCode("SKU-SYNC-" + System.currentTimeMillis());
        testProduct.setStatus(Product.Status.ON_SHELF);
        testProduct = productRepository.save(testProduct);
    }

    @Test
    @WithMockUser(username = "admin")
    public void testCancelPurchaseOrder_SyncsToInboundOrder() throws Exception {
        // 1. Create Inbound Purchase Order
        PurchaseOrder po = new PurchaseOrder();
        po.setSupplier(testSupplier);
        po.setWarehouseId(testWarehouse.getId());
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setOrderNo("PO_SYNC_" + System.currentTimeMillis());
        po.setTotalAmount(new BigDecimal("100.00"));
        po.setRemark("Sync test order");
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(testProduct.getId());
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        items.add(item);
        po.setItems(items);

        String response = mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        
        // Extract PO ID from response
        Long poId = objectMapper.readTree(response).get("data").get("id").asLong();

        // 2. Verify Inbound Order created
        InboundOrder inboundOrder = inboundOrderRepository.findAll().stream()
                .filter(io -> io.getPurchaseOrder().getId().equals(poId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Inbound Order not found"));
        
        // Initial status check
        // Inbound Orders created from PO are usually PENDING
        assertEquals(InboundOrder.Status.PENDING, inboundOrder.getStatus());

            // 3. Cancel Purchase Order
            mockMvc.perform(put("/api/purchase-orders/" + poId + "/cancel"))
                    .andDo(print())
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(200));

        // 4. Verify PO Status is CANCELLED
        PurchaseOrder updatedPo = purchaseOrderRepository.findById(poId).orElseThrow();
        assertEquals(PurchaseOrder.Status.CANCELLED, updatedPo.getStatus());

        // 5. Verify Inbound Order Status is CANCELLED
        InboundOrder updatedInbound = inboundOrderRepository.findById(inboundOrder.getId()).orElseThrow();
        assertEquals(InboundOrder.Status.CANCELLED, updatedInbound.getStatus());
    }
}
