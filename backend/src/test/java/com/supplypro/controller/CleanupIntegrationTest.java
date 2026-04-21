package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.Product;
import com.supplypro.repository.ProductRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional // Rollback after test, but the controller method itself is also transactional
public class CleanupIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Test
    @WithMockUser(username = "admin")
    public void testCleanupTestData() throws Exception {
        // 1. Setup Data
        // Manual Product (Should stay)
        Product manual = new Product();
        manual.setName("Manual Product");
        manual.setSkuCode("MANUAL-001");
        manual.setStatus(Product.Status.ON_SHELF);
        productRepository.save(manual);

        // Test Product 1 (Should go)
        Product test1 = new Product();
        test1.setName("Integration Test Product");
        test1.setSkuCode("TEST-001");
        test1.setStatus(Product.Status.PENDING_SELECTION);
        productRepository.save(test1);

        // Test Product 2 (Should go)
        Product test2 = new Product();
        test2.setName("Auto Generated Product");
        test2.setSkuCode("AUTO-002");
        test2.setStatus(Product.Status.PENDING_SELECTION);
        productRepository.save(test2);

        productRepository.count(); // was countBefore

        // 2. Execute Cleanup
        String response = mockMvc.perform(post("/api/system/maintenance/cleanup-test-data")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.report.test_products_deleted").value(2))
                .andReturn().getResponse().getContentAsString();

        // 3. Verify Data
        Assertions.assertTrue(productRepository.existsById(manual.getId()), "Manual product should exist");
        Assertions.assertFalse(productRepository.existsById(test1.getId()), "Test product 1 should be deleted");
        Assertions.assertFalse(productRepository.existsById(test2.getId()), "Test product 2 should be deleted");

        // 4. Verify Backup File
        // Parse response to get file path
        ObjectMapper mapper = new ObjectMapper();
        String backupPath = mapper.readTree(response).get("report").get("backup_file").asText();
        
        Assertions.assertNotEquals("N/A", backupPath);
        File backupFile = new File(backupPath);
        Assertions.assertTrue(backupFile.exists(), "Backup file should exist");
        
        // Clean up the backup file created during test
        Files.deleteIfExists(Paths.get(backupPath));
    }
}
