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
import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ProductWorkflowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        // Cleanup to ensure clean state even if transaction rollback fails or context is dirty
        productRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testProductLifecycle_WithDeduplication() throws Exception {
        // 1. Create Product A
        Product productA = new Product();
        productA.setName("Unique Product A");
        productA.setSkuCode("SKU-A-001");
        productA.setStatus(Product.Status.PENDING_SELECTION);
        productA.setTaxRate(new BigDecimal("0.13"));
        productA.setLogisticsTemplate("Free Shipping");

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productA)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.name").value("Unique Product A"));

        // 2. Verify Name Exists via Validation Endpoint
        mockMvc.perform(get("/api/products/validation/name")
                .param("name", "Unique Product A"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true));

        // 3. Try to Create Product B with same name (should fail)
        Product productB = new Product();
        productB.setName("Unique Product A"); // Duplicate Name
        productB.setSkuCode("SKU-B-001");
        
        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productB)))
                .andDo(print())
                .andExpect(status().isBadRequest()) // 400
                .andExpect(jsonPath("$.message").value("商品名称已存在"));

        // 4. Create Product B with unique name
        productB.setName("Unique Product B");
        String resB = mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productB)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        
        Long idB = objectMapper.readTree(resB).get("data").get("id").asLong();

        // 5. Update Product B to name of Product A (should fail)
        productB.setName("Unique Product A");
        mockMvc.perform(put("/api/products/" + idB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productB)))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("商品名称已存在"));

        // 6. Update Product B status (Patch)
        // Test strict validation for ON_SHELF (should fail because fields are missing)
        mockMvc.perform(patch("/api/products/" + idB + "/status")
                .param("status", "ON_SHELF"))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("选品通过需补全以下必填项")));

        // Test successful update to OFF_SHELF
        mockMvc.perform(patch("/api/products/" + idB + "/status")
                .param("status", "OFF_SHELF"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.newStatus").value("OFF_SHELF"));
                
        // 7. Verify 404 for non-existent ID
        mockMvc.perform(put("/api/products/999999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productB)))
                .andExpect(status().isNotFound()); // 404
    }
}
