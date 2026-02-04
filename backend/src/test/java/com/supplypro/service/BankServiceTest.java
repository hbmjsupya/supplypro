package com.supplypro.service;

import com.supplypro.dto.BankDto;
import com.supplypro.entity.Bank;
import com.supplypro.repository.BankRepository;
import com.supplypro.service.impl.BankServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BankServiceTest {

    @Mock
    private BankRepository bankRepository;

    @InjectMocks
    private BankServiceImpl bankService;

    private Bank bank;

    @BeforeEach
    void setUp() {
        bank = new Bank();
        bank.setId(1L);
        bank.setBankCode("102100099996");
        bank.setName("中国工商银行股份有限公司");
        bank.setShortName("工商银行");
        bank.setType(Bank.BankType.STATE_OWNED);
        bank.setStatus(true);
    }

    @Test
    @SuppressWarnings("unchecked")
    void findAll_shouldReturnBankList() {
        Page<Bank> bankPage = new PageImpl<>(Collections.singletonList(bank));
        when(bankRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(bankPage);

        Page<BankDto> result = bankService.findAll(0, 10, "工商", true);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("工商银行", result.getContent().get(0).getShortName());
    }

    @Test
    void create_shouldThrowException_whenBankCodeExists() {
        BankDto dto = new BankDto();
        dto.setBankCode("102100099996");

        when(bankRepository.existsByBankCode("102100099996")).thenReturn(true);

        assertThrows(RuntimeException.class, () -> bankService.create(dto));
    }
}
