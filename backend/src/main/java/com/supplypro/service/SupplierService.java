package com.supplypro.service;

import com.supplypro.dto.SupplierSearchCriteria;
import com.supplypro.dto.SupplierDTO;
import org.springframework.data.domain.Page;

public interface SupplierService {
    Page<SupplierDTO> findAll(int page, int size, SupplierSearchCriteria criteria);
    SupplierDTO getById(Long id);
    SupplierDTO create(SupplierDTO dto);
    SupplierDTO update(Long id, SupplierDTO dto);
    void delete(Long id);
    void deleteAll();
}
