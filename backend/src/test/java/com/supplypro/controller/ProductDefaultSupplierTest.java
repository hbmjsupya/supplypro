package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.Product;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.ProductCategory;
import com.supplypro.repository.ProductCategoryRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ProductDefaultSupplierTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EntityManager entityManager;

    private Supplier supplier;
    private Product product;
    private ProductCategory category;

    @BeforeEach
    public void setup() {
        // Create a Category
        category = new ProductCategory();
        category.setCategoryId("CAT" + System.currentTimeMillis());
        category.setName("Test Category");
        category.setLevel(1);
        category = productCategoryRepository.save(category);

        // Create a Supplier
        supplier = new Supplier();
        supplier.setName("Test Supplier " + System.currentTimeMillis());
        supplier.setSupplierNo("SUP" + System.currentTimeMillis());
        supplier.setSettlementType(Supplier.SettlementType.PERIOD);
        supplier.setSettlementPeriod(30);
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplier = supplierRepository.save(supplier);

        // Create a Product with Default Supplier
        product = new Product();
        product.setName("Test Product");
        product.setSkuCode("SKU-SUP-001");
        product.setDefaultSupplierId(supplier.getId());
        product.setCategoryCode(category.getCategoryId());
        product.setTaxClass("Standard");
        product.setTaxRate(new BigDecimal("0.13"));
        product = productRepository.save(product);

        // Flush and clear to ensure entities are fetched from DB with formulas populated
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @WithMockUser(username = "admin")
    public void testGetProductReturnsDefaultSupplier() throws Exception {
        // Re-fetch product to get the ID (though it shouldn't change, but object reference is stale after clear)
        // Or just use the ID we have. ID is preserved.
        mockMvc.perform(get("/api/products/" + product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.defaultSupplierId", is(supplier.getId().intValue())))
                .andExpect(jsonPath("$.data.defaultSupplierName", is(supplier.getName())));
    }

    @Test
    @WithMockUser(username = "admin")
    public void testGetAllProductsReturnsDefaultSupplier() throws Exception {
        mockMvc.perform(get("/api/products")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].defaultSupplierId", is(supplier.getId().intValue())))
                .andExpect(jsonPath("$.data.records[0].defaultSupplierName", is(supplier.getName())));
    }
}
