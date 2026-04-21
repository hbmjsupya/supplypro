package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.Product;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.Warehouse;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.WarehouseRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "testuser", roles = {"USER"})
public class PurchaseOrderAttachmentTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SupplierRepository supplierRepository;
    
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    private Long supplierId;
    private Long productId;
    private Long warehouseId;

    @BeforeEach
    public void setup() {
        // Setup Warehouse
        Warehouse warehouse = new Warehouse();
        warehouse.setName("Test Warehouse Attach");
        warehouse.setCode("WH-ATTACH-001");
        warehouse.setProvince("Guangdong");
        warehouse.setCity("Shenzhen");
        warehouse.setDistrict("Nanshan");
        warehouse.setAddress("Test Address");
        warehouse.setStatus(Warehouse.Status.ACTIVE);
        warehouse = warehouseRepository.save(warehouse);
        warehouseId = warehouse.getId();

        // Setup Supplier
        Supplier supplier = new Supplier();
        supplier.setName("Attach Supplier");
        supplier.setSupplierNo("SUP-ATTACH-001");
        supplier.setSettlementType(com.supplypro.entity.Supplier.SettlementType.CASH);
        supplier = supplierRepository.save(supplier);
        supplierId = supplier.getId();

        // Setup Product
        Product product = new Product();
        product.setName("Attach Product");
        product.setSkuCode("SKU-ATTACH-001");
        product.setDefaultSupplierId(supplierId);
        product = productRepository.save(product);
        productId = product.getId();
    }

    @Test
    public void testCreateInboundOrder_WithAttachments_ShouldPersistCorrectly() throws Exception {
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setWarehouseId(warehouseId);
        po.setSupplierId(supplierId);
        po.setDeliveryDate(java.time.LocalDate.now());
        
        // JSON string of file URLs
        String attachmentsJson = "[\"https://example.com/file1.pdf\", \"https://example.com/file2.png\"]";
        po.setAttachments(attachmentsJson);
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("100.00"));
        item.setTotalPrice(new BigDecimal("1000.00"));
        item.setSpec("Default");
        items.add(item);
        po.setItems(items);

        MvcResult result = mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn();
        
        // Extract PO ID from response or query DB
        String responseBody = result.getResponse().getContentAsString();
        Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);
        Map<String, Object> data = (Map<String, Object>) responseMap.get("data");
        // For INBOUND, the response structure is full PO object
        Integer id = (Integer) data.get("id");
        
        // Verify DB
        PurchaseOrder savedPo = purchaseOrderRepository.findById(id.longValue()).orElse(null);
        assertNotNull(savedPo);
        assertEquals(attachmentsJson, savedPo.getAttachments());
    }
}
