package com.supplypro.service.impl;

import com.supplypro.common.exception.BusinessException;
import com.supplypro.dto.SupplierDTO;
import com.supplypro.dto.SupplierSearchCriteria;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.User;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.UserRepository;
import com.supplypro.entity.Brand;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.SupplierAccountRepository;
import com.supplypro.repository.SupplierFileRepository;
import com.supplypro.service.SupplierService;
import com.supplypro.entity.SupplierFile;
import com.supplypro.dto.SupplierFileDTO;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SupplierServiceImpl implements SupplierService {

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private com.supplypro.repository.SkuRepository skuRepository;

    @Autowired
    private SupplierAccountRepository supplierAccountRepository;

    @Autowired
    private SupplierFileRepository supplierFileRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public Page<SupplierDTO> findAll(int page, int size, SupplierSearchCriteria criteria) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        
        Specification<Supplier> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(criteria.getName())) {
                predicates.add(cb.like(root.get("name"), "%" + criteria.getName() + "%"));
            }

            if (criteria.getSettlementType() != null) {
                predicates.add(cb.equal(root.get("settlementType"), criteria.getSettlementType()));
            }

            if (criteria.getSettlementPeriod() != null) {
                predicates.add(cb.equal(root.get("settlementPeriod"), criteria.getSettlementPeriod()));
            }

            if (criteria.getPurchaserId() != null) {
                predicates.add(cb.equal(root.get("purchaser").get("id"), criteria.getPurchaserId()));
            }

            if (StringUtils.hasText(criteria.getContactInfo())) {
                String likePattern = "%" + criteria.getContactInfo() + "%";
                Predicate nameLike = cb.like(root.get("contactPerson"), likePattern);
                Predicate phoneLike = cb.like(root.get("contactPhone"), likePattern);
                Predicate emailLike = cb.like(root.get("email"), likePattern);
                predicates.add(cb.or(nameLike, phoneLike, emailLike));
            }

            if (Boolean.TRUE.equals(criteria.getExpiringSoon())) {
                LocalDateTime start = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
                LocalDateTime end = start.plusDays(30).withHour(23).withMinute(59).withSecond(59).withNano(999999999);
                predicates.add(cb.between(root.get("coopEndTime"), start, end));
            }

            if (StringUtils.hasText(criteria.getStatus())) {
                try {
                    Supplier.Status statusEnum = Supplier.Status.valueOf(criteria.getStatus().toUpperCase());
                    predicates.add(cb.equal(root.get("status"), statusEnum));
                } catch (IllegalArgumentException e) {
                    // Ignore invalid status
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Supplier> result = supplierRepository.findAll(spec, pageRequest);
        return result.map(this::convertToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierDTO getById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "Supplier not found"));
        return convertToDTO(supplier);
    }

    @Override
    @Transactional
    public SupplierDTO create(SupplierDTO dto) {
        // Validate unique combination of name and phone
        if (supplierRepository.existsByNameAndContactPhone(dto.getName(), dto.getContactPhone())) {
            throw new BusinessException("供应商已存在: 名称[" + dto.getName() + "] 和 电话[" + dto.getContactPhone() + "] 的组合重复");
        }

        Supplier supplier = new Supplier();
        BeanUtils.copyProperties(dto, supplier, "purchaserId");

        // Generate ID: GYS + 7 digits
        String maxSupplierNo = supplierRepository.findMaxSupplierNo();
        long nextId = 1;
        if (StringUtils.hasText(maxSupplierNo) && maxSupplierNo.startsWith("GYS")) {
            try {
                String numStr = maxSupplierNo.substring(3);
                nextId = Long.parseLong(numStr) + 1;
            } catch (NumberFormatException e) {
                // Ignore, start from 1
            }
        }
        String supplierNo = String.format("GYS%07d", nextId);
        supplier.setSupplierNo(supplierNo);

        // Set Purchaser
        if (dto.getPurchaserId() != null) {
            User purchaser = userRepository.findById(dto.getPurchaserId())
                    .orElseThrow(() -> new BusinessException("Purchaser not found with ID: " + dto.getPurchaserId()));
            supplier.setPurchaser(purchaser);
        }

        supplier = supplierRepository.save(supplier);
        
        syncBrands(supplier, dto.getBrandIds());
        
        // Handle new files
        if (dto.getNewFiles() != null && !dto.getNewFiles().isEmpty()) {
            for (SupplierFileDTO fileDto : dto.getNewFiles()) {
                SupplierFile file = new SupplierFile();
                file.setSupplier(supplier);
                file.setCategory(SupplierFile.FileCategory.valueOf(fileDto.getCategory()));
                file.setOriginalFileName(fileDto.getOriginalFileName());
                file.setStoredFileName(fileDto.getStoredFileName());
                file.setFilePath("/uploads/" + fileDto.getStoredFileName());
                file.setFileType(fileDto.getFileType());
                file.setFileSize(fileDto.getFileSize());
                file.setUploadTime(LocalDateTime.now());
                file.setUploader("system");
                file.setDescription(fileDto.getDescription());
                file.setGroupId(fileDto.getGroupId());
                file.setVersion(1);
                file.setIsLatest(true);
                file.setIsDeleted(false);
                
                supplierFileRepository.save(file);
            }
        }
        
        return convertToDTO(supplier);
    }

    @Override
    @Transactional
    public SupplierDTO update(Long id, SupplierDTO dto) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "Supplier not found"));
        
        // Validate unique combination of name and phone (exclude self)
        // Only check if either name or phone has changed
        boolean nameChanged = !existing.getName().equals(dto.getName());
        boolean phoneChanged = !existing.getContactPhone().equals(dto.getContactPhone());
        
        if ((nameChanged || phoneChanged) && 
            supplierRepository.existsByNameAndContactPhone(dto.getName(), dto.getContactPhone())) {
             // We need to ensure we are not matching ourselves. 
             // Since we check combination, and existing record has this combination if nothing changed,
             // but here at least one changed. So if exists, it must be ANOTHER record.
             // Wait, if I change Name but keep Phone, and there is another record with (NewName, Phone), it's a conflict.
             // If I change nothing, no check needed.
             // But 'existsByNameAndContactPhone' might find 'existing' itself if I didn't change anything?
             // Ah, logic above says (nameChanged || phoneChanged).
             // If I change Name A->B, Phone P->P. Check (B, P).
             // If another record has (B, P), error.
             // If no other record has (B, P), ok.
             // My own record is (A, P). So (B, P) won't match myself.
             // So this logic is correct.
            throw new BusinessException("供应商已存在: 名称[" + dto.getName() + "] 和 电话[" + dto.getContactPhone() + "] 的组合重复");
        }

        BeanUtils.copyProperties(dto, existing, "id", "createdAt", "updatedAt", "supplierNo", "purchaserId");

        // Update Purchaser
        if (dto.getPurchaserId() != null) {
            if (existing.getPurchaser() == null || !existing.getPurchaser().getId().equals(dto.getPurchaserId())) {
                User purchaser = userRepository.findById(dto.getPurchaserId())
                        .orElseThrow(() -> new BusinessException("Purchaser not found with ID: " + dto.getPurchaserId()));
                existing.setPurchaser(purchaser);
            }
        } else {
            existing.setPurchaser(null);
        }

        existing = supplierRepository.save(existing);
        
        syncBrands(existing, dto.getBrandIds());
        
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

    @Override
    @Transactional
    public void deleteAll() {
        // 1. Clear default supplier from skus
        skuRepository.clearAllSuppliers();
        
        // 2. Delete all supplier accounts
        supplierAccountRepository.deleteAll();
        
        // 3. Clear brand associations (Native query to be safe and fast)
        entityManager.createNativeQuery("DELETE FROM brand_supplier").executeUpdate();

        // 4. Delete all suppliers
        supplierRepository.deleteAll();
    }

    private SupplierDTO convertToDTO(Supplier entity) {
        SupplierDTO dto = new SupplierDTO();
        BeanUtils.copyProperties(entity, dto);
        
        if (entity.getPurchaser() != null) {
            dto.setPurchaserId(entity.getPurchaser().getId());
            dto.setPurchaserName(entity.getPurchaser().getUsername()); // Assuming username is the name
        }
        
        // Assuming brands are fetched lazily, accessing them might trigger query if session is open
        // For DTO, we might want to map brand names if requested.
        // The DTO has brandNames list.
        if (entity.getBrands() != null && !entity.getBrands().isEmpty()) {
             // Avoid N+1 if not fetched? 
             // Simplest way for now:
             try {
                 List<String> brandNames = entity.getBrands().stream()
                     .map(Brand::getName)
                     .collect(Collectors.toList());
                 dto.setBrandNames(brandNames);
                 
                 List<Long> brandIds = entity.getBrands().stream()
                     .map(Brand::getId)
                     .collect(Collectors.toList());
                 dto.setBrandIds(brandIds);
             } catch (Exception e) {
                 // Ignore lazy init exception if it happens, or handle it
             }
        }
        
        return dto;
    }

    private void syncBrands(Supplier supplier, List<Long> brandIds) {
        if (brandIds == null) return;

        // 1. Get currently associated brands
        List<Brand> currentBrands = brandRepository.findBySuppliers_Id(supplier.getId());

        // 2. Remove supplier from brands not in the new list
        for (Brand brand : currentBrands) {
            if (!brandIds.contains(brand.getId())) {
                brand.getSuppliers().remove(supplier);
                brandRepository.save(brand);
                // Also update supplier side in memory to keep DTO consistent
                if (supplier.getBrands() != null) {
                    supplier.getBrands().remove(brand);
                }
            }
        }

        // 3. Add supplier to brands in the new list
        List<Brand> newBrands = brandRepository.findAllById(brandIds);
        for (Brand brand : newBrands) {
            brand.getSuppliers().add(supplier);
            brandRepository.save(brand);
             // Also update supplier side in memory to keep DTO consistent
            if (supplier.getBrands() != null) {
                supplier.getBrands().add(brand);
            }
        }
    }
}
