package com.supplypro.config;

import com.supplypro.entity.Bank;
import com.supplypro.repository.BankRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class BankDataInitializer implements CommandLineRunner {

    @Autowired
    private BankRepository bankRepository;

    @Override
    public void run(String... args) throws Exception {
        // Seed some major banks if the table is empty
        if (bankRepository.count() == 0) {
            System.out.println("Seeding Bank data for local development...");

            createBank("102100099996", "中国工商银行", "工商银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("103100000026", "中国农业银行", "农业银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("104100000004", "中国银行", "中国银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("105100000017", "中国建设银行", "建设银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("301290000007", "交通银行", "交通银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("308584000013", "招商银行", "招商银行", Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE);
            
            System.out.println("Bank data seeded successfully.");
        }
    }

    private void createBank(String code, String name, String shortName, Bank.BankType type, Bank.BankLevel level) {
        Bank bank = new Bank();
        bank.setBankCode(code);
        bank.setName(name);
        bank.setShortName(shortName);
        bank.setType(type);
        bank.setLevel(level);
        bank.setStatus(true);
        bankRepository.save(bank);
    }
}
