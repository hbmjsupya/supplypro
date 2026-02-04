package com.supplypro.repository;

import com.supplypro.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {
    Page<Supplier> findByNameContaining(String name, Pageable pageable);
    Supplier findBySupplierNo(String supplierNo);
    boolean existsByName(String name);
    boolean existsByContactPhone(String contactPhone);
    boolean existsByNameAndContactPhone(String name, String contactPhone);

    @org.springframework.data.jpa.repository.Query("SELECT MAX(s.supplierNo) FROM Supplier s")
    String findMaxSupplierNo();
    
    java.util.List<Supplier> findByPurchaser_Username(String username);
}
