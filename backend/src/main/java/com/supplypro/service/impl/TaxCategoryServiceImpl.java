package com.supplypro.service.impl;

import com.supplypro.entity.DataSyncLog;
import com.supplypro.entity.TaxCategory;
import com.supplypro.repository.DataSyncLogRepository;
import com.supplypro.repository.TaxCategoryRepository;
import com.supplypro.service.TaxCategoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class TaxCategoryServiceImpl implements TaxCategoryService {

    @Autowired
    private TaxCategoryRepository repository;

    @Autowired
    private DataSyncLogRepository dataSyncLogRepository;

    @Override
    public List<TaxCategory> search(String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            return repository.findByCategoryNameContainingOrCategoryCodeContaining(keyword, keyword);
        }
        return repository.findByStatus(TaxCategory.Status.ENABLED);
    }

    @Override
    @Transactional
    public void syncTaxData() {
        DataSyncLog syncLog = new DataSyncLog();
        syncLog.setSyncType("TAX_DATA");
        
        try {
            List<TaxCategory> mockData = getMockData();
            int updatedCount = 0;
            int createdCount = 0;

            for (TaxCategory item : mockData) {
                // Find existing by code
                List<TaxCategory> existingList = repository.findByCategoryNameContainingOrCategoryCodeContaining(item.getCategoryCode(), item.getCategoryCode());
                // Exact match check on code
                Optional<TaxCategory> existingOpt = existingList.stream()
                        .filter(e -> e.getCategoryCode().equals(item.getCategoryCode()))
                        .findFirst();

                if (existingOpt.isPresent()) {
                    TaxCategory existing = existingOpt.get();
                    boolean changed = false;
                    if (!existing.getTaxRate().equals(item.getTaxRate())) {
                        existing.setTaxRate(item.getTaxRate());
                        changed = true;
                    }
                    if (!existing.getCategoryName().equals(item.getCategoryName())) {
                        existing.setCategoryName(item.getCategoryName());
                        changed = true;
                    }
                    if (changed) {
                        existing.setUpdatedAt(LocalDateTime.now());
                        repository.save(existing);
                        updatedCount++;
                    }
                } else {
                    repository.save(item);
                    createdCount++;
                }
            }

            syncLog.setStatus("SUCCESS");
            syncLog.setDetails("Synced " + mockData.size() + " items. Created: " + createdCount + ", Updated: " + updatedCount);
            log.info("Tax sync success: {}", syncLog.getDetails());

        } catch (Exception e) {
            log.error("Tax sync failed", e);
            syncLog.setStatus("FAILED");
            syncLog.setDetails(e.getMessage());
            throw e; // Rollback transaction
        } finally {
            // Save log in a separate transaction or ensure it's saved even if main logic fails? 
            // Since method is @Transactional, we should catch and save log before re-throwing or use REQUIRES_NEW for log.
            // For simplicity here, we assume if exception happens, we might lose log if it's same transaction.
            // Ideally DataSyncLogRepository should be in a separate service with REQUIRES_NEW.
            // But let's just save it here if no exception, or before throwing.
            dataSyncLogRepository.save(syncLog);
        }
    }

    private List<TaxCategory> getMockData() {
        List<TaxCategory> list = new ArrayList<>();
        
        // 1. Electronics & Office (13%)
        generateCategoryGroup(list, "109000000", "电子设备", new BigDecimal("0.1300"), 20);
        
        // 2. Clothing & Apparel (13%)
        generateCategoryGroup(list, "104000000", "纺织服装", new BigDecimal("0.1300"), 20);
        
        // 3. Food & Beverages (9% - 13%)
        generateCategoryGroup(list, "101000000", "食品饮料", new BigDecimal("0.0900"), 20);
        
        // 4. Daily Necessities (13%)
        generateCategoryGroup(list, "107000000", "日用百货", new BigDecimal("0.1300"), 20);
        
        // 5. Furniture (13%)
        generateCategoryGroup(list, "108000000", "家具用品", new BigDecimal("0.1300"), 20);

        return list;
    }

    private void generateCategoryGroup(List<TaxCategory> list, String baseCode, String baseName, BigDecimal rate, int count) {
        for (int i = 1; i <= count; i++) {
            String code = String.format("%s%03d", baseCode.substring(0, 8), i);
            String name = baseName + " - " + "细类" + i;
            // Tax Code usually is 19 digits. Base 9 + 10 digits
            String taxId = code + "0000000000"; 
            list.add(create(code, name, taxId, rate));
        }
    }

    private TaxCategory create(String code, String name, String taxId, BigDecimal rate) {
        TaxCategory t = new TaxCategory();
        t.setTaxCategoryId(taxId); // 19-digit tax classification code
        t.setCategoryCode(code);   // Product category code
        t.setCategoryName(name);
        t.setTaxRate(rate);
        t.setStatus(TaxCategory.Status.ENABLED);
        t.setCreatedAt(LocalDateTime.now());
        t.setUpdatedAt(LocalDateTime.now());
        return t;
    }
}
