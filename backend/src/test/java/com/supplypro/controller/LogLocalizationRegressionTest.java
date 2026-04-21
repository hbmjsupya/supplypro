package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.entity.Product;
import com.supplypro.entity.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
public class LogLocalizationRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private com.supplypro.repository.WarehouseRepository warehouseRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Long productId;
    private Long supplierId;
    private Long warehouseId;

    @BeforeEach
    public void setup() {
        // Setup Warehouse
        com.supplypro.entity.Warehouse warehouse = new com.supplypro.entity.Warehouse();
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-TEST");
        warehouse.setStatus(com.supplypro.entity.Warehouse.Status.ACTIVE);
        warehouse = warehouseRepository.save(warehouse);
        warehouseId = warehouse.getId();

        // Setup Supplier
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-TEST");
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplier.setSettlementType(Supplier.SettlementType.PERIOD);
        supplier = supplierRepository.save(supplier);
        supplierId = supplier.getId();

        // Setup Product
        Product product = new Product();
        product.setName("Test Product");
        product.setSkuCode("SKU-TEST");
        product.setStatus(Product.Status.LISTED);
        product.setDefaultSupplierId(supplierId);
        product = productRepository.save(product);
        productId = product.getId();
    }

    @Test
    @WithMockUser(username = "admin")
    public void testLocalizationFlow() throws Exception {
        // 1. Create Inbound Purchase Order
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setBizType(PurchaseOrder.BizType.INBOUND);
        po.setSupplierId(supplierId);
        po.setWarehouseId(warehouseId);
        
        po.setDeliveryDate(java.time.LocalDate.now().plusDays(7));
        
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("10.00"));
        po.setItems(List.of(item));

        // Create PO
        String responseContent = mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        
        Long poId = objectMapper.readTree(responseContent).get("data").get("id").asLong();
        
        // 2. Verify Creation Log
        List<PurchaseOrderLog> logs = purchaseOrderLogRepository.findByPurchaseOrderIdOrderByCreatedAtDesc(poId);
        assertFalse(logs.isEmpty(), "Logs should not be empty after creation");
        
        boolean foundInitLog = false;
        for (PurchaseOrderLog log : logs) {
            if (log.getRemark().contains("初始化入库单，状态：待处理")) {
                foundInitLog = true;
                break;
            }
        }
        assertTrue(foundInitLog, "Creation log should be localized to '初始化入库单，状态：待处理'");

        // 3. Ship the Order
        Map<String, Object> shipPayload = new HashMap<>();
        shipPayload.put("shipType", "Logistics");
        shipPayload.put("shipCompany", "SF Express");
        shipPayload.put("shipNo", "SF123456789");
        shipPayload.put("logisticsFee", 50);
        
        mockMvc.perform(put("/api/purchase-orders/" + poId + "/ship")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(shipPayload)))
                .andExpect(status().isOk());
                
        // 4. Verify Shipping Log
        logs = purchaseOrderLogRepository.findByPurchaseOrderIdOrderByCreatedAtDesc(poId);
        
        boolean foundShipLog = false;
        for (PurchaseOrderLog log : logs) {
            if (log.getRemark().contains("首次发货：采购单从") && log.getRemark().contains("状态转为已发货")) {
                // Ensure no English status like "PENDING" remains
                assertFalse(log.getRemark().contains("PENDING"), "Log should not contain English status 'PENDING'");
                // Shipping status PENDING translates to "待发货"
                assertTrue(log.getRemark().contains("待发货"), "Log should contain Chinese status '待发货'");
                foundShipLog = true;
                break;
            }
        }
        assertTrue(foundShipLog, "Shipping log should be localized");
        
        // 5. Verify Settlement Log
        boolean foundSettlementLog = false;
        for (PurchaseOrderLog log : logs) {
            if (log.getRemark().contains("创建结算单，金额：50")) {
                foundSettlementLog = true;
                break;
            }
        }
        assertTrue(foundSettlementLog, "Settlement creation log should be localized");
    }
}
