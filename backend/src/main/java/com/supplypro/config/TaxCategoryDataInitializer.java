package com.supplypro.config;

import com.supplypro.entity.TaxCategory;
import com.supplypro.repository.TaxCategoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(3)
public class TaxCategoryDataInitializer implements CommandLineRunner {

    @Autowired
    private TaxCategoryRepository taxCategoryRepository;

    @Override
    public void run(String... args) throws Exception {
        if (taxCategoryRepository.count() > 0) {
            log.info("Tax categories already exist, skipping initialization");
            return;
        }

        log.info("Starting Tax Category Data Initialization...");
        List<TaxCategory> categories = new ArrayList<>();

        categories.add(createCategory("TAX001", "101", "一般货物销售", new BigDecimal("0.13"), 
            "销售货物（除适用9%、零税率的货物外），适用13%基本税率"));

        categories.add(createCategory("TAX002", "102", "加工修理修配服务", new BigDecimal("0.13"), 
            "提供加工、修理修配劳务，适用13%基本税率"));

        categories.add(createCategory("TAX003", "103", "有形动产租赁服务", new BigDecimal("0.13"), 
            "有形动产租赁服务，适用13%基本税率"));

        categories.add(createCategory("TAX004", "201", "农产品", new BigDecimal("0.09"), 
            "农产品、食用植物油、自来水、暖气、冷气、热水、煤气、石油液化气、天然气、图书、报纸、杂志、饲料、化肥、农药、农机、农膜等"));

        categories.add(createCategory("TAX005", "202", "交通运输服务", new BigDecimal("0.09"), 
            "陆路运输服务、水路运输服务、航空运输服务、管道运输服务、无运输工具承运业务"));

        categories.add(createCategory("TAX006", "203", "邮政服务", new BigDecimal("0.09"), 
            "邮政普遍服务、邮政特殊服务、其他邮政服务"));

        categories.add(createCategory("TAX007", "204", "基础电信服务", new BigDecimal("0.09"), 
            "基础电信服务，包括语音通话、出租或出售网络元素等"));

        categories.add(createCategory("TAX008", "205", "不动产销售", new BigDecimal("0.09"), 
            "销售建筑物、构筑物等不动产"));

        categories.add(createCategory("TAX009", "206", "土地使用权", new BigDecimal("0.09"), 
            "转让土地使用权"));

        categories.add(createCategory("TAX010", "207", "不动产租赁", new BigDecimal("0.09"), 
            "不动产经营租赁服务"));

        categories.add(createCategory("TAX011", "301", "增值电信服务", new BigDecimal("0.06"), 
            "增值电信服务，包括短信、彩信、互联网接入、数据处理等"));

        categories.add(createCategory("TAX012", "302", "金融服务", new BigDecimal("0.06"), 
            "贷款服务、直接收费金融服务、保险服务、金融商品转让"));

        categories.add(createCategory("TAX013", "303", "现代服务-研发和技术", new BigDecimal("0.06"), 
            "研发服务、合同能源管理服务、工程勘察勘探服务、技术转让服务"));

        categories.add(createCategory("TAX014", "304", "现代服务-信息技术", new BigDecimal("0.06"), 
            "软件服务、电路设计及测试服务、信息系统服务、业务流程管理服务"));

        categories.add(createCategory("TAX015", "305", "现代服务-文化创意", new BigDecimal("0.06"), 
            "设计服务、知识产权服务、广告服务、会议展览服务"));

        categories.add(createCategory("TAX016", "306", "现代服务-物流辅助", new BigDecimal("0.06"), 
            "航空服务、港口码头服务、货运客运场站服务、打捞救助服务、装卸搬运服务、仓储服务、收派服务"));

        categories.add(createCategory("TAX017", "307", "现代服务-鉴证咨询", new BigDecimal("0.06"), 
            "认证服务、鉴证服务、咨询服务、翻译服务"));

        categories.add(createCategory("TAX018", "308", "现代服务-广播影视", new BigDecimal("0.06"), 
            "广播影视节目制作、发行、播映服务"));

        categories.add(createCategory("TAX019", "309", "现代服务-商务辅助", new BigDecimal("0.06"), 
            "企业管理服务、经纪代理服务、人力资源服务、安全保护服务"));

        categories.add(createCategory("TAX020", "310", "现代服务-其他", new BigDecimal("0.06"), 
            "其他现代服务"));

        categories.add(createCategory("TAX021", "311", "生活服务-文化体育", new BigDecimal("0.06"), 
            "文化服务、体育服务"));

        categories.add(createCategory("TAX022", "312", "生活服务-教育医疗", new BigDecimal("0.06"), 
            "教育服务、医疗服务"));

        categories.add(createCategory("TAX023", "313", "生活服务-旅游娱乐", new BigDecimal("0.06"), 
            "旅游服务、娱乐服务"));

        categories.add(createCategory("TAX024", "314", "生活服务-餐饮住宿", new BigDecimal("0.06"), 
            "餐饮服务、住宿服务"));

        categories.add(createCategory("TAX025", "315", "生活服务-居民日常", new BigDecimal("0.06"), 
            "市内公共交通、居民日常服务"));

        categories.add(createCategory("TAX026", "316", "生活服务-其他", new BigDecimal("0.06"), 
            "其他生活服务"));

        categories.add(createCategory("TAX027", "401", "出口货物", new BigDecimal("0.00"), 
            "出口货物，适用零税率"));

        categories.add(createCategory("TAX028", "402", "跨境应税行为", new BigDecimal("0.00"), 
            "国际运输服务、航天运输服务、向境外单位提供的完全在境外消费的服务"));

        categories.add(createCategory("TAX029", "501", "小规模纳税人-货物销售", new BigDecimal("0.03"), 
            "小规模纳税人销售货物，适用3%征收率（目前减按1%执行）"));

        categories.add(createCategory("TAX030", "502", "小规模纳税人-服务", new BigDecimal("0.03"), 
            "小规模纳税人提供应税服务，适用3%征收率（目前减按1%执行）"));

        categories.add(createCategory("TAX031", "503", "小规模纳税人-不动产销售", new BigDecimal("0.05"), 
            "小规模纳税人销售其取得的不动产，适用5%征收率"));

        categories.add(createCategory("TAX032", "504", "小规模纳税人-不动产租赁", new BigDecimal("0.05"), 
            "小规模纳税人出租其取得的不动产，适用5%征收率"));

        categories.add(createCategory("TAX033", "601", "免税-农产品", BigDecimal.ZERO, 
            "农业生产者销售的自产农产品，免征增值税"));

        categories.add(createCategory("TAX034", "602", "免税-避孕药品用具", BigDecimal.ZERO, 
            "避孕药品和用具，免征增值税"));

        categories.add(createCategory("TAX035", "603", "免税-古旧图书", BigDecimal.ZERO, 
            "古旧图书，免征增值税"));

        categories.add(createCategory("TAX036", "604", "免税-科研教学设备", BigDecimal.ZERO, 
            "直接用于科学研究、科学试验和教学的进口仪器、设备，免征增值税"));

        categories.add(createCategory("TAX037", "605", "免税-外国政府援助物资", BigDecimal.ZERO, 
            "外国政府、国际组织无偿援助的进口物资和设备，免征增值税"));

        categories.add(createCategory("TAX038", "606", "免税-残疾人专用物品", BigDecimal.ZERO, 
            "由残疾人的组织直接进口供残疾人专用的物品，免征增值税"));

        categories.add(createCategory("TAX039", "607", "免税-个人销售自用物品", BigDecimal.ZERO, 
            "个人销售自己使用过的物品，免征增值税"));

        categories.add(createCategory("TAX040", "701", "简易计税-建筑服务", new BigDecimal("0.03"), 
            "建筑工程老项目、清包工项目，可选择简易计税，适用3%征收率"));

        categories.add(createCategory("TAX041", "702", "简易计税-劳务派遣", new BigDecimal("0.05"), 
            "劳务派遣服务选择差额纳税，适用5%征收率"));

        categories.add(createCategory("TAX042", "703", "简易计税-人力资源外包", new BigDecimal("0.05"), 
            "人力资源外包服务选择简易计税，适用5%征收率"));

        categories.add(createCategory("TAX043", "801", "农产品扣除率-9%", new BigDecimal("0.09"), 
            "购进农产品，除取得增值税专用发票外，按9%扣除率计算进项税额"));

        categories.add(createCategory("TAX044", "802", "农产品扣除率-10%", new BigDecimal("0.10"), 
            "购进农产品用于生产或委托加工13%税率货物，按10%扣除率计算进项税额"));

        taxCategoryRepository.saveAll(categories);
        log.info("Tax Category Data Initialization Completed. Total categories: {}", categories.size());
    }

    private TaxCategory createCategory(String taxCategoryId, String categoryCode, String categoryName, 
                                        BigDecimal taxRate, String description) {
        TaxCategory category = new TaxCategory();
        category.setTaxCategoryId(taxCategoryId);
        category.setCategoryCode(categoryCode);
        category.setCategoryName(categoryName);
        category.setTaxRate(taxRate);
        category.setStatus(TaxCategory.Status.ENABLED);
        category.setEffectiveDate(LocalDateTime.of(2024, 1, 1, 0, 0));
        return category;
    }
}
