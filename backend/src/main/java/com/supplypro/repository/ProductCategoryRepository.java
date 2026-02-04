package com.supplypro.repository;

import com.supplypro.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    List<ProductCategory> findByParentId(String parentId);
    List<ProductCategory> findByLevel(Integer level);
    List<ProductCategory> findByNameContaining(String name);
    ProductCategory findByCategoryId(String categoryId);
}
