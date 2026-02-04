package com.supplypro.service;

import com.supplypro.dto.LogisticsProviderSearchCriteria;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.dto.LogisticsProviderFileDTO;
import org.springframework.data.domain.Page;

import java.util.List;

public interface LogisticsProviderService {
    Page<LogisticsProvider> findAll(int page, int size, LogisticsProviderSearchCriteria criteria);
    LogisticsProvider getById(Long id);
    LogisticsProvider create(LogisticsProvider provider, Long purchaserId, List<LogisticsProviderFileDTO> newFiles);
    LogisticsProvider update(Long id, LogisticsProvider provider, Long purchaserId);
    void delete(Long id);
}
