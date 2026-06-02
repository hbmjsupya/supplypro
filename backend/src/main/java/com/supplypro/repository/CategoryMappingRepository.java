package com.supplypro.repository;

import com.supplypro.entity.CategoryMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryMappingRepository extends JpaRepository<CategoryMapping, Long> {
    List<CategoryMapping> findBySalesProjectId(String salesProjectId);
    List<CategoryMapping> findBySalesProjectIdAndSystemCategoryId(String salesProjectId, String systemCategoryId);
    List<CategoryMapping> findBySalesProjectIdAndProjectCategoryId(String salesProjectId, String projectCategoryId);
    CategoryMapping findBySystemCategoryIdAndProjectCategoryIdAndSalesProjectId(String systemCategoryId, String projectCategoryId, String salesProjectId);
    void deleteBySalesProjectId(String salesProjectId);
    boolean existsBySystemCategoryIdAndSalesProjectId(String systemCategoryId, String salesProjectId);
}
