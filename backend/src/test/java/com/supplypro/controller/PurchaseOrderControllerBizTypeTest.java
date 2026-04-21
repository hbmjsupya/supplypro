package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.Warehouse;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.security.test.context.support.WithMockUser;

import com.supplypro.repository.ProductRepository;
import com.supplypro.entity.Product;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "admin", roles = {"ADMIN"})
public class PurchaseOrderControllerBizTypeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ProductRepository productRepository;

    private PurchaseOrder mockOrder;
    private Long supplierId;
    private Long warehouseId;
    private Long productId;

    @BeforeEach
    public void setup() {
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-123");
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplier.setSettlementType(Supplier.SettlementType.PREPAYMENT);
        supplier = supplierRepository.saveAndFlush(supplier);
        supplierId = supplier.getId();

        Warehouse warehouse = new Warehouse();
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-001");
        warehouse = warehouseRepository.saveAndFlush(warehouse);
        warehouseId = warehouse.getId();

        Product product = new Product();
        product.setName("Test Product");
        product.setSkuCode("SKU-001");
        product = productRepository.saveAndFlush(product);
        productId = product.getId();

        mockOrder = new PurchaseOrder();
        mockOrder.setSupplierId(supplierId);
        mockOrder.setWarehouseId(warehouseId);
        mockOrder.setTotalAmount(new java.math.BigDecimal("100.00"));
        // Ensure the items are not empty to bypass items validation
        com.supplypro.entity.PurchaseOrderItem item = new com.supplypro.entity.PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(10);
        item.setUnitPrice(new java.math.BigDecimal("10.00"));
        item.setTotalPrice(new java.math.BigDecimal("100.00"));
        mockOrder.setItems(java.util.List.of(item));
    }

    @Test
    public void testCreateInbound_MissingBizNo() throws Exception {
        mockOrder.setBizType(PurchaseOrder.BizType.INBOUND);
        mockOrder.setBizNo("");

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mockOrder)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("业务单号不能为空"));
    }

    @Test
    public void testCreateInbound_InvalidInboundNo() throws Exception {
        mockOrder.setBizType(PurchaseOrder.BizType.INBOUND);
        mockOrder.setBizNo("INVALID-INBOUND-NO");

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mockOrder)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("无效的入库单号: INVALID-INBOUND-NO"));
    }

    @Test
    public void testCreatePlatform_Success() throws Exception {
        mockOrder.setBizType(PurchaseOrder.BizType.PLATFORM);
        mockOrder.setBizNo("PLATFORM-12345");

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mockOrder)))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk());

        PurchaseOrder saved = purchaseOrderRepository.findByBizNo("PLATFORM-12345").orElseThrow();
        assertEquals(PurchaseOrder.Type.STANDARD, saved.getType());
    }

    @Test
    public void testCreateReplenishment_Success() throws Exception {
        mockOrder.setBizType(PurchaseOrder.BizType.REPLENISHMENT);
        mockOrder.setBizNo("REP-12345");

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mockOrder)))
                .andExpect(status().isOk());

        PurchaseOrder saved = purchaseOrderRepository.findByBizNo("REP-12345").orElseThrow();
        assertEquals(PurchaseOrder.Type.REPLENISHMENT, saved.getType());
    }

    @Test
    public void testCreate_DuplicateBizNo() throws Exception {
        // Setup existing order
        PurchaseOrder existing = new PurchaseOrder();
        existing.setOrderNo("C123");
        existing.setBizNo("PLATFORM-DUPE");
        existing.setStatus(PurchaseOrder.Status.PENDING);
        existing.setCreatedBy("TEST");
        existing.setTotalAmount(new java.math.BigDecimal("100.00"));
        existing.setType(PurchaseOrder.Type.STANDARD);
        existing.setSupplierId(supplierId);
        existing.setWarehouseId(warehouseId);
        purchaseOrderRepository.saveAndFlush(existing);

        mockOrder.setBizType(PurchaseOrder.BizType.PLATFORM);
        mockOrder.setBizNo("PLATFORM-DUPE");

        mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mockOrder)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("业务单号已绑定其他采购单"));
    }
}
