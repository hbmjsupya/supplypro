package com.supplypro.repository;

import com.supplypro.entity.SupplierAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierAccountRepository extends JpaRepository<SupplierAccount, Long> {
    List<SupplierAccount> findBySupplierId(Long supplierId);
    List<SupplierAccount> findBySupplier(com.supplypro.entity.Supplier supplier);

    @Modifying
    @Query("DELETE FROM SupplierAccount sa WHERE sa.supplier.id = :supplierId")
    void deleteBySupplierId(@Param("supplierId") Long supplierId);
}
