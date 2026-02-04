package com.supplypro.repository;

import com.supplypro.entity.TaxCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaxCategoryRepository extends JpaRepository<TaxCategory, Long> {
    List<TaxCategory> findByStatus(TaxCategory.Status status);
    List<TaxCategory> findByCategoryNameContainingOrCategoryCodeContaining(String name, String code);
}
