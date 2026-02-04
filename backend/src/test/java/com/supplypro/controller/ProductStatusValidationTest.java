package com.supplypro.controller;

import com.supplypro.entity.Product;
import com.supplypro.entity.Sku;
import com.supplypro.entity.ProductCategory;
import com.supplypro.repository.ProductCategoryRepository;
import com.supplypro.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ProductStatusValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    private Product testProduct;

    @BeforeEach
    public void setup() {
        // Create Category
        ProductCategory category = new ProductCategory();
        category.setCategoryId("cat001");
        category.setName("Test Category");
        category.setLevel(1);
        category.setCreateTime(LocalDateTime.now());
        productCategoryRepository.save(category);

        // Create Product without Brand and Tax
        testProduct = new Product();
        testProduct.setName("Test Product No Brand " + System.currentTimeMillis());
        testProduct.setCategoryCode("cat001");
        testProduct.setSkuCode("SKU-TEST-NB-" + System.currentTimeMillis());
        testProduct.setStatus(Product.Status.PENDING_SELECTION);
        
        // Add SKU (required)
        Sku sku = new Sku();
        sku.setSkuCode("SKU-ITEM-" + System.currentTimeMillis());
        sku.setName("Item 1");
        sku.setProduct(testProduct);
        testProduct.setSkus(new java.util.ArrayList<>(Collections.singletonList(sku)));

        testProduct = productRepository.save(testProduct);
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testUpdateStatusToSelectedWithoutBrandAndTax() throws Exception {
        // Prior to fix, this would fail with 400 because Brand/Tax were missing
        // Now it should succeed (200 OK)
        mockMvc.perform(patch("/api/products/" + testProduct.getId() + "/status")
                .param("status", "SELECTED"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
                //.andExpect(status().isInternalServerError());
    }
}
