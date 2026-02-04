package com.supplypro.service;

import com.supplypro.entity.Bank;
import com.supplypro.repository.BankRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class BankSyncService {

    @Autowired
    private BankRepository bankRepository;

    /**
     * Scheduled task to sync bank data from external sources.
     * Runs daily at 2:00 AM.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void syncBanks() {
        log.info("Starting scheduled bank data synchronization...");
        try {
            // Simulate fetching data from an external API (e.g., PBC or UnionPay)
            // In a real implementation, this would call an external HTTP API
            
            // Mock update: Ensure specific banks exist or update them
            updateOrAddBank("102100099996", "中国工商银行", "工商银行");
            
            log.info("Bank data synchronization completed successfully.");
        } catch (Exception e) {
            log.error("Error during bank data synchronization", e);
        }
    }

    private void updateOrAddBank(String code, String name, String shortName) {
        bankRepository.findByBankCode(code).ifPresentOrElse(
            bank -> {
                boolean changed = false;
                if (!bank.getName().equals(name)) {
                    bank.setName(name);
                    changed = true;
                }
                if (!bank.getShortName().equals(shortName)) {
                    bank.setShortName(shortName);
                    changed = true;
                }
                if (changed) {
                    bankRepository.save(bank);
                    log.info("Updated bank: {} ({})", name, code);
                }
            },
            () -> {
                Bank newBank = new Bank();
                newBank.setBankCode(code);
                newBank.setName(name);
                newBank.setShortName(shortName);
                newBank.setStatus(true);
                newBank.setType(Bank.BankType.STATE_OWNED); // Default fallback
                newBank.setLevel(Bank.BankLevel.HEAD_OFFICE); // Default fallback
                bankRepository.save(newBank);
                log.info("Added new bank: {} ({})", name, code);
            }
        );
    }
}
