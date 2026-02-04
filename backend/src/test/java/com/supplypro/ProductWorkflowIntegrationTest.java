package com.supplypro;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.Product;
import com.supplypro.entity.Sku;
import com.supplypro.entity.ProductCategory;
import com.supplypro.entity.TaxCategory;
import com.supplypro.repository.ProductCategoryRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.TaxCategoryRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional // Rollback after test
@ActiveProfiles("test") // Use test profile if available, or fall back to default
public class ProductWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private TaxCategoryRepository taxCategoryRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        // Clean up
        productRepository.deleteAll();
        productCategoryRepository.deleteAll();
        taxCategoryRepository.deleteAll();

        // Create initial category for testing
        ProductCategory cat = new ProductCategory();
        cat.setCategoryId("office");
        cat.setName("Office Supplies");
        cat.setLevel(1);
        cat.setIsEnabled(true);
        cat.setCreateTime(LocalDateTime.now());
        productCategoryRepository.save(cat);

        // Create initial tax category for testing
        TaxCategory tax = new TaxCategory();
        tax.setTaxCategoryId("TAX_001");
        tax.setCategoryCode("T001");
        tax.setCategoryName("Standard Tax");
        tax.setTaxRate(new BigDecimal("0.13"));
        tax.setCreatedAt(LocalDateTime.now());
        taxCategoryRepository.save(tax);

        // Create deep category for update test
        ProductCategory deepCat = new ProductCategory();
        deepCat.setCategoryId("office/writing/pen/0.5mm");
        deepCat.setName("0.5mm Pen");
        deepCat.setLevel(4);
        deepCat.setIsEnabled(true);
        deepCat.setCreateTime(LocalDateTime.now());
        productCategoryRepository.save(deepCat);
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testProductCreationAndStatusUpdateWorkflow() throws Exception {
        // 1. Create Product
        Product product = new Product();
        product.setName("Integration Test Product");
        product.setSkuCode("TEST-SKU-001");
        product.setCategoryCode("office");
        product.setTaxCode("T001");
        product.setTaxRate(new BigDecimal("0.13"));
        product.setStatus(Product.Status.PENDING_SELECTION);
        
        // Add SKU
        Sku sku = new Sku();
        sku.setName("Spec 1");
        product.setSkus(List.of(sku));

        // Perform Create
        String responseContent = mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").exists())
                .andReturn().getResponse().getContentAsString();
        
        // Extract ID
        Long productId = objectMapper.readTree(responseContent).get("data").get("id").asLong();
        
        // 2. Verify Product Exists
        assertTrue(productRepository.existsById(productId));

        // 3. Update Product (Simulate selecting Category and filling fields)
        product.setId(productId);
        product.setCategoryCode("office/writing/pen/0.5mm"); // Deep category
        product.setName("Updated Name");
        // Ensure SKU link is maintained or re-sent?
        // In integration test, we might need to fetch and update or just send what's needed.
        // The controller update method expects full object usually or merges.
        // Our controller: product.getSkus().forEach(sku -> sku.setProduct(product));
        // So we should send skus.
        sku.setProduct(null); // Clear cyclic ref for JSON
        product.setSkus(List.of(sku));

        mockMvc.perform(put("/api/products/" + productId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categoryCode").value("office/writing/pen/0.5mm"));

        // 4. Update Status (Pass Selection)
        // Note: Logic requires Brand to be present for SELECTED status check?
        // Controller: if (product.getBrandId() == null) missingFields.add("品牌");
        // So we must set brandId. Assuming brand 1 exists or we don't enforce foreign key in mock/H2 or we need to create brand.
        // For simplicity, let's skip brand check or fail expectations if missing.
        // Or we can just test that it fails validation if missing.
        
        mockMvc.perform(patch("/api/products/" + productId + "/status")
                .param("status", "SELECTED"))
                .andExpect(status().isBadRequest()) // Expect failure due to missing fields (Brand)
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("品牌")));

        // 5. Test Type Conversion Error Scenario (Negative Test)
        mockMvc.perform(patch("/api/products/check-name/status")
                .param("status", "SELECTED"))
                .andExpect(status().isBadRequest()); // Should be 400, not 500
    }
}
