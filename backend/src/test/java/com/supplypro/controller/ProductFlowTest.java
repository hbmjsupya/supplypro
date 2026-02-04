package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.Product;
import com.supplypro.repository.ProductRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ProductFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        productRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testCompleteProductFlow() throws Exception {
        // 1. Create Product
        Product product = new Product();
        product.setName("Flow Test Product");
        product.setLogisticsTemplate("Free Shipping");
        product.setTaxRate(new BigDecimal("0.13"));
        
        String responseContent = mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.skuCode").exists()) // Verify SKU generation
                .andReturn().getResponse().getContentAsString();
        
        Long id = objectMapper.readTree(responseContent).get("data").get("id").asLong();

        // 2. Update Product (Success)
        product.setId(id);
        product.setName("Flow Test Product Updated");
        
        mockMvc.perform(put("/api/products/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Flow Test Product Updated"));

        // 3. Verify Duplicate Name Check (Create)
        Product duplicate = new Product();
        duplicate.setName("Flow Test Product Updated"); // Same name
        
        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("商品名称已存在"));

        // 4. Verify Duplicate Name Check (Update)
        // Create another product first
        Product other = new Product();
        other.setName("Other Product");
        other.setSkuCode("OTHER-SKU");
        productRepository.save(other);
        
        // Try to rename 'other' to 'Flow Test Product Updated'
        other.setName("Flow Test Product Updated");
        mockMvc.perform(put("/api/products/" + other.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(other)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("商品名称已存在"));

    }

    // 5. Verify 404 on Update Non-Existent ID
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testUpdateNonExistentProduct() throws Exception {
        Product product = new Product();
        product.setName("NonExistent");
        product.setSkuCode("NE-001");
        
        mockMvc.perform(put("/api/products/999999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found"));
    }

    // 6. Verify 404 on Status Update Non-Existent ID
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testUpdateStatusNonExistentProduct() throws Exception {
        mockMvc.perform(patch("/api/products/999999/status")
                .param("status", "SELECTED"))
                .andExpect(status().isNotFound());
    }

    // 7. Verify Validation Endpoint (Check Name)
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testCheckName() throws Exception {
        // Create a product first
        Product product = new Product();
        product.setName("ExistingName");
        product.setSkuCode("EX-001");
        productRepository.save(product);

        // Check if exists
        mockMvc.perform(get("/api/products/validation/name")
                .param("name", "ExistingName"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true));

        // Check non-existent
        mockMvc.perform(get("/api/products/validation/name")
                .param("name", "NewName"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(false));
    }
    
    // 8. Verify Duplicate Name on Create
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testCreateDuplicateName() throws Exception {
        // Create initial product
        Product p1 = new Product();
        p1.setName("UniqueName");
        p1.setSkuCode("U-001");
        productRepository.save(p1);
        
        // Try to create another with same name
        Product p2 = new Product();
        p2.setName("UniqueName");
        p2.setSkuCode("U-002");
        
        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(p2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("商品名称已存在"));
    }
}
