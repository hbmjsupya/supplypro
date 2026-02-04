package com.supplypro.controller;

import com.supplypro.entity.Product;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.service.ProductSyncProducer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ProductStatusPermissionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductRepository productRepository;

    @MockBean
    private BrandRepository brandRepository;

    @MockBean
    private ProductSyncProducer productSyncProducer;

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    public void testUpdateStatus_User_NoPermission() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setBrandId(100L);
        product.setStatus(Product.Status.PENDING_SELECTION);

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(brandRepository.hasPermission(eq(100L), anyString())).thenReturn(false);

        mockMvc.perform(patch("/api/products/1/status")
                .param("status", "OFF_SHELF"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    public void testUpdateStatus_User_HasPermission() throws Exception {
        Product product = new Product();
        product.setId(1L);
        product.setBrandId(100L);
        product.setStatus(Product.Status.ON_SHELF);
        product.setSkuCode("SKU123"); // Avoid auto-generation logic

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(brandRepository.hasPermission(eq(100L), anyString())).thenReturn(true);
        when(productRepository.save(any(Product.class))).thenReturn(product);

        mockMvc.perform(patch("/api/products/1/status")
                .param("status", "OFF_SHELF"))
                .andExpect(status().isOk());
    }
}
