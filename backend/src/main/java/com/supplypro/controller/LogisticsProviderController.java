package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.dto.LogisticsProviderDTO;
import com.supplypro.dto.LogisticsProviderSearchCriteria;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.LogisticsProviderAccount;
import com.supplypro.service.LogisticsProviderAccountService;
import com.supplypro.service.LogisticsProviderService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/logistics")
@CrossOrigin(origins = "*")
public class LogisticsProviderController {

    @Autowired
    private LogisticsProviderService logisticsProviderService;

    @Autowired
    private LogisticsProviderAccountService logisticsProviderAccountService;

    @GetMapping
    public ApiResponse<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            LogisticsProviderSearchCriteria criteria) {
        
        Page<LogisticsProvider> pageResult = logisticsProviderService.findAll(page, size, criteria);
        
        List<LogisticsProviderDTO> dtos = pageResult.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("records", dtos);
        data.put("total", pageResult.getTotalElements());
        
        return ApiResponse.success(data);
    }

    @GetMapping("/{id}")
    public ApiResponse<LogisticsProviderDTO> getById(@PathVariable Long id) {
        LogisticsProvider provider = logisticsProviderService.getById(id);
        return ApiResponse.success(convertToDTO(provider));
    }

    @PostMapping
    public ApiResponse<LogisticsProviderDTO> create(@RequestBody LogisticsProviderDTO dto) {
        LogisticsProvider provider = new LogisticsProvider();
        BeanUtils.copyProperties(dto, provider);
        
        LogisticsProvider saved = logisticsProviderService.create(provider, dto.getPurchaserId(), dto.getNewFiles());
        return ApiResponse.success("Created successfully", convertToDTO(saved));
    }

    @PutMapping("/{id}")
    public ApiResponse<LogisticsProviderDTO> update(@PathVariable Long id, @RequestBody LogisticsProviderDTO dto) {
        LogisticsProvider provider = new LogisticsProvider();
        BeanUtils.copyProperties(dto, provider);
        
        LogisticsProvider saved = logisticsProviderService.update(id, provider, dto.getPurchaserId());
        return ApiResponse.success("Updated successfully", convertToDTO(saved));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        logisticsProviderService.delete(id);
        return ApiResponse.success("Deleted successfully", null);
    }

    @GetMapping("/{id}/accounts")
    public ApiResponse<List<LogisticsProviderAccount>> getAccounts(@PathVariable Long id) {
        return ApiResponse.success(logisticsProviderAccountService.findByProviderId(id));
    }

    @PostMapping("/{id}/accounts")
    public ApiResponse<LogisticsProviderAccount> addAccount(@PathVariable Long id, @RequestBody LogisticsProviderAccount account) {
        return ApiResponse.success(logisticsProviderAccountService.addAccount(id, account));
    }

    @DeleteMapping("/{id}/accounts/{accountId}")
    public ApiResponse<Void> deleteAccount(@PathVariable Long id, @PathVariable Long accountId) {
        logisticsProviderAccountService.deleteAccount(accountId);
        return ApiResponse.success("Deleted successfully", null);
    }

    private LogisticsProviderDTO convertToDTO(LogisticsProvider entity) {
        LogisticsProviderDTO dto = new LogisticsProviderDTO();
        BeanUtils.copyProperties(entity, dto);
        if (entity.getPurchaser() != null) {
            dto.setPurchaserId(entity.getPurchaser().getId());
            dto.setPurchaserName(entity.getPurchaser().getUsername());
        }
        return dto;
    }
}
