package com.supplypro.service;

import com.supplypro.entity.LogisticsCompany;
import com.supplypro.repository.LogisticsCompanyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

//@Service
public class LogisticsCompanyInitService implements CommandLineRunner {

    @Autowired
    private LogisticsCompanyRepository repository;

    @Override
    @Transactional
    public void run(String... args) {
        initLogisticsCompanies();
    }

    private void initLogisticsCompanies() {
        List<LogisticsCompany> companies = Arrays.asList(
            createCompany("JTEXPRESS", "极兔速递", "JTSD", "极兔", "400-820-1666", true, 10),
            createCompany("HTKY", "百世快递", "HTKY", "百世", "95320", true, 11),
            createCompany("ANE", "安能物流", "ANE", "安能", "400-102-9656", true, 12),
            createCompany("KYWL", "跨越物流", "KYWL", "跨越", "400-809-8686", true, 13),
            createCompany("GTO", "国通快递", "GTO", "国通", "400-111-0088", true, 14),
            createCompany("RFD", "如风达", "RFD", "如风达", "400-010-6660", true, 15),
            createCompany("SURE", "速尔快递", "SURE", "速尔", "400-158-8888", true, 16),
            createCompany("NEDA", "能达速递", "NEDA", "能达", "400-888-8888", true, 17),
            createCompany("HOAU", "天地华宇", "HOAU", "华宇", "400-808-6666", true, 18),
            createCompany("CRE", "中铁快运", "CRE", "中铁", "95572", true, 19),
            createCompany("CNEX", "佳吉快运", "CNEX", "佳吉", "400-820-5566", true, 20),
            createCompany("XBWL", "新邦物流", "XBWL", "新邦", "400-800-1111", true, 21),
            createCompany("FEIKY", "飞康达", "FEIKY", "飞康达", "400-880-8800", true, 22),
            createCompany("KKE", "快快快递", "KKE", "快快", "400-666-8888", true, 23),
            createCompany("BJWL", "京广速递", "BJWL", "京广", "400-800-0000", true, 24),
            createCompany("DADOU", "大豆快递", "DADOU", "大豆", "400-777-0000", true, 25),
            createCompany("WTD", "微特派", "WTD", "微特派", "400-666-0000", true, 26),
            createCompany("PDD", "拼多多物流", "PDD", "拼多多", "400-8822-528", true, 27),
            createCompany("MTWL", "美团配送", "MTWL", "美团", "10109777", true, 28),
            createCompany("ELEME", "饿了么配送", "ELEME", "饿了么", "10105757", true, 29),
            createCompany("SFWL", "顺丰同城", "SFWL", "顺丰同城", "95338", true, 30),
            createCompany("ARAMEX", "Aramex快递", "ARAMEX", "Aramex", "400-880-8899", false, 51),
            createCompany("DPD", "DPD快递", "DPD", "DPD", "400-888-8888", false, 52),
            createCompany("GLS", "GLS快递", "GLS", "GLS", "400-666-6666", false, 53),
            createCompany("TOLL", "TOLL快递", "TOLL", "TOLL", "400-999-9999", false, 54),
            createCompany("OCS", "OCS快递", "OCS", "OCS", "400-777-7777", false, 55),
            createCompany("SAGAWA", "佐川急便", "SAGAWA", "佐川", "400-555-5555", false, 56),
            createCompany("YAMATO", "大和运输", "YAMATO", "大和", "400-444-4444", false, 57),
            createCompany("ZTWL", "中通国际", "ZTWL", "中通国际", "95311", false, 58),
            createCompany("YTOINTL", "圆通国际", "YTOINTL", "圆通国际", "95554", false, 59),
            createCompany("SFINTL", "顺丰国际", "SFINTL", "顺丰国际", "95338", false, 60),
            createCompany("EMSINTL", "EMS国际", "EMSINTL", "EMS国际", "11183", false, 61)
        );

        for (LogisticsCompany company : companies) {
            if (!repository.existsById(company.getCode())) {
                repository.save(company);
            }
        }
    }

    private LogisticsCompany createCompany(String code, String name, String kdnCode, 
            String shortName, String customerService, Boolean isDomestic, Integer sortOrder) {
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
