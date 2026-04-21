package com.supplypro.service;

import com.supplypro.entity.Product;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.Warehouse;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.WarehouseRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.RedisKeyValueAdapter;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class PurchaseOrderTransactionIntegrationTest {

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private BrandRepository brandRepository;

    @MockBean
    private PurchaseOrderSnapshotService snapshotService;

    @MockBean
    private RedisKeyValueAdapter redisKeyValueAdapter;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    @MockBean
    private ValueOperations<String, Object> valueOperations;

    private Long warehouseId;
    private Long productId;
    private Long supplierId;

    @BeforeEach
    public void setup() {
        // Clean up previous data if any (in case of crashed tests)
        cleanup();

        // Mock Redis
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        when(redisTemplate.opsForValue().increment(anyString())).thenReturn(1L);

        // Setup Security Context
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("testUser", "password", Collections.emptyList())
        );

        // Setup Data
        Warehouse warehouse = new Warehouse();
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-TEST");
        warehouse = warehouseRepository.save(warehouse);
        warehouseId = warehouse.getId();

        Product product = new Product();
        product.setName("Test Product");
        product.setSkuCode("SKU-TEST");
        // product.setPrice(new BigDecimal("100.00")); // Price is on SKU or Item
        product = productRepository.save(product);
        productId = product.getId();

        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-TEST-001");
        supplier.setSettlementType(Supplier.SettlementType.PERIOD);
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplier = supplierRepository.save(supplier);
        supplierId = supplier.getId();
    }

    @AfterEach
    public void cleanup() {
        inboundOrderRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
        warehouseRepository.deleteAll();
        productRepository.deleteAll();
        // Remove relationships in Brand before deleting Supplier if necessary, 
        // but brandRepository.deleteAll() should handle the Brand side.
        // If Brand is owning side of ManyToMany, we must delete Brand to remove entries in brand_supplier.
        brandRepository.deleteAll(); 
        supplierRepository.deleteAll();
        SecurityContextHolder.clearContext();
    }

    @Test
    public void testGenerateInboundPurchaseOrder_RollbackOnSnapshotFailure() {
        // 1. Setup Data
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO-ROLLBACK-TEST");
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setWarehouseId(warehouseId);
        po.setSupplier(supplierRepository.findById(supplierId).get());
        po.setRemark("Rollback Test");
        
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        po.setItems(new ArrayList<>(Collections.singletonList(item)));

        // 2. Mock Snapshot Service to Fail
        doThrow(new RuntimeException("Simulated Snapshot Failure"))
                .when(snapshotService).captureSnapshot(any(PurchaseOrder.class));

        // 3. Execute and Expect Exception
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            purchaseOrderService.generateInboundPurchaseOrder(po);
        });

        // Verify the exception message contains our rollback reason
        assertTrue(exception.getMessage().contains("Transaction rolled back"));

        // 4. Verify Rollback (PO should not exist)
        PurchaseOrder result = purchaseOrderRepository.findByOrderNo("PO-ROLLBACK-TEST");
        assertNull(result, "Purchase Order should have been rolled back");
    }

    @Test
    public void testGenerateInboundPurchaseOrder_Success() {
        // 1. Setup Data
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO-SUCCESS-TEST");
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setWarehouseId(warehouseId);
        po.setSupplier(supplierRepository.findById(supplierId).get());
        po.setRemark("Success Test");

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(5);
        item.setUnitPrice(new BigDecimal("20.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        po.setItems(new ArrayList<>(Collections.singletonList(item)));

        // 2. Mock Snapshot Service to Succeed (default mock behavior is return null/void, which is fine for void method or ignored return)
        // captureSnapshot returns PurchaseOrderSnapshot, but we don't use it in the service result except for logging maybe.
        
        // 3. Execute
        PurchaseOrder saved = purchaseOrderService.generateInboundPurchaseOrder(po);

        // 4. Verify Success
        assertNotNull(saved.getId());
        Optional<PurchaseOrder> result = purchaseOrderRepository.findById(saved.getId());
        assertTrue(result.isPresent());
        assertEquals("PENDING", result.get().getStatus().name());
    }
}
