package com.supplypro.repository;

import com.supplypro.entity.LogisticsProviderAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogisticsProviderAccountRepository extends JpaRepository<LogisticsProviderAccount, Long> {
    List<LogisticsProviderAccount> findByLogisticsProviderId(Long logisticsProviderId);
    List<LogisticsProviderAccount> findByLogisticsProvider(com.supplypro.entity.LogisticsProvider logisticsProvider);
}
