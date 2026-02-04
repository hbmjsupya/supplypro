package com.supplypro.repository;

import com.supplypro.entity.Bank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BankRepository extends JpaRepository<Bank, Long>, JpaSpecificationExecutor<Bank> {
    Optional<Bank> findByBankCode(String bankCode);
    boolean existsByBankCode(String bankCode);
    
    // For fuzzy search
    Page<Bank> findByNameContaining(String name, Pageable pageable);
}
