package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.*;
import com.supplypro.repository.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Collections;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchDataAutoConfiguration,org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchRepositoriesAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
@AutoConfigureMockMvc
@Transactional
public class FullCleanupIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.supplypro.repository.search.ProductSearchRepository productSearchRepository;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.supplypro.service.ProductSyncConsumer productSyncConsumer;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.supplypro.service.ProductSyncProducer productSyncProducer;

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.data.redis.core.RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private SalesOrderRepository salesOrderRepository;
    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired
    private InboundOrderRepository inboundOrderRepository;
    @Autowired
    private OutboundOrderRepository outboundOrderRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private WarehouseRepository warehouseRepository;
    @Autowired
    private SupplierRepository supplierRepository;

    @Test
    @WithMockUser(username = "admin")
    public void testFullCleanup() throws Exception {
        // 1. Setup Data
        
        // Product
        Product product = new Product();
        product.setName("Product To Delete");
        product.setSkuCode("DEL-001");
        product.setStatus(Product.Status.ON_SHELF);
        product = productRepository.save(product);

        // Customer
        Customer customer = new Customer();
        customer.setName("Test Customer");
        customer.setCustomerNo("CUST-001");
        customer.setStatus(Customer.Status.ACTIVE);
        customer = customerRepository.save(customer);

        // Warehouse
        Warehouse warehouse = new Warehouse();
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-001");
        warehouse.setStatus(Warehouse.Status.ACTIVE);
        warehouse = warehouseRepository.save(warehouse);

        // Supplier
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-001");
        supplier.setSettlementType(Supplier.SettlementType.PERIOD);
        supplier = supplierRepository.save(supplier);

        // Sales Order
        SalesOrder so = new SalesOrder();
        so.setOrderNo("SO-001");
        so.setCustomer(customer);
        so.setWarehouseId(warehouse.getId());
        so.setStatus(SalesOrder.Status.PENDING);
        so.setTotalAmount(new BigDecimal("100.00"));
        so.setCreatedBy("test");
        
        SalesOrderItem soItem = new SalesOrderItem();
        soItem.setSalesOrder(so); // Bidirectional? Entity usually manages this or we set manually
        // Check SalesOrder.java: @OneToMany(mappedBy = "salesOrder", cascade = CascadeType.ALL)
        // If we add to list, it might not set back-reference automatically unless helper method used.
        // Let's set back reference manually just in case
        soItem.setSalesOrder(so);
        soItem.setProductId(product.getId());
        soItem.setQuantity(1);
        soItem.setUnitPrice(new BigDecimal("100.00"));
        soItem.setTotalPrice(new BigDecimal("100.00"));
        
        so.setItems(Collections.singletonList(soItem));
        so = salesOrderRepository.save(so);

        // Outbound Order (linked to SO)
        OutboundOrder oo = new OutboundOrder();
        oo.setOutboundNo("OUT-001");
        oo.setSalesOrder(so);
        oo.setWarehouse(warehouse);
        oo.setStatus(OutboundOrder.Status.PENDING);
        outboundOrderRepository.save(oo);

        // Purchase Order
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO-001");
        po.setSupplier(supplier);
        po.setType(PurchaseOrder.Type.STANDARD);
        po.setTotalAmount(new BigDecimal("50.00"));
        po.setStatus(PurchaseOrder.Status.PENDING);
        
        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setPurchaseOrder(po);
        poItem.setProductId(product.getId());
        poItem.setQuantity(1);
        poItem.setUnitPrice(new BigDecimal("50.00"));
        poItem.setTotalPrice(new BigDecimal("50.00"));
        
        po.setItems(Collections.singletonList(poItem));
        po = purchaseOrderRepository.save(po);

        // Inbound Order (linked to PO)
        InboundOrder io = new InboundOrder();
        io.setInboundNo("IN-001");
        io.setPurchaseOrder(po);
        io.setWarehouse(warehouse);
        io.setStatus(InboundOrder.Status.PENDING);
        inboundOrderRepository.save(io);

        // Verify Data Exists
        Assertions.assertTrue(productRepository.count() > 0);
        Assertions.assertTrue(salesOrderRepository.count() > 0);
        Assertions.assertTrue(outboundOrderRepository.count() > 0);
        Assertions.assertTrue(purchaseOrderRepository.count() > 0);
        Assertions.assertTrue(inboundOrderRepository.count() > 0);

        // 2. Execute Cleanup (Without Confirm - Should Fail)
            mockMvc.perform(post("/api/system/maintenance/cleanup-all-products")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest()); // BusinessException mapped to 400

            // 3. Execute Cleanup (With Confirm)
        String response = mockMvc.perform(post("/api/system/maintenance/cleanup-all-products")
                .param("confirm", "true")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn().getResponse().getContentAsString();

        // 4. Verify Data Deleted
        Assertions.assertEquals(0, productRepository.count());
        Assertions.assertEquals(0, salesOrderRepository.count());
        Assertions.assertEquals(0, outboundOrderRepository.count());
        Assertions.assertEquals(0, purchaseOrderRepository.count());
        Assertions.assertEquals(0, inboundOrderRepository.count());

        // 5. Verify Backup
        ObjectMapper mapper = new ObjectMapper();
        String backupPath = mapper.readTree(response).get("report").get("backup_file").asText();
        Assertions.assertNotEquals("N/A", backupPath);
        File backupFile = new File(backupPath);
        Assertions.assertTrue(backupFile.exists());
        
        // Clean up backup file
        Files.deleteIfExists(Paths.get(backupPath));
    }
}
