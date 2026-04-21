package com.supplypro.config;

import com.supplypro.entity.ProductCategory;
import com.supplypro.repository.ProductCategoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(2)
public class ProductCategoryDataInitializer implements CommandLineRunner {

    @Autowired
    private ProductCategoryRepository categoryRepository;

    @Override
    public void run(String... args) throws Exception {
        if (categoryRepository.count() > 0) {
            log.info("Product categories already exist, skipping initialization");
            return;
        }

        log.info("Starting Product Category Data Initialization...");
        List<ProductCategory> categories = new ArrayList<>();
        int order = 1;

        order = addFoodCategories(categories, order);
        order = addClothingCategories(categories, order);
        order = addDigitalCategories(categories, order);
        order = addHomeCategories(categories, order);
        order = addBeautyCategories(categories, order);
        order = addMotherBabyCategories(categories, order);
        order = addSportsCategories(categories, order);
        order = addBooksCategories(categories, order);
        order = addOfficeCategories(categories, order);
        order = addPetCategories(categories, order);

        categoryRepository.saveAll(categories);
        log.info("Product Category Data Initialization Completed. Total categories: {}", categories.size());
    }

    private ProductCategory createCategory(String categoryId, String parentId, String name, int level, int sortOrder) {
        ProductCategory category = new ProductCategory();
        category.setCategoryId(categoryId);
        category.setParentId(parentId);
        category.setName(name);
        category.setLevel(level);
        category.setSortOrder(sortOrder);
        category.setIsEnabled(true);
        if (parentId != null) {
            category.setFullPath(parentId + "/" + categoryId);
        } else {
            category.setFullPath(categoryId);
        }
        return category;
    }

    private int addFoodCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("01", null, "食品饮料", 1, sortOrder++));
        categories.add(createCategory("0101", "01", "休闲食品", 2, sortOrder++));
        categories.add(createCategory("0102", "01", "饮料冲调", 2, sortOrder++));
        categories.add(createCategory("0103", "01", "粮油调味", 2, sortOrder++));
        categories.add(createCategory("0104", "01", "生鲜食品", 2, sortOrder++));
        categories.add(createCategory("0105", "01", "酒水茶饮", 2, sortOrder++));

        categories.add(createCategory("010101", "0101", "糖果巧克力", 3, sortOrder++));
        categories.add(createCategory("010102", "0101", "坚果炒货", 3, sortOrder++));
        categories.add(createCategory("010103", "0101", "肉干肉脯", 3, sortOrder++));
        categories.add(createCategory("010104", "0101", "饼干蛋糕", 3, sortOrder++));
        categories.add(createCategory("010105", "0101", "膨化食品", 3, sortOrder++));

        categories.add(createCategory("010201", "0102", "碳酸饮料", 3, sortOrder++));
        categories.add(createCategory("010202", "0102", "茶饮料", 3, sortOrder++));
        categories.add(createCategory("010203", "0102", "果汁饮料", 3, sortOrder++));
        categories.add(createCategory("010204", "0102", "乳品饮料", 3, sortOrder++));
        categories.add(createCategory("010205", "0102", "咖啡冲饮", 3, sortOrder++));

        categories.add(createCategory("010301", "0103", "米面杂粮", 3, sortOrder++));
        categories.add(createCategory("010302", "0103", "食用油", 3, sortOrder++));
        categories.add(createCategory("010303", "0103", "调味品", 3, sortOrder++));
        categories.add(createCategory("010304", "0103", "南北干货", 3, sortOrder++));

        categories.add(createCategory("010401", "0104", "水果蔬菜", 3, sortOrder++));
        categories.add(createCategory("010402", "0104", "肉禽蛋类", 3, sortOrder++));
        categories.add(createCategory("010403", "0104", "海鲜水产", 3, sortOrder++));
        categories.add(createCategory("010404", "0104", "冷冻食品", 3, sortOrder++));

        categories.add(createCategory("010501", "0105", "白酒", 3, sortOrder++));
        categories.add(createCategory("010502", "0105", "啤酒", 3, sortOrder++));
        categories.add(createCategory("010503", "0105", "葡萄酒", 3, sortOrder++));
        categories.add(createCategory("010504", "0105", "茶叶", 3, sortOrder++));

        categories.add(createCategory("01010101", "010101", "硬糖", 4, sortOrder++));
        categories.add(createCategory("01010102", "010101", "软糖", 4, sortOrder++));
        categories.add(createCategory("01010103", "010101", "巧克力", 4, sortOrder++));

        categories.add(createCategory("01010201", "010102", "瓜子", 4, sortOrder++));
        categories.add(createCategory("01010202", "010102", "花生", 4, sortOrder++));
        categories.add(createCategory("01010203", "010102", "开心果", 4, sortOrder++));

        return sortOrder;
    }

    private int addClothingCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("02", null, "服装鞋帽", 1, sortOrder++));
        categories.add(createCategory("0201", "02", "男装", 2, sortOrder++));
        categories.add(createCategory("0202", "02", "女装", 2, sortOrder++));
        categories.add(createCategory("0203", "02", "童装", 2, sortOrder++));
        categories.add(createCategory("0204", "02", "运动户外", 2, sortOrder++));
        categories.add(createCategory("0205", "02", "内衣配饰", 2, sortOrder++));
        categories.add(createCategory("0206", "02", "鞋靴箱包", 2, sortOrder++));

        categories.add(createCategory("020101", "0201", "T恤", 3, sortOrder++));
        categories.add(createCategory("020102", "0201", "衬衫", 3, sortOrder++));
        categories.add(createCategory("020103", "0201", "夹克", 3, sortOrder++));
        categories.add(createCategory("020104", "0201", "西装", 3, sortOrder++));
        categories.add(createCategory("020105", "0201", "牛仔裤", 3, sortOrder++));
        categories.add(createCategory("020106", "0201", "休闲裤", 3, sortOrder++));

        categories.add(createCategory("020201", "0202", "连衣裙", 3, sortOrder++));
        categories.add(createCategory("020202", "0202", "半身裙", 3, sortOrder++));
        categories.add(createCategory("020203", "0202", "T恤", 3, sortOrder++));
        categories.add(createCategory("020204", "0202", "衬衫", 3, sortOrder++));
        categories.add(createCategory("020205", "0202", "外套", 3, sortOrder++));
        categories.add(createCategory("020206", "0202", "针织衫", 3, sortOrder++));

        categories.add(createCategory("020301", "0203", "男童装", 3, sortOrder++));
        categories.add(createCategory("020302", "0203", "女童装", 3, sortOrder++));
        categories.add(createCategory("020303", "0203", "婴童装", 3, sortOrder++));

        categories.add(createCategory("020601", "0206", "运动鞋", 3, sortOrder++));
        categories.add(createCategory("020602", "0206", "休闲鞋", 3, sortOrder++));
        categories.add(createCategory("020603", "0206", "皮鞋", 3, sortOrder++));
        categories.add(createCategory("020604", "0206", "靴子", 3, sortOrder++));
        categories.add(createCategory("020605", "0206", "箱包", 3, sortOrder++));

        categories.add(createCategory("02010101", "020101", "短袖T恤", 4, sortOrder++));
        categories.add(createCategory("02010102", "020101", "长袖T恤", 4, sortOrder++));
        categories.add(createCategory("02010103", "020101", "POLO衫", 4, sortOrder++));

        categories.add(createCategory("02020101", "020201", "休闲连衣裙", 4, sortOrder++));
        categories.add(createCategory("02020102", "020201", "正式连衣裙", 4, sortOrder++));
        categories.add(createCategory("02020103", "020201", "碎花连衣裙", 4, sortOrder++));

        return sortOrder;
    }

    private int addDigitalCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("03", null, "数码家电", 1, sortOrder++));
        categories.add(createCategory("0301", "03", "手机通讯", 2, sortOrder++));
        categories.add(createCategory("0302", "03", "电脑办公", 2, sortOrder++));
        categories.add(createCategory("0303", "03", "家用电器", 2, sortOrder++));
        categories.add(createCategory("0304", "03", "数码配件", 2, sortOrder++));

        categories.add(createCategory("030101", "0301", "智能手机", 3, sortOrder++));
        categories.add(createCategory("030102", "0301", "老人机", 3, sortOrder++));
        categories.add(createCategory("030103", "0301", "对讲机", 3, sortOrder++));

        categories.add(createCategory("030201", "0302", "笔记本", 3, sortOrder++));
        categories.add(createCategory("030202", "0302", "台式机", 3, sortOrder++));
        categories.add(createCategory("030203", "0302", "平板电脑", 3, sortOrder++));
        categories.add(createCategory("030204", "0302", "显示器", 3, sortOrder++));
        categories.add(createCategory("030205", "0302", "打印机", 3, sortOrder++));

        categories.add(createCategory("030301", "0303", "大家电", 3, sortOrder++));
        categories.add(createCategory("030302", "0303", "厨房电器", 3, sortOrder++));
        categories.add(createCategory("030303", "0303", "生活电器", 3, sortOrder++));
        categories.add(createCategory("030304", "0303", "个护电器", 3, sortOrder++));

        categories.add(createCategory("030401", "0304", "手机配件", 3, sortOrder++));
        categories.add(createCategory("030402", "0304", "电脑配件", 3, sortOrder++));
        categories.add(createCategory("030403", "0304", "存储设备", 3, sortOrder++));

        categories.add(createCategory("03030101", "030301", "冰箱", 4, sortOrder++));
        categories.add(createCategory("03030102", "030301", "洗衣机", 4, sortOrder++));
        categories.add(createCategory("03030103", "030301", "空调", 4, sortOrder++));
        categories.add(createCategory("03030104", "030301", "电视", 4, sortOrder++));

        categories.add(createCategory("03030201", "030302", "电饭煲", 4, sortOrder++));
        categories.add(createCategory("03030202", "030302", "微波炉", 4, sortOrder++));
        categories.add(createCategory("03030203", "030302", "烤箱", 4, sortOrder++));
        categories.add(createCategory("03030204", "030302", "油烟机", 4, sortOrder++));

        return sortOrder;
    }

    private int addHomeCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("04", null, "家居生活", 1, sortOrder++));
        categories.add(createCategory("0401", "04", "家纺寝具", 2, sortOrder++));
        categories.add(createCategory("0402", "04", "家具", 2, sortOrder++));
        categories.add(createCategory("0403", "04", "厨具餐具", 2, sortOrder++));
        categories.add(createCategory("0404", "04", "家装建材", 2, sortOrder++));
        categories.add(createCategory("0405", "04", "收纳清洁", 2, sortOrder++));

        categories.add(createCategory("040101", "0401", "床品套件", 3, sortOrder++));
        categories.add(createCategory("040102", "0401", "被子", 3, sortOrder++));
        categories.add(createCategory("040103", "0401", "枕头", 3, sortOrder++));
        categories.add(createCategory("040104", "0401", "床垫", 3, sortOrder++));
        categories.add(createCategory("040105", "0401", "毛巾浴巾", 3, sortOrder++));

        categories.add(createCategory("040201", "0402", "沙发", 3, sortOrder++));
        categories.add(createCategory("040202", "0402", "床", 3, sortOrder++));
        categories.add(createCategory("040203", "0402", "衣柜", 3, sortOrder++));
        categories.add(createCategory("040204", "0402", "餐桌椅", 3, sortOrder++));
        categories.add(createCategory("040205", "0402", "书桌书架", 3, sortOrder++));

        categories.add(createCategory("040301", "0403", "锅具", 3, sortOrder++));
        categories.add(createCategory("040302", "0403", "刀具", 3, sortOrder++));
        categories.add(createCategory("040303", "0403", "餐具", 3, sortOrder++));
        categories.add(createCategory("040304", "0403", "水具酒具", 3, sortOrder++));

        categories.add(createCategory("04010101", "040101", "四件套", 4, sortOrder++));
        categories.add(createCategory("04010102", "040101", "三件套", 4, sortOrder++));
        categories.add(createCategory("04010103", "040101", "床单", 4, sortOrder++));

        return sortOrder;
    }

    private int addBeautyCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("05", null, "美妆个护", 1, sortOrder++));
        categories.add(createCategory("0501", "05", "面部护肤", 2, sortOrder++));
        categories.add(createCategory("0502", "05", "彩妆香水", 2, sortOrder++));
        categories.add(createCategory("0503", "05", "身体护理", 2, sortOrder++));
        categories.add(createCategory("0504", "05", "美发护发", 2, sortOrder++));
        categories.add(createCategory("0505", "05", "美容仪器", 2, sortOrder++));

        categories.add(createCategory("050101", "0501", "洁面", 3, sortOrder++));
        categories.add(createCategory("050102", "0501", "爽肤水", 3, sortOrder++));
        categories.add(createCategory("050103", "0501", "精华", 3, sortOrder++));
        categories.add(createCategory("050104", "0501", "乳液面霜", 3, sortOrder++));
        categories.add(createCategory("050105", "0501", "面膜", 3, sortOrder++));
        categories.add(createCategory("050106", "0501", "防晒", 3, sortOrder++));

        categories.add(createCategory("050201", "0502", "口红唇膏", 3, sortOrder++));
        categories.add(createCategory("050202", "0502", "粉底遮瑕", 3, sortOrder++));
        categories.add(createCategory("050203", "0502", "眼妆", 3, sortOrder++));
        categories.add(createCategory("050204", "0502", "香水", 3, sortOrder++));

        categories.add(createCategory("050301", "0503", "沐浴露", 3, sortOrder++));
        categories.add(createCategory("050302", "0503", "身体乳", 3, sortOrder++));
        categories.add(createCategory("050303", "0503", "护手霜", 3, sortOrder++));

        categories.add(createCategory("05010101", "050101", "氨基酸洁面", 4, sortOrder++));
        categories.add(createCategory("05010102", "050101", "皂基洁面", 4, sortOrder++));
        categories.add(createCategory("05010103", "050101", "洁面慕斯", 4, sortOrder++));

        return sortOrder;
    }

    private int addMotherBabyCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("06", null, "母婴玩具", 1, sortOrder++));
        categories.add(createCategory("0601", "06", "奶粉辅食", 2, sortOrder++));
        categories.add(createCategory("0602", "06", "纸尿裤湿巾", 2, sortOrder++));
        categories.add(createCategory("0603", "06", "洗护用品", 2, sortOrder++));
        categories.add(createCategory("0604", "06", "童车童床", 2, sortOrder++));
        categories.add(createCategory("0605", "06", "玩具", 2, sortOrder++));

        categories.add(createCategory("060101", "0601", "婴幼儿奶粉", 3, sortOrder++));
        categories.add(createCategory("060102", "0601", "辅食零食", 3, sortOrder++));
        categories.add(createCategory("060103", "0601", "营养品", 3, sortOrder++));

        categories.add(createCategory("060201", "0602", "纸尿裤", 3, sortOrder++));
        categories.add(createCategory("060202", "0602", "拉拉裤", 3, sortOrder++));
        categories.add(createCategory("060203", "0602", "湿巾纸巾", 3, sortOrder++));

        categories.add(createCategory("060501", "0605", "积木拼插", 3, sortOrder++));
        categories.add(createCategory("060502", "0605", "毛绒玩具", 3, sortOrder++));
        categories.add(createCategory("060503", "0605", "遥控电动", 3, sortOrder++));
        categories.add(createCategory("060504", "0605", "益智玩具", 3, sortOrder++));

        return sortOrder;
    }

    private int addSportsCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("07", null, "运动户外", 1, sortOrder++));
        categories.add(createCategory("0701", "07", "运动服饰", 2, sortOrder++));
        categories.add(createCategory("0702", "07", "运动鞋", 2, sortOrder++));
        categories.add(createCategory("0703", "07", "运动器材", 2, sortOrder++));
        categories.add(createCategory("0704", "07", "户外装备", 2, sortOrder++));

        categories.add(createCategory("070301", "0703", "健身器材", 3, sortOrder++));
        categories.add(createCategory("070302", "0703", "球类运动", 3, sortOrder++));
        categories.add(createCategory("070303", "0703", "游泳用品", 3, sortOrder++));
        categories.add(createCategory("070304", "0703", "瑜伽用品", 3, sortOrder++));

        categories.add(createCategory("070401", "0704", "帐篷", 3, sortOrder++));
        categories.add(createCategory("070402", "0704", "睡袋", 3, sortOrder++));
        categories.add(createCategory("070403", "0704", "登山装备", 3, sortOrder++));
        categories.add(createCategory("070404", "0704", "骑行装备", 3, sortOrder++));

        return sortOrder;
    }

    private int addBooksCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("08", null, "图书音像", 1, sortOrder++));
        categories.add(createCategory("0801", "08", "文学小说", 2, sortOrder++));
        categories.add(createCategory("0802", "08", "教育考试", 2, sortOrder++));
        categories.add(createCategory("0803", "08", "管理励志", 2, sortOrder++));
        categories.add(createCategory("0804", "08", "科技科普", 2, sortOrder++));
        categories.add(createCategory("0805", "08", "儿童读物", 2, sortOrder++));

        categories.add(createCategory("080101", "0801", "中国文学", 3, sortOrder++));
        categories.add(createCategory("080102", "0801", "外国文学", 3, sortOrder++));
        categories.add(createCategory("080103", "0801", "诗歌散文", 3, sortOrder++));

        categories.add(createCategory("080201", "0802", "中小学教辅", 3, sortOrder++));
        categories.add(createCategory("080202", "0802", "外语学习", 3, sortOrder++));
        categories.add(createCategory("080203", "0802", "考试教材", 3, sortOrder++));

        return sortOrder;
    }

    private int addOfficeCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("09", null, "办公用品", 1, sortOrder++));
        categories.add(createCategory("0901", "09", "办公文具", 2, sortOrder++));
        categories.add(createCategory("0902", "09", "办公设备", 2, sortOrder++));
        categories.add(createCategory("0903", "09", "办公耗材", 2, sortOrder++));

        categories.add(createCategory("090101", "0901", "书写工具", 3, sortOrder++));
        categories.add(createCategory("090102", "0901", "本册纸品", 3, sortOrder++));
        categories.add(createCategory("090103", "0901", "文件夹册", 3, sortOrder++));
        categories.add(createCategory("090104", "0901", "桌面用品", 3, sortOrder++));

        categories.add(createCategory("090201", "0902", "打印机", 3, sortOrder++));
        categories.add(createCategory("090202", "0902", "复印机", 3, sortOrder++));
        categories.add(createCategory("090203", "0902", "传真机", 3, sortOrder++));
        categories.add(createCategory("090204", "0902", "碎纸机", 3, sortOrder++));

        return sortOrder;
    }

    private int addPetCategories(List<ProductCategory> categories, int sortOrder) {
        categories.add(createCategory("10", null, "宠物用品", 1, sortOrder++));
        categories.add(createCategory("1001", "10", "宠物食品", 2, sortOrder++));
        categories.add(createCategory("1002", "10", "宠物用品", 2, sortOrder++));
        categories.add(createCategory("1003", "10", "宠物保健", 2, sortOrder++));

        return sortOrder;
    }
}
