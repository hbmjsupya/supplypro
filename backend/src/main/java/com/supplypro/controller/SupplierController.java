package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.dto.SupplierDTO;
import com.supplypro.service.SupplierService;
import com.supplypro.service.SupplierFinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "*")
public class SupplierController {

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private SupplierFinanceService supplierFinanceService;

    @GetMapping
    public ApiResponse<Page<SupplierDTO>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name) {
        Page<SupplierDTO> result = supplierService.findAll(page, size, name);
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
}
