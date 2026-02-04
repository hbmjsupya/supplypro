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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
public class ProductStatusTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    private Long productId;

    @BeforeEach
    public void setup() {
        productRepository.deleteAll();
        
        // Create a base product
        Product product = new Product();
        product.setName("Original Product");
        product.setSkuCode("SKU-ORIG");
        product.setStatus(Product.Status.PENDING_SELECTION);
        product = productRepository.save(product);
        productId = product.getId();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void create_ShouldFail_WhenNameDuplicate() throws Exception {
        // Create a product
        Product product = new Product();
        product.setName("Unique Product");
        product.setSkuCode("SKU-UNIQUE");
        product.setStatus(Product.Status.PENDING_SELECTION);
        productRepository.save(product);

        // Try to create another with same name
        Product newProduct = new Product();
        newProduct.setName("Unique Product");
        
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(new ObjectMapper().writeValueAsString(newProduct)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("商品名称已存在"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void checkName_ShouldReturnTrue_WhenNameExists() throws Exception {
        // Create a product
        Product product = new Product();
        product.setName("Existing Name");
        product.setSkuCode("SKU-EXIST");
        product.setStatus(Product.Status.PENDING_SELECTION);
        productRepository.save(product);

        // Check name
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/products/validation/name")
                .param("name", "Existing Name"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true));
                
        // Check name with excludeId
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/products/validation/name")
                .param("name", "Existing Name")
                .param("excludeId", product.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(false));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void update_ShouldPreserveSkuCode_WhenMissingInRequest() throws Exception {
        // Create product with SKU Code
        Product product = new Product();
        product.setName("Original Name");
        product.setSkuCode("SKU-ORIG-001");
        product.setStatus(Product.Status.PENDING_SELECTION);
        product = productRepository.save(product);

        // Update payload without SKU Code
        Product updatePayload = new Product();
        updatePayload.setId(product.getId());
        updatePayload.setName("Updated Name");
        updatePayload.setStatus(Product.Status.PENDING_SELECTION);
        // skuCode is null

        mockMvc.perform(put("/api/products/" + product.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(new ObjectMapper().writeValueAsString(updatePayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.skuCode").value("SKU-ORIG-001"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void updateStatus_ShouldReachEndpoint_AndValidateFields() throws Exception {
        // This test confirms that PATCH /api/products/{id}/status is reachable
        // It should return 400 because we haven't set mandatory fields (Brand, Category, etc.)
        mockMvc.perform(patch("/api/products/" + productId + "/status")
                .param("status", "SELECTED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("必填项")));
    }
    
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void updateStatus_ShouldFail_WhenNameDuplicate() throws Exception {
        // Create another product with name "Duplicate Target"
        Product other = new Product();
        other.setName("Duplicate Target");
        other.setSkuCode("SKU-OTHER");
        productRepository.save(other);

        // Rename current product to "Duplicate Target" directly in DB (simulating legacy data)
        Product current = productRepository.findById(productId).get();
        current.setName("Duplicate Target");
        productRepository.save(current);

        // Try to update status
        mockMvc.perform(patch("/api/products/" + productId + "/status")
                .param("status", "SELECTED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("商品名称已存在，请先修改名称"));
    }
}
