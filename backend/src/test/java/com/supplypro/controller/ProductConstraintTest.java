package com.supplypro.controller;

import com.supplypro.entity.Brand;
import com.supplypro.entity.Product;
import com.supplypro.entity.ProductBrand;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.ProductBrandRepository;
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
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional // Rollback after test
public class ProductConstraintTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private ProductBrandRepository productBrandRepository;

    private Brand testBrand;
    private Product testProduct;

    @BeforeEach
    public void setup() {
        // Clear data
        productBrandRepository.deleteAll();
        productRepository.deleteAll();
        brandRepository.deleteAll();

        // Create Brand
        testBrand = new Brand();
        testBrand.setName("Test Brand");
        testBrand.setStatus(Brand.Status.ENABLED);
        testBrand = brandRepository.save(testBrand);

        // Create Product with Brand
        testProduct = new Product();
        testProduct.setName("Test Product");
        testProduct.setBrandId(testBrand.getId());
        testProduct.setSkuCode("SKU-TEST-001");
        testProduct.setTaxRate(new BigDecimal("0.13"));
        testProduct = productRepository.save(testProduct);

        // Manually create the ProductBrand association as the Controller would
        ProductBrand pb = new ProductBrand();
        pb.setProductId(testProduct.getId());
        pb.setBrandId(testBrand.getId());
        pb.setBindingTime(LocalDateTime.now());
        productBrandRepository.save(pb);
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testUpdateProductKeepingSameBrand() throws Exception {
        // This test simulates the scenario where a product is updated (e.g. name change)
        // but the brand remains the same.
        // The current Controller logic does deleteByProductId + save, which causes
        // Duplicate entry error because insert happens before delete (due to IDENTITY generation).

        String updateJson = "{"
                + "\"name\": \"Updated Product Name\","
                + "\"brandId\": " + testBrand.getId() + ","
                + "\"taxRate\": 0.13,"
                + "\"status\": \"PENDING_SELECTION\""
                + "}";

        mockMvc.perform(put("/api/products/" + testProduct.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }
}
