package com.supplypro.repository;

import com.supplypro.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    Page<Supplier> findByNameContaining(String name, Pageable pageable);
    Supplier findBySupplierNo(String supplierNo);
}
