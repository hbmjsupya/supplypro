package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
public class PurchaseOrderDeleteTest {

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
    private ObjectMapper objectMapper;

    private Long productId;
    private Long supplierId;

    @BeforeEach
    public void setup() {
        // Setup Supplier
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier For Delete");
        supplier.setSupplierNo("SUP-DEL");
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplier.setSettlementType(Supplier.SettlementType.PERIOD);
        supplier = supplierRepository.save(supplier);
        supplierId = supplier.getId();

        // Setup Product
        Product product = new Product();
        product.setName("Test Product For Delete");
        product.setSkuCode("SKU-DEL");
        product.setStatus(Product.Status.LISTED);
        product.setDefaultSupplierId(supplierId);
        product = productRepository.save(product);
        productId = product.getId();
    }

    @Test
    @WithMockUser(username = "admin", authorities = {"purchase_order:delete"})
    public void testDeletePurchaseOrder() throws Exception {
        // 1. Create Purchase Order
        // TODO: In real service (createGeneralPurchaseOrder), totalAmount is not calculated automatically for STANDARD type,
        // but Entity requires it (nullable=false). The test manually sets it here to pass validation.
        // We should fix createGeneralPurchaseOrder to calculate totalAmount like generateInboundPurchaseOrder does.
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.STANDARD);
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
        po.setBizType(PurchaseOrder.BizType.PLATFORM);
        po.setSupplierId(supplierId);
        po.setDeliveryDate(java.time.LocalDate.now().plusDays(7));
        
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(5);
        item.setUnitPrice(new BigDecimal("20.00"));
        item.setTotalPrice(new BigDecimal("100.00")); // Set total price
        po.setItems(List.of(item));
        po.setTotalAmount(new BigDecimal("100.00")); // Set total amount

        String responseContent = mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        
        Long poId = objectMapper.readTree(responseContent).get("data").get("id").asLong();
        
        // Debug: Check status
        PurchaseOrder savedPo = purchaseOrderRepository.findById(poId).orElseThrow();
        System.out.println("DEBUG: Saved PO Status: " + savedPo.getStatus());
        System.out.println("DEBUG: Saved PO SettlementStatus: " + savedPo.getSettlementStatus());

        // 2. Verify it exists
        assertTrue(purchaseOrderRepository.existsById(poId));
        
        // 3. Delete it
        String deleteReason = "Test Delete Reason";
        mockMvc.perform(delete("/api/purchase-orders/" + poId)
                .param("reason", deleteReason))
                .andDo(result -> {
                    if (result.getResponse().getStatus() != 200) {
                        System.err.println("FAILURE RESPONSE BODY: " + result.getResponse().getContentAsString());
                    }
                })
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Deleted successfully"));
        
        // 4. Verify it's gone
        assertFalse(purchaseOrderRepository.existsById(poId));
    }

    @Test
    @WithMockUser(username = "user_no_perm", authorities = {"purchase_order:view"})
    public void testDeletePurchaseOrder_NoPermission() throws Exception {
        // 1. Create Purchase Order
        PurchaseOrder po = new PurchaseOrder();
        po.setType(PurchaseOrder.Type.STANDARD);
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
        po.setBizType(PurchaseOrder.BizType.PLATFORM);
        po.setSupplierId(supplierId);
        po.setDeliveryDate(java.time.LocalDate.now().plusDays(7));
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProductId(productId);
        item.setQuantity(5);
        item.setUnitPrice(new BigDecimal("20.00"));
        item.setTotalPrice(new BigDecimal("100.00"));
        po.setItems(List.of(item));
        po.setTotalAmount(new BigDecimal("100.00"));

        String responseContent = mockMvc.perform(post("/api/purchase-orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(po)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        
        Long poId = objectMapper.readTree(responseContent).get("data").get("id").asLong();

        // 2. Try Delete
        mockMvc.perform(delete("/api/purchase-orders/" + poId))
                .andExpect(status().isForbidden()); // Expect 403
    }
}
