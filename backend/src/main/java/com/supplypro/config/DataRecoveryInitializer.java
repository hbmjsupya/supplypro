package com.supplypro.config;

import com.supplypro.entity.*;
import com.supplypro.repository.*;
import com.supplypro.service.ProductCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * Emergency Data Recovery Initializer
 * Restores core data (Brands, Suppliers, Products, etc.) if missing.
 */
//@Component
public class DataRecoveryInitializer implements CommandLineRunner {

    @Autowired
    private BrandRepository brandRepository;
    @Autowired
    private BankRepository bankRepository;
    @Autowired
    private SupplierRepository supplierRepository;
    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private ProductCategoryRepository productCategoryRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TaxCategoryRepository taxCategoryRepository;
    @Autowired
    private ProductCategoryService productCategoryService;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        System.out.println(">>> Starting Data Recovery Check...");
        
        // Recover Banks
        if (bankRepository.count() == 0) {
            System.out.println("Recovering Bank Data...");
            createBank("102100099996", "中国工商银行", "工商银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("103100000026", "中国农业银行", "农业银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("104100000004", "中国银行", "中国银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("105100000017", "中国建设银行", "建设银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("301290000007", "交通银行", "交通银行", Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE);
            createBank("308584000013", "招商银行", "招商银行", Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE);
        }

        // Recover Categories
        productCategoryService.syncCategories();

        // Recover Tax Categories
        if (taxCategoryRepository.count() == 0) {
            System.out.println("Recovering Tax Data...");
            createTaxCategory("TC001", "T001", "General Goods", new BigDecimal("0.13"));
        }
        
        // Find a category for products
        ProductCategory electronics = productCategoryRepository.findByNameContaining("数码产品").stream().findFirst().orElse(null);
        String categoryCode = electronics != null ? electronics.getCategoryId() : "0";
        String categoryName = electronics != null ? electronics.getName() : "General";

        // Get Admin User for Purchaser
        User admin = userRepository.findByUsername("admin").orElse(null);

        // Recover Suppliers
        Supplier s1 = supplierRepository.findBySupplierNo("SUP001");
        if (s1 == null && admin != null) {
            System.out.println("Recovering Supplier SUP001...");
            s1 = createSupplier("SUP001", "Official Supplier", "John Doe", "13800138000", admin);
        }
        
        Supplier s2 = supplierRepository.findBySupplierNo("SUP002");
        if (s2 == null && admin != null) {
            System.out.println("Recovering Supplier SUP002...");
            s2 = createSupplier("SUP002", "Tech Distributor", "Jane Smith", "13900139000", admin);
        }

        // Recover Brands
        Brand b1 = brandRepository.findByName("Apple");
        if (b1 == null) {
            System.out.println("Recovering Brand Apple...");
            b1 = createBrand("Apple", "TM-APPLE", "A", "apple_icon.png");
            if (s1 != null && s2 != null) b1.setSuppliers(new java.util.HashSet<>(Set.of(s1, s2)));
            else if (s1 != null) b1.setSuppliers(new java.util.HashSet<>(Set.of(s1)));
            brandRepository.save(b1);
        }

        Brand b2 = brandRepository.findByName("Xiaomi");
        if (b2 == null) {
            System.out.println("Recovering Brand Xiaomi...");
            b2 = createBrand("Xiaomi", "TM-MI", "X", "mi_icon.png");
            if (s2 != null) {
                b2.setSuppliers(new java.util.HashSet<>(Set.of(s2)));
                brandRepository.save(b2);
            }
        }

        Brand b3 = brandRepository.findByName("Deli");
        if (b3 == null) {
            System.out.println("Recovering Brand Deli...");
            b3 = createBrand("Deli", "TM-DELI", "D", "deli_icon.png");
            if (s1 != null) {
                b3.setSuppliers(new java.util.HashSet<>(Set.of(s1)));
                brandRepository.save(b3);
            }
        }

        // Recover Products
        if (productRepository.count() == 0) {
            System.out.println("Recovering Product Data...");
            if (b1 != null && s1 != null) {
                createProduct("P001", "MacBook Pro 14", b1, s1, categoryCode, categoryName);
                createProduct("P002", "iPhone 15", b1, s1, categoryCode, categoryName);
            }
            if (b2 != null && s2 != null) {
                createProduct("P003", "Xiaomi 14", b2, s2, categoryCode, categoryName);
            }
            if (b3 != null && s1 != null) {
                createProduct("P004", "Deli Stapler", b3, s1, categoryCode, categoryName);
                createProduct("P005", "Deli Pen", b3, s1, categoryCode, categoryName);
            }
        }

        // Recover Logistics
        if (logisticsProviderRepository.count() == 0) {
            System.out.println("Recovering Logistics Data...");
            createLogistics("SF Express", "SF-001", "13800000000", admin);
            createLogistics("JD Logistics", "JD-001", "13900000000", admin);
        }

        System.out.println("<<< Data Recovery Check Completed.");
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

    private Supplier createSupplier(String no, String name, String contact, String phone, User purchaser) {
        Supplier s = new Supplier();
        s.setSupplierNo(no);
        s.setName(name);
        s.setContactPerson(contact);
        s.setContactPhone(phone);
        s.setPurchaser(purchaser);
        s.setStatus(Supplier.Status.ACTIVE);
        s.setSettlementType(Supplier.SettlementType.PERIOD);
        s.setSettlementPeriod(30);
        s.setProvinceCode("110000");
        s.setCityCode("110100");
        s.setDistrictCode("110101");
        s.setAddress("Test Address");
        return supplierRepository.save(s);
    }

    private Brand createBrand(String name, String tm, String first, String icon) {
        Brand b = new Brand();
        b.setName(name);
        b.setTrademarkNo(tm);
        b.setFirstLetter(first);
        b.setIcon(icon);
        b.setStatus(Brand.Status.ENABLED);
        return brandRepository.save(b);
    }

    private void createProduct(String sku, String name, Brand brand, Supplier supplier, String categoryCode, String categoryName) {
        Product p = new Product();
        p.setSkuCode(sku);
        p.setName(name);
        p.setBrandId(brand.getId());
        p.setBrandZhName(brand.getName());
        p.setDefaultSupplierId(supplier.getId());
        p.setDefaultSupplierName(supplier.getName());
        p.setCategoryCode(categoryCode);
        p.setCategoryName(categoryName);
        p.setTaxRate(new BigDecimal("0.13"));
        p.setTaxCode("T001");
        p.setTaxClass("General Goods");
        productRepository.save(p);
    }

    private void createLogistics(String name, String contact, String phone, User purchaser) {
        LogisticsProvider lp = new LogisticsProvider();
        lp.setName(name);
        lp.setContactPerson(contact);
        lp.setContactPhone(phone);
        lp.setStatus("ENABLED");
        lp.setPurchaser(purchaser);
        lp.setSettlementType(LogisticsProvider.SettlementType.PERIOD);
        lp.setSettlementPeriod(30);
        logisticsProviderRepository.save(lp);
    }

    private void createTaxCategory(String id, String code, String name, BigDecimal rate) {
        TaxCategory tc = new TaxCategory();
        tc.setTaxCategoryId(id);
        tc.setCategoryCode(code);
        tc.setCategoryName(name);
        tc.setTaxRate(rate);
        tc.setStatus(TaxCategory.Status.ENABLED);
        tc.setEffectiveDate(LocalDateTime.now());
        taxCategoryRepository.save(tc);
    }
}
