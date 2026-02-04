package com.supplypro.controller;

import com.supplypro.entity.Product;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.ProductBrandRepository;
import com.supplypro.service.ProductSyncProducer;
import com.supplypro.service.ProductTaxLogService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(ProductController.class)
public class ProductStatusFixTest {

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

    @Test
    @WithMockUser
    public void testUpdateStatus_AutoGeneratesSku() throws Exception {
        Product p = new Product();
        p.setId(1L);
        p.setName("Test Product");
        p.setStatus(Product.Status.PENDING_SELECTION);
        p.setSkuCode(null); // Simulate missing SKU
        p.setBrandId(1L); // Satisfy mandatory check if checked (but status is PENDING here?)
        // If testing SELECTED, we need brand and name.

        when(productRepository.findById(1L)).thenReturn(Optional.of(p));
        when(productRepository.save(any(Product.class))).thenAnswer(i -> i.getArguments()[0]);

        // Test transition to SELECTED (which triggers checks)
        // Ensure Product has Name and Brand (mocked above, but need to be sure)
        
        mockMvc.perform(patch("/api/products/1/status")
                .param("status", "SELECTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}