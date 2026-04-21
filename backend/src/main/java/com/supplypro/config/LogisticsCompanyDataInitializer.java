package com.supplypro.config;

import com.supplypro.entity.LogisticsCompany;
import com.supplypro.repository.LogisticsCompanyRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(100)
public class LogisticsCompanyDataInitializer implements CommandLineRunner {

    @Autowired
    private LogisticsCompanyRepository logisticsCompanyRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Checking logistics companies data...");
        
        if (logisticsCompanyRepository.count() > 40) {
            log.info("Logistics companies already initialized. Skipping...");
            return;
        }

        log.info("Initializing missing logistics companies...");
        List<LogisticsCompany> companies = new ArrayList<>();

        addIfNotExists(companies, createCompany("JD", "京东快递", "JD", "京东", "950616", true, 1));
        addIfNotExists(companies, createCompany("SF", "顺丰速运", "SF", "顺丰", "95338", true, 2));
        addIfNotExists(companies, createCompany("ZTO", "中通快递", "ZTO", "中通", "95311", true, 3));
        addIfNotExists(companies, createCompany("YTO", "圆通速递", "YTO", "圆通", "95554", true, 4));
        addIfNotExists(companies, createCompany("YD", "韵达快递", "YD", "韵达", "95546", true, 5));
        addIfNotExists(companies, createCompany("STO", "申通快递", "STO", "申通", "95543", true, 6));
        addIfNotExists(companies, createCompany("EMS", "邮政EMS", "EMS", "EMS", "11183", true, 7));
        addIfNotExists(companies, createCompany("YZPY", "邮政快递包裹", "YZPY", "邮政", "11183", true, 8));
        addIfNotExists(companies, createCompany("DBL", "德邦快递", "DBL", "德邦", "95353", true, 9));
        addIfNotExists(companies, createCompany("HTKY", "百世快递", "HTKY", "百世", "95320", true, 10));
        addIfNotExists(companies, createCompany("JTEXPRESS", "极兔速递", "JTEXPRESS", "极兔", "95820", true, 11));

        if (!companies.isEmpty()) {
            logisticsCompanyRepository.saveAll(companies);
            log.info("Added {} new logistics companies", companies.size());
        } else {
            log.info("All logistics companies already exist");
        }
    }

    private void addIfNotExists(List<LogisticsCompany> companies, LogisticsCompany company) {
        if (logisticsCompanyRepository.findById(company.getCode()).isEmpty()) {
            companies.add(company);
        }
    }

    private LogisticsCompany createCompany(String code, String name, String kdnCode, 
            String shortName, String customerService, boolean isDomestic, int sortOrder) {
        LogisticsCompany company = new LogisticsCompany();
        company.setCode(code);
        company.setName(name);
        company.setKdnCode(kdnCode);
        company.setShortName(shortName);
        company.setCustomerService(customerService);
        company.setIsDomestic(isDomestic);
        company.setIsActive(true);
        company.setSortOrder(sortOrder);
        return company;
    }
}
