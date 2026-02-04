package com.supplypro.repository;

import com.supplypro.entity.SupplierAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierAccountRepository extends JpaRepository<SupplierAccount, Long> {
    List<SupplierAccount> findBySupplierId(Long supplierId);
}
