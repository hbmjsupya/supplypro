package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.dto.SupplierSearchCriteria;
import com.supplypro.dto.SupplierDTO;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.SupplierAccount;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.SupplierAccountRepository;
import com.supplypro.service.SupplierService;
import com.supplypro.service.SupplierFinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "*")
public class SupplierController {

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private SupplierFinanceService supplierFinanceService;
    
    @Autowired
    private SupplierRepository supplierRepository;
    
    @Autowired
    private SupplierAccountRepository supplierAccountRepository;

    private final Path fileStorageLocation = Paths.get("uploads/suppliers").toAbsolutePath().normalize();

    public SupplierController() {
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @PostMapping("/upload")
    public ApiResponse<String> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("Failed to store empty file.");
        }
        
        String contentType = file.getContentType();
        long size = file.getSize();
        
        // Image: <= 5MB
        if (contentType != null && (contentType.startsWith("image/"))) {
            if (size > 5 * 1024 * 1024) {
                throw new RuntimeException("Image file size exceeds 5MB limit.");
            }
        } 
        // Other (Docs): <= 10MB
        else {
             if (size > 10 * 1024 * 1024) {
                throw new RuntimeException("File size exceeds 10MB limit.");
            }
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String fileName = UUID.randomUUID().toString() + extension;
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            return ApiResponse.success("File uploaded successfully", "/uploads/suppliers/" + fileName);
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + file.getOriginalFilename() + ". Please try again!", ex);
        }
    }

    @GetMapping
    public ApiResponse<Page<SupplierDTO>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Supplier.SettlementType settlementType,
            @RequestParam(required = false) Integer settlementPeriod,
            @RequestParam(required = false) Long purchaserId,
            @RequestParam(required = false) String contactInfo,
            @RequestParam(required = false) Boolean expiringSoon,
            @RequestParam(required = false) String status) {
        
        SupplierSearchCriteria criteria = new SupplierSearchCriteria();
        criteria.setName(name);
        criteria.setSettlementType(settlementType);
        criteria.setSettlementPeriod(settlementPeriod);
        criteria.setPurchaserId(purchaserId);
        criteria.setContactInfo(contactInfo);
        criteria.setExpiringSoon(expiringSoon);
        criteria.setStatus(status);

        Page<SupplierDTO> result = supplierService.findAll(page, size, criteria);
        return ApiResponse.success(result);
    }

    @GetMapping("/{id}")
    public ApiResponse<SupplierDTO> getById(@PathVariable Long id) {
        return ApiResponse.success(supplierService.getById(id));
    }

    @PostMapping
    public ApiResponse<SupplierDTO> create(@Valid @RequestBody SupplierDTO dto) {
        return ApiResponse.success("Created successfully", supplierService.create(dto));
    }

    @PutMapping("/{id}")
    public ApiResponse<SupplierDTO> update(@PathVariable Long id, @Valid @RequestBody SupplierDTO dto) {
        return ApiResponse.success("Updated successfully", supplierService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ApiResponse.success("Deleted successfully", null);
    }

    @DeleteMapping("/all")
    public ApiResponse<Void> deleteAll() {
        supplierService.deleteAll();
        return ApiResponse.success("Deleted all suppliers successfully", null);
    }

    @GetMapping("/{id}/prepayment/logs")
    public ApiResponse<?> getPrepaymentLogs(@PathVariable Long id) {
        return ApiResponse.success(supplierFinanceService.getLogs(id));
    }

    @PostMapping("/{id}/prepayment/charge")
    public ApiResponse<?> chargePrepayment(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String remark = (String) payload.get("remark");
        // TODO: Get current user
        String createdBy = "admin"; 
        supplierFinanceService.charge(id, amount, remark, createdBy);
        return ApiResponse.success("Charged successfully", null);
    }

    @GetMapping("/{id}/accounts")
    public ApiResponse<List<SupplierAccount>> getAccounts(@PathVariable Long id) {
        return ApiResponse.success(supplierAccountRepository.findBySupplierId(id));
    }

    @PostMapping("/{id}/accounts")
    public ApiResponse<SupplierAccount> addAccount(@PathVariable Long id, @RequestBody SupplierAccount account) {
        return supplierRepository.findById(id).map(supplier -> {
            account.setSupplier(supplier);
            
            // If setting as default, unset others
            if (account.isDefault()) {
                List<SupplierAccount> accounts = supplierAccountRepository.findBySupplierId(id);
                for (SupplierAccount acc : accounts) {
                    if (acc.isDefault() && !acc.getId().equals(account.getId())) {
                        acc.setDefault(false);
                        supplierAccountRepository.save(acc);
                    }
                }
            }
            
            return ApiResponse.success(supplierAccountRepository.save(account));
        }).orElseThrow(() -> new RuntimeException("Supplier not found"));
    }
    
    @DeleteMapping("/{id}/accounts/{accountId}")
    public ApiResponse<Void> deleteAccount(@PathVariable Long id, @PathVariable Long accountId) {
        supplierAccountRepository.deleteById(accountId);
        return ApiResponse.success("Deleted successfully", null);
    }
}
