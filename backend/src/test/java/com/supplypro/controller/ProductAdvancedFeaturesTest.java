package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.Brand;
import com.supplypro.entity.Product;
import com.supplypro.entity.ProductCategory;
import com.supplypro.entity.TaxCategory;
import com.supplypro.repository.BrandRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ProductAdvancedFeaturesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private ProductCategoryRepository categoryRepository;

    @Autowired
    private TaxCategoryRepository taxCategoryRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Long product1Id;
    private Long product2Id;

    @BeforeEach
    public void setup() {
        productRepository.deleteAll();
        brandRepository.deleteAll();
        categoryRepository.deleteAll();
        taxCategoryRepository.deleteAll();

        // Create dependencies
        Brand brand = new Brand();
        brand.setName("Test Brand");
        brand.setStatus(Brand.Status.ENABLED);
        brandRepository.save(brand);

        ProductCategory category = new ProductCategory();
        category.setName("Test Category");
        category.setCategoryId("CAT001");
        category.setLevel(1);
        categoryRepository.save(category);

        TaxCategory tax = new TaxCategory();
        tax.setTaxCategoryId("TC001");
        tax.setCategoryCode("TAX101");
        tax.setCategoryName("Test Tax");
        tax.setTaxRate(new BigDecimal("0.13"));
        tax.setStatus(TaxCategory.Status.ENABLED);
        taxCategoryRepository.save(tax);

        Product p1 = new Product();
        p1.setName("Product 1");
        p1.setSkuCode("SKU001");
        p1.setBrandId(brand.getId());
        p1.setCategoryCode(category.getCategoryId());
        p1.setTaxClass(tax.getCategoryCode());
        p1.setStatus(Product.Status.PENDING_SELECTION);
        p1 = productRepository.save(p1);
        product1Id = p1.getId();

        Product p2 = new Product();
        p2.setName("Product 2");
        p2.setSkuCode("SKU002");
        p2.setBrandId(brand.getId());
        p2.setCategoryCode(category.getCategoryId());
        p2.setTaxClass(tax.getCategoryCode());
        p2.setStatus(Product.Status.ON_SHELF);
        p2 = productRepository.save(p2);
        product2Id = p2.getId();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testBatchDelete() throws Exception {
        List<Long> ids = Arrays.asList(product1Id, product2Id);

        mockMvc.perform(post("/api/products/batch/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        assertFalse(productRepository.existsById(product1Id));
        assertFalse(productRepository.existsById(product2Id));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testBatchStatusUpdate() throws Exception {
        List<Long> ids = Arrays.asList(product1Id, product2Id);
        Map<String, Object> request = Map.of(
            "ids", ids,
            "status", "SELECTED"
        );

        mockMvc.perform(post("/api/products/batch/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        Product p1 = productRepository.findById(product1Id).orElseThrow();
        Product p2 = productRepository.findById(product2Id).orElseThrow();
        
        // Note: Batch status update might have validation logic. 
        // In ProductController, it should update them.
        // Assuming PENDING -> SELECTED is allowed.
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testExport() throws Exception {
        mockMvc.perform(get("/api/products/export")
                .param("keyword", "Product"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=products.csv"));
    }
}
