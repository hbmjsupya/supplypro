package com.supplypro.service;

import com.supplypro.dto.BankDto;
import org.springframework.data.domain.Page;

public interface BankService {
    Page<BankDto> findAll(int page, int size, String keyword, Boolean status);
    BankDto getById(Long id);
    BankDto create(BankDto dto);
    BankDto update(Long id, BankDto dto);
    void delete(Long id);
    
    // For internal use or specific checks
    boolean existsByBankCode(String bankCode);
}
