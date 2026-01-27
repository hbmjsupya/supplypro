package com.supplypro.repository;

import com.supplypro.entity.Brand;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {
    Page<Brand> findByNameContaining(String name, Pageable pageable);
    List<Brand> findBySuppliers_Id(Long supplierId);
}
