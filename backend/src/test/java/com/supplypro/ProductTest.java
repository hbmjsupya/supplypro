package com.supplypro;

import com.supplypro.entity.Product;
import com.supplypro.repository.ProductRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@SpringBootTest
@Transactional
public class ProductTest {

    @Autowired
    private ProductRepository productRepository;

    @Test
    public void testProductNewFields() {
        Product product = new Product();
        product.setName("Unified Product");
        product.setSkuCode("SKU-UNIFIED-001");
        product.setStatus(Product.Status.ON_SHELF);
        
        // New fields
        product.setTaxClass("Standard");
        product.setTaxRate(new BigDecimal("0.13"));
        product.setTaxCode("TAX001");
        product.setLogisticsTemplate("Default Template");
        product.setPromoFile("promo.jpg");

        Product savedProduct = productRepository.save(product);

        Assertions.assertNotNull(savedProduct.getId());
        Assertions.assertEquals(Product.Status.ON_SHELF, savedProduct.getStatus());
        Assertions.assertEquals("Standard", savedProduct.getTaxClass());
        Assertions.assertEquals(new BigDecimal("0.13"), savedProduct.getTaxRate());
        Assertions.assertEquals("TAX001", savedProduct.getTaxCode());
        Assertions.assertEquals("Default Template", savedProduct.getLogisticsTemplate());
        Assertions.assertEquals("promo.jpg", savedProduct.getPromoFile());
    }
}
