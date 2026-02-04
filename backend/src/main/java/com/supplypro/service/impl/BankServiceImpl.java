package com.supplypro.service.impl;

import com.supplypro.dto.BankDto;
import com.supplypro.entity.Bank;
import com.supplypro.repository.BankRepository;
import com.supplypro.service.BankService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

@Service
public class BankServiceImpl implements BankService {

    @Autowired
    private BankRepository bankRepository;

    @Override
    public Page<BankDto> findAll(int page, int size, String keyword, Boolean status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());

        Specification<Bank> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                String likePattern = "%" + keyword.trim() + "%";
                Predicate nameLike = cb.like(root.get("name"), likePattern);
                Predicate shortNameLike = cb.like(root.get("shortName"), likePattern);
                Predicate codeLike = cb.like(root.get("bankCode"), likePattern);
                predicates.add(cb.or(nameLike, shortNameLike, codeLike));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Bank> bankPage = bankRepository.findAll(spec, pageable);
        return bankPage.map(this::convertToDto);
    }

    @Override
    public BankDto getById(Long id) {
        Bank bank = bankRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bank not found with id: " + id));
        return convertToDto(bank);
    }

    @Override
    @Transactional
    public BankDto create(BankDto dto) {
        if (bankRepository.existsByBankCode(dto.getBankCode())) {
            throw new RuntimeException("Bank code already exists: " + dto.getBankCode());
        }
        Bank bank = convertToEntity(dto);
        bank = bankRepository.save(bank);
        return convertToDto(bank);
    }

    @Override
    @Transactional
    public BankDto update(Long id, BankDto dto) {
        Bank existingBank = bankRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bank not found with id: " + id));
        
        if (!existingBank.getBankCode().equals(dto.getBankCode()) && 
            bankRepository.existsByBankCode(dto.getBankCode())) {
            throw new RuntimeException("Bank code already exists: " + dto.getBankCode());
        }

        BeanUtils.copyProperties(dto, existingBank, "id", "createdAt", "updatedAt");
        existingBank = bankRepository.save(existingBank);
        return convertToDto(existingBank);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!bankRepository.existsById(id)) {
            throw new RuntimeException("Bank not found with id: " + id);
        }
        bankRepository.deleteById(id);
    }

    @Override
    public boolean existsByBankCode(String bankCode) {
        return bankRepository.existsByBankCode(bankCode);
    }

    private BankDto convertToDto(Bank bank) {
        BankDto dto = new BankDto();
        BeanUtils.copyProperties(bank, dto);
        return dto;
    }

    private Bank convertToEntity(BankDto dto) {
        Bank bank = new Bank();
        BeanUtils.copyProperties(dto, bank);
        return bank;
    }
}
