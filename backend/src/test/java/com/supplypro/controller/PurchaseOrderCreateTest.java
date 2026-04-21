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
import com.supplypro.service.PurchaseOrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@WithMockUser(username = "testuser", roles = {"USER"})
public class PurchaseOrderCreateTest {

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
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-TEST-001");
        warehouse.setProvince("Guangdong");
        warehouse.setCity("Shenzhen");
        warehouse.setDistrict("Nanshan");
        warehouse.setAddress("Test Address");
        warehouse.setStatus(Warehouse.Status.ACTIVE);
        warehouse = warehouseRepository.save(warehouse);
        warehouseId = warehouse.getId();

        // Setup Supplier
        Supplier supplier = new Supplier();
        supplier.setName("Auto Supplier");
        supplier.setSupplierNo("SUP-AUTO-001");
        supplier.setSettlementType(com.supplypro.entity.Supplier.SettlementType.CASH);
        supplier = supplierRepository.save(supplier);
        supplierId = supplier.getId();

        // Setup Product with Default Supplier
        Product product = new Product();
        product.setName("Auto Product");
        product.setSkuCode("SKU-AUTO-001");
        product.setDefaultSupplierId(supplierId);
        // product.setCategory("Test");
        // product.setUnit("PCS");
        // product.setStatus(Product.Status.ON_SHELF);
        product = productRepository.save(product);
        productId = product.getId();
    }

    @Test
    public void testCreateInboundOrder_WithoutSupplier_ShouldDeriveFromItem() throws Exception {
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setWarehouseId(warehouseId); // Use real warehouse ID
        po.setDeliveryDate(java.time.LocalDate.now());
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("100.00"));
        item.setTotalPrice(new BigDecimal("1000.00"));
        item.setSpec("Default");
        items.add(item);
        po.setItems(items);

        // Send request without supplierId
        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
    
    @Test
    public void testCreateInboundOrder_WithoutSupplier_AndNoDefaultSupplier_ShouldFail() throws Exception {
        // Create product without supplier
        Product noSupProduct = new Product();
        noSupProduct.setName("No Supplier Product");
        noSupProduct.setSkuCode("SKU-NO-SUP");
        noSupProduct = productRepository.save(noSupProduct);
        
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setWarehouseId(warehouseId);
        
        List<PurchaseOrderItem> items = new ArrayList<>();
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(noSupProduct.getId());
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("100.00"));
        items.add(item);
        po.setItems(items);

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Supplier is required (could not be derived from items)"));
    }
}
