package com.supplypro.repository;

import com.supplypro.entity.ProductBrand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductBrandRepository extends JpaRepository<ProductBrand, Long> {
    Optional<ProductBrand> findByProductIdAndBrandId(Long productId, Long brandId);
    void deleteByProductId(Long productId);
}
