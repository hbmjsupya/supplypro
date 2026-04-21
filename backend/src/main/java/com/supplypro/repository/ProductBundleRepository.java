package com.supplypro.repository;

import com.supplypro.entity.ProductBundle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductBundleRepository extends JpaRepository<ProductBundle, Long> {
    List<ProductBundle> findByParentProductId(Long parentProductId);
    void deleteByParentProductId(Long parentProductId);
    void deleteByChildProductId(Long childProductId);
}
