package com.supplypro.service;

import com.supplypro.repository.ProductCategoryRepository;
import com.supplypro.repository.TaxCategoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
public class DataVerificationTest {

    @Autowired
    private ProductCategoryService productCategoryService;

    @Autowired
    private TaxCategoryService taxCategoryService;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private TaxCategoryRepository taxCategoryRepository;

    @Test
    @Transactional
    @Rollback(false)
    public void verifyData() {
        // 触发模拟数据同步
        productCategoryService.syncCategories();
        taxCategoryService.syncTaxData();

        // 验证商品分类数据量 (应 > 100)
        long catCount = productCategoryRepository.count();
        System.out.println("Product Categories Count: " + catCount);
        assertTrue(catCount >= 100, "Product Categories should be at least 100, but found " + catCount);

        // 验证税务分类数据量 (应 > 100)
        long taxCount = taxCategoryRepository.count();
        System.out.println("Tax Categories Count: " + taxCount);
        assertTrue(taxCount >= 100, "Tax Categories should be at least 100, but found " + taxCount);
    }
}
