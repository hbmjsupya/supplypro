package com.supplypro.repository;

import com.supplypro.entity.Sku;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkuRepository extends JpaRepository<Sku, Long> {
    Sku findBySkuCode(String skuCode);

    List<Sku> findByProductId(Long productId);

    @Modifying
    @Query("UPDATE Sku s SET s.supplier = NULL")
    void clearAllSuppliers();

    @Modifying
    @Query("UPDATE Sku s SET s.supplier = NULL WHERE s.supplier.id = :supplierId")
    void clearSupplierById(@Param("supplierId") Long supplierId);

    void deleteByProductId(Long productId);
}
