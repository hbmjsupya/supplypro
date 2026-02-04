package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.Product;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.ProductBrandRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.service.ProductSyncProducer;
import com.supplypro.service.ProductTaxLogService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
public class ProductControllerParameterTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductRepository productRepository;

    @MockBean
    private BrandRepository brandRepository;

    @MockBean
    private ProductBrandRepository productBrandRepository;

    @MockBean
    private ProductSyncProducer productSyncProducer;

    @MockBean
    private ProductTaxLogService productTaxLogService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void checkName_ShouldReturnSuccess_WhenParamsAreValid() throws Exception {
        when(productRepository.existsByName("Test Product")).thenReturn(false);

        mockMvc.perform(get("/api/products/validation/name")
                .param("name", "Test Product"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(false));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void checkName_ShouldReturnSuccess_WhenExcludeIdIsNumber() throws Exception {
        when(productRepository.existsByNameAndIdNot("Test Product", 123L)).thenReturn(true);

        mockMvc.perform(get("/api/products/validation/name")
                .param("name", "Test Product")
                .param("excludeId", "123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void checkName_ShouldFail_WhenExcludeIdIsString() throws Exception {
        // This simulates the type conversion error scenario
        mockMvc.perform(get("/api/products/validation/name")
                .param("name", "Test Product")
                .param("excludeId", "check-name"))
                .andExpect(status().isBadRequest()); 
                // Spring usually returns 400 Bad Request for type mismatch, 
                // unless it's handled by a global exception handler that returns 500.
                // If the user saw 500, it means the GlobalExceptionHandler might be catching it genericallly
                // or not handling TypeMismatchException specifically.
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void updateStatus_ShouldFail_WhenIdIsString() throws Exception {
        // PATCH /api/products/check-name/status
        // This matches /{id}/status, so "check-name" is captured as id
        mockMvc.perform(patch("/api/products/check-name/status")
                .param("status", "SELECTED"))
                .andExpect(status().isBadRequest()); // Expect 400 for type mismatch
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void updateStatus_ShouldReturnSuccess_WhenIdIsValid() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setStatus(Product.Status.PENDING_SELECTION);
        // Set required fields for status change
        product.setName("Test");
        product.setCategoryCode("cat1");
        product.setTaxCode("tax1");
        product.setSkus(java.util.Collections.emptyList()); // Mock list but empty might fail validation in controller logic if checking for empty
        // Controller logic: if (product.getSkus() == null || product.getSkus().isEmpty()) missingFields.add("规格");
        // So we need skus
        com.supplypro.entity.Sku sku = new com.supplypro.entity.Sku();
        sku.setSkuCode("S1");
        product.setSkus(java.util.List.of(sku));
        // Brand is optional for SELECTED? No, mandatory: if (product.getBrandId() == null) missingFields.add("品牌");
        product.setBrandId(1L);

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        mockMvc.perform(patch("/api/products/1/status")
                .param("status", "SELECTED"))
                .andExpect(status().isOk());
    }
}
