package com.supplypro.service.impl;

import com.supplypro.common.exception.BusinessException;
import com.supplypro.dto.SupplierDTO;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.service.SupplierService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierServiceImpl implements SupplierService {

    @Autowired
    private SupplierRepository supplierRepository;

    @Override
    public Page<SupplierDTO> findAll(int page, int size, String name) {
        Page<Supplier> result;
        if (name != null && !name.isEmpty()) {
            result = supplierRepository.findByNameContaining(name, PageRequest.of(page, size));
        } else {
            result = supplierRepository.findAll(PageRequest.of(page, size));
        }
        return result.map(this::convertToDTO);
    }

    @Override
    public SupplierDTO getById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "Supplier not found"));
        return convertToDTO(supplier);
    }

    @Override
    @Transactional
    public SupplierDTO create(SupplierDTO dto) {
        if (supplierRepository.findBySupplierNo(dto.getSupplierNo()) != null) {
            throw new BusinessException("Supplier No already exists");
        }
        Supplier supplier = new Supplier();
        BeanUtils.copyProperties(dto, supplier);
        supplier = supplierRepository.save(supplier);
        return convertToDTO(supplier);
    }

    @Override
    @Transactional
    public SupplierDTO update(Long id, SupplierDTO dto) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "Supplier not found"));
        
        BeanUtils.copyProperties(dto, existing, "id", "createdAt", "updatedAt");
        existing = supplierRepository.save(existing);
        return convertToDTO(existing);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new BusinessException(404, "Supplier not found");
        }
        supplierRepository.deleteById(id);
    }

    private SupplierDTO convertToDTO(Supplier entity) {
        SupplierDTO dto = new SupplierDTO();
        BeanUtils.copyProperties(entity, dto);
        return dto;
    }
}
