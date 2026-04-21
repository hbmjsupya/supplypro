package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.dto.BankDto;
import com.supplypro.service.BankService;
import com.supplypro.service.BankSyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/banks")
@CrossOrigin(origins = "*")
public class BankController {

    @Autowired
    private BankService bankService;

    @Autowired
    private BankSyncService bankSyncService;

    @GetMapping
    public ApiResponse<Page<BankDto>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean status) {
        Page<BankDto> result = bankService.findAll(page, size, keyword, status);
        return ApiResponse.success(result);
    }

    @GetMapping("/{id}")
    public ApiResponse<BankDto> getById(@PathVariable Long id) {
        return ApiResponse.success(bankService.getById(id));
    }

    @PostMapping
    public ApiResponse<BankDto> create(@Valid @RequestBody BankDto dto) {
        return ApiResponse.success(bankService.create(dto));
    }

    @PutMapping("/{id}")
    public ApiResponse<BankDto> update(@PathVariable Long id, @Valid @RequestBody BankDto dto) {
        return ApiResponse.success(bankService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        bankService.delete(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/sync")
    public ApiResponse<Void> syncBanks() {
        bankSyncService.syncBanks();
        return ApiResponse.success(null);
    }
}
