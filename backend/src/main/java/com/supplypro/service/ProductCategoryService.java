package com.supplypro.service;

import com.supplypro.entity.ProductCategory;
import java.util.List;

public interface ProductCategoryService {
    /**
     * Get categories by parent ID.
     * If data is empty, it may trigger initialization/sync.
     */
    List<ProductCategory> getCategoriesByParentId(String parentId);

    /**
     * Search categories by name.
     */
    List<ProductCategory> searchCategories(String keyword);

    /**
     * Get full path from root to the specified category.
     * Returns ordered list: [Root, Level2, ..., Target]
     */
    List<ProductCategory> getCategoryPath(String categoryId);

    /**
     * Initialize or sync mock data (simulating Suning API).
     */
    void syncCategories();
}
