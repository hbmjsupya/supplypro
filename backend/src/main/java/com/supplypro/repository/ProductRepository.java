package com.supplypro.repository;

import com.supplypro.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Page<Product> findByNameContaining(String name, Pageable pageable);

    @EntityGraph(attributePaths = {"brand"})
    Optional<Product> findWithBrandById(Long id);
    
    @EntityGraph(attributePaths = {"brand"})
    Page<Product> findAll(Pageable pageable);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    List<Product> findByType(Product.ProductType type);
    
    Page<Product> findByStatus(Product.Status status, Pageable pageable);
}
