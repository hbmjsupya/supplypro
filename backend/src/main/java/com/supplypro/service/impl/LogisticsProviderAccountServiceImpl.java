package com.supplypro.service.impl;

import com.supplypro.entity.LogisticsProviderAccount;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.LogisticsProviderAccountRepository;
import com.supplypro.service.LogisticsProviderAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LogisticsProviderAccountServiceImpl implements LogisticsProviderAccountService {

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private LogisticsProviderAccountRepository logisticsProviderAccountRepository;

    @Override
    public List<LogisticsProviderAccount> findByProviderId(Long providerId) {
        return logisticsProviderAccountRepository.findByLogisticsProviderId(providerId);
    }

    @Override
    @Transactional
    public LogisticsProviderAccount addAccount(Long providerId, LogisticsProviderAccount account) {
        return logisticsProviderRepository.findById(providerId).map(provider -> {
            account.setLogisticsProvider(provider);
            
            if (account.isDefault()) {
                List<LogisticsProviderAccount> accounts = logisticsProviderAccountRepository.findByLogisticsProviderId(providerId);
                for (LogisticsProviderAccount acc : accounts) {
                    // Check if acc is not the one we are currently saving (though ID might be null for new)
                    // If ID is null, it's new, so we definitely unset others.
                    // If ID is not null, we check inequality.
                    if (acc.isDefault() && (account.getId() == null || !acc.getId().equals(account.getId()))) {
                        acc.setDefault(false);
                        logisticsProviderAccountRepository.save(acc);
                    }
                }
            }
            
            return logisticsProviderAccountRepository.save(account);
        }).orElseThrow(() -> new RuntimeException("Logistics Provider not found"));
    }

    @Override
    @Transactional
    public void deleteAccount(Long accountId) {
        logisticsProviderAccountRepository.deleteById(accountId);
    }
}
