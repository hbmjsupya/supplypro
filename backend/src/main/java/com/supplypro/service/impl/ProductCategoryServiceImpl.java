package com.supplypro.service.impl;

import com.supplypro.entity.ProductCategory;
import com.supplypro.repository.ProductCategoryRepository;
import com.supplypro.service.ProductCategoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class ProductCategoryServiceImpl implements ProductCategoryService {

    @Autowired
    private ProductCategoryRepository categoryRepository;

    @Override
    public List<ProductCategory> getCategoriesByParentId(String parentId) {
        if ("0".equals(parentId) || parentId == null) {
            List<ProductCategory> rootCategories = categoryRepository.findByParentId("0");
            if (rootCategories.isEmpty()) {
                rootCategories = categoryRepository.findByParentIdIsNull();
            }
            return rootCategories;
        }
        return categoryRepository.findByParentId(parentId);
    }

    @Override
    public List<ProductCategory> searchCategories(String keyword) {
        return categoryRepository.findByNameContaining(keyword);
    }

    @Override
    public List<ProductCategory> getCategoryPath(String categoryId) {
        List<ProductCategory> path = new ArrayList<>();
        ProductCategory current = categoryRepository.findByCategoryId(categoryId);
        
        while (current != null) {
            path.add(0, current); // Add to beginning
            if ("0".equals(current.getParentId()) || current.getParentId() == null) {
                break;
            }
            current = categoryRepository.findByCategoryId(current.getParentId());
        }
        return path;
    }

    @Override
    @Transactional
    public void syncCategories() {
        // Mock data generation logic simulating Suning API structure
        // Level 1: Categories
        List<ProductCategory> allCategories = new ArrayList<>();
        
        String[] l1Names = {"办公用纸", "办公文具", "办公设备", "数码产品", "日用品"};
        
        for (int i = 0; i < l1Names.length; i++) {
            ProductCategory l1 = createCategory(l1Names[i], "0", 1, i);
            allCategories.add(l1);
            
            // Level 2
            for (int j = 1; j <= 3; j++) {
                ProductCategory l2 = createCategory(l1.getName() + "-二级" + j, l1.getCategoryId(), 2, j);
                l2.setFullPath(l1.getCategoryId() + "/" + l2.getCategoryId());
                allCategories.add(l2);
                
                // Level 3
                for (int k = 1; k <= 3; k++) {
                    ProductCategory l3 = createCategory(l2.getName() + "-三级" + k, l2.getCategoryId(), 3, k);
                    l3.setFullPath(l2.getFullPath() + "/" + l3.getCategoryId());
                    allCategories.add(l3);
                    
                    // Level 4
                    for (int m = 1; m <= 5; m++) {
                        ProductCategory l4 = createCategory(l3.getName() + "-四级" + m, l3.getCategoryId(), 4, m);
                        l4.setFullPath(l3.getFullPath() + "/" + l4.getCategoryId());
                        allCategories.add(l4);
                    }
                }
            }
        }
        
        categoryRepository.saveAll(allCategories);
        log.info("Initialized {} mock categories.", allCategories.size());
    }

    private ProductCategory createCategory(String name, String parentId, Integer level, Integer sortOrder) {
        ProductCategory c = new ProductCategory();
        c.setCategoryId("CAT_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setName(name);
        c.setParentId(parentId);
        c.setLevel(level);
        c.setSortOrder(sortOrder);
        c.setIsEnabled(true);
        c.setCreateTime(LocalDateTime.now());
        // code field can be same as categoryId or simplified
        c.setCode(c.getCategoryId());
        return c;
    }
}
