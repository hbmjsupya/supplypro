package com.supplypro.service;

import com.supplypro.entity.LogisticsProviderAccount;
import java.util.List;

public interface LogisticsProviderAccountService {
    List<LogisticsProviderAccount> findByProviderId(Long providerId);
    LogisticsProviderAccount addAccount(Long providerId, LogisticsProviderAccount account);
    void deleteAccount(Long accountId);
}
