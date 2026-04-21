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
public class SequentialCleanupIntegrationTest {

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
    private SalesOrderItemRepository salesOrderItemRepository;
    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired
    private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Autowired
    private CustomerRepository customerRepository;
    @Autowired
    private WarehouseRepository warehouseRepository;
    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private javax.persistence.EntityManager entityManager;

    @Test
    @WithMockUser(username = "admin")
    public void testSequentialCleanup() throws Exception {
        // 1. Setup Data
        
        // Bundle Product
        Product bundle = new Product();
        bundle.setName("Bundle Product");
        bundle.setSkuCode("BUN-001");
        bundle.setStatus(Product.Status.LISTED);
        bundle.setType(Product.ProductType.BUNDLE);
        bundle = productRepository.save(bundle);

        // Normal Product
        Product normal = new Product();
        normal.setName("Normal Product");
        normal.setSkuCode("NOR-001");
        normal.setStatus(Product.Status.ON_SHELF);
        normal.setType(Product.ProductType.NORMAL);
        normal = productRepository.save(normal);

        // Customer & Warehouse & Supplier
        Customer customer = customerRepository.save(createCustomer());
        Warehouse warehouse = warehouseRepository.save(createWarehouse());
        Supplier supplier = supplierRepository.save(createSupplier());

        // Sales Order with Bundle Item
        SalesOrder so = new SalesOrder();
        so.setOrderNo("SO-BUNDLE-001");
        so.setCustomer(customer);
        so.setWarehouseId(warehouse.getId());
        so.setStatus(SalesOrder.Status.PENDING);
        so.setTotalAmount(new BigDecimal("100.00"));
        so.setCreatedBy("test");
        
        SalesOrderItem soItem = new SalesOrderItem();
        soItem.setSalesOrder(so);
        soItem.setProductId(bundle.getId());
        soItem.setQuantity(1);
        soItem.setUnitPrice(new BigDecimal("100.00"));
        soItem.setTotalPrice(new BigDecimal("100.00"));
        so.setItems(Collections.singletonList(soItem));
        salesOrderRepository.save(so);

        // Purchase Order with Normal Product Item
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO-NORMAL-001");
        po.setSupplier(supplier);
        po.setWarehouseId(warehouse.getId());
        po.setType(PurchaseOrder.Type.STANDARD);
        po.setTotalAmount(new BigDecimal("50.00"));
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setCreatedBy("test");
        
        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setPurchaseOrder(po);
        poItem.setProductId(normal.getId());
        poItem.setQuantity(1);
        poItem.setUnitPrice(new BigDecimal("50.00"));
        poItem.setTotalPrice(new BigDecimal("50.00"));
        po.setItems(Collections.singletonList(poItem));
        purchaseOrderRepository.save(po);

        // Verify Data Exists
        Assertions.assertTrue(productRepository.findById(bundle.getId()).isPresent());
        Assertions.assertTrue(productRepository.findById(normal.getId()).isPresent());
        Assertions.assertEquals(1, salesOrderItemRepository.findAll().size());
        Assertions.assertEquals(1, purchaseOrderItemRepository.findAll().size());

        // Clear Persistence Context to simulate fresh request and avoid "re-saving" deleted items from memory
        entityManager.flush();
        entityManager.clear();

        // 2. Execute Cleanup
        String responseContent = mockMvc.perform(post("/api/system/maintenance/cleanup-sequential")
                .param("confirm", "true")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn().getResponse().getContentAsString();

        // 3. Verify Deletion
        Assertions.assertFalse(productRepository.findById(bundle.getId()).isPresent());
        Assertions.assertFalse(productRepository.findById(normal.getId()).isPresent());
        
        // Verify Order Items are gone (since they referenced deleted products)
        Assertions.assertEquals(0, salesOrderItemRepository.findAll().size());
        Assertions.assertEquals(0, purchaseOrderItemRepository.findAll().size());

        // 4. Verify Report & Backups
        ObjectMapper mapper = new ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode report = mapper.readTree(responseContent).get("report");
        
        Assertions.assertEquals(1, report.get("bundles_deleted").asInt());
        Assertions.assertEquals(1, report.get("pool_products_deleted").asInt());
        
        String bundleBackup = report.get("bundle_backup").asText();
        String poolBackup = report.get("pool_backup").asText();
        
        Assertions.assertNotEquals("N/A", bundleBackup);
        Assertions.assertNotEquals("N/A", poolBackup);
        
        File bundleFile = new File(bundleBackup);
        File poolFile = new File(poolBackup);
        
        Assertions.assertTrue(bundleFile.exists());
        Assertions.assertTrue(poolFile.exists());

        // Cleanup Files
        Files.deleteIfExists(Paths.get(bundleBackup));
        Files.deleteIfExists(Paths.get(poolBackup));
    }

    private Customer createCustomer() {
        Customer c = new Customer();
        c.setName("Test Customer");
        c.setCustomerNo("CUST-TEST");
        c.setStatus(Customer.Status.ACTIVE);
        return c;
    }

    private Warehouse createWarehouse() {
        Warehouse w = new Warehouse();
        w.setName("Test Warehouse");
        w.setCode("WH-TEST");
        w.setStatus(Warehouse.Status.ACTIVE);
        return w;
    }

    private Supplier createSupplier() {
        Supplier s = new Supplier();
        s.setName("Test Supplier");
        s.setSupplierNo("SUP-TEST");
        s.setSettlementType(Supplier.SettlementType.PERIOD);
        return s;
    }
}
