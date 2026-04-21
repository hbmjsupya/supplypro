package com.supplypro.controller;

import com.supplypro.entity.Product;
import com.supplypro.entity.ProductBundle;
import com.supplypro.repository.ProductBundleRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.ProductStatusChangeLogRepository;
import com.supplypro.repository.StockBatchRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class BundleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductRepository productRepository;

    @MockBean
    private ProductBundleRepository productBundleRepository;

    @MockBean
    private StockBatchRepository stockBatchRepository;

    @MockBean
    private ProductStatusChangeLogRepository productStatusChangeLogRepository;

    @Test
    @WithMockUser(username = "admin")
    public void testListBundle_Success() throws Exception {
        Long bundleId = 1L;
        Product bundle = new Product();
        bundle.setId(bundleId);
        bundle.setType(Product.ProductType.BUNDLE);
        bundle.setStatus(Product.Status.DELISTED); // Start from DELISTED
        bundle.setName("Test Bundle");

        Product child = new Product();
        child.setId(2L);
        child.setStatus(Product.Status.ON_SHELF);
        child.setName("Child Product");

        ProductBundle item = new ProductBundle();
        item.setChildProduct(child);
        item.setQuantity(1);

        Mockito.when(productRepository.findById(bundleId)).thenReturn(Optional.of(bundle));
        Mockito.when(productBundleRepository.findByParentProductId(bundleId)).thenReturn(Collections.singletonList(item));
        Mockito.when(stockBatchRepository.sumAvailableQuantityByProductId(child.getId())).thenReturn(10);

        mockMvc.perform(post("/api/bundles/" + bundleId + "/list")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk());
        
        // Verify status updated
        Mockito.verify(productRepository).save(any(Product.class));
        Mockito.verify(productStatusChangeLogRepository).save(any());
    }

    @Test
    @WithMockUser(username = "admin")
    public void testListBundle_ValidationFail_ChildStatus() throws Exception {
        Long bundleId = 1L;
        Product bundle = new Product();
        bundle.setId(bundleId);
        bundle.setType(Product.ProductType.BUNDLE);
        bundle.setStatus(Product.Status.DELISTED);

        Product child = new Product();
        child.setId(2L);
        child.setStatus(Product.Status.OFF_SHELF); // Invalid status
        child.setName("Child Product");

        ProductBundle item = new ProductBundle();
        item.setChildProduct(child);
        item.setQuantity(1);

        Mockito.when(productRepository.findById(bundleId)).thenReturn(Optional.of(bundle));
        Mockito.when(productBundleRepository.findByParentProductId(bundleId)).thenReturn(Collections.singletonList(item));

        mockMvc.perform(post("/api/bundles/" + bundleId + "/list")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isInternalServerError()); // Or whatever exception handler returns
    }

    @Test
    @WithMockUser(username = "admin")
    public void testListBundle_Idempotency() throws Exception {
        Long bundleId = 1L;
        Product bundle = new Product();
        bundle.setId(bundleId);
        bundle.setType(Product.ProductType.BUNDLE);
        bundle.setStatus(Product.Status.LISTED); // Already LISTED

        Mockito.when(productRepository.findById(bundleId)).thenReturn(Optional.of(bundle));

        mockMvc.perform(post("/api/bundles/" + bundleId + "/list")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk());

        // Verify NO save occurred
        Mockito.verify(productRepository, Mockito.never()).save(any(Product.class));
    }
    
    @Test
    @WithMockUser(username = "admin")
    public void testDelistBundle_Idempotency() throws Exception {
        Long bundleId = 1L;
        Product bundle = new Product();
        bundle.setId(bundleId);
        bundle.setType(Product.ProductType.BUNDLE);
        bundle.setStatus(Product.Status.DELISTED); // Already DELISTED

        Mockito.when(productRepository.findById(bundleId)).thenReturn(Optional.of(bundle));

        mockMvc.perform(post("/api/bundles/" + bundleId + "/delist")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk());

        // Verify NO save occurred
        Mockito.verify(productRepository, Mockito.never()).save(any(Product.class));
    }

    @Test
    @WithMockUser(username = "admin")
    public void testDelistBundle_Success() throws Exception {
        Long bundleId = 1L;
        Product bundle = new Product();
        bundle.setId(bundleId);
        bundle.setType(Product.ProductType.BUNDLE);
        bundle.setStatus(Product.Status.LISTED);

        Mockito.when(productRepository.findById(bundleId)).thenReturn(Optional.of(bundle));

        mockMvc.perform(post("/api/bundles/" + bundleId + "/delist")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk());

        Mockito.verify(productRepository).save(any(Product.class));
    }
}
