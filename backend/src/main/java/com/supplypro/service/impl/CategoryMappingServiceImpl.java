package com.supplypro.service.impl;

import com.supplypro.entity.CategoryMapping;
import com.supplypro.entity.ProductCategory;
import com.supplypro.entity.ProjectCategory;
import com.supplypro.repository.CategoryMappingRepository;
import com.supplypro.repository.ProductCategoryRepository;
import com.supplypro.repository.ProjectCategoryRepository;
import com.supplypro.service.AiProxyService;
import com.supplypro.service.CategoryMappingService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;
import org.springframework.core.io.ClassPathResource;

import javax.annotation.PostConstruct;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.HashMap;

@Slf4j
@Service
public class CategoryMappingServiceImpl implements CategoryMappingService {

    @Autowired
    private CategoryMappingRepository mappingRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ProjectCategoryRepository projectCategoryRepository;

    @Autowired(required = false)
    private AiProxyService aiProxyService;

    @Autowired
    private ObjectMapper objectMapper;

    private static class KeywordRule {
        List<String> patterns;
        String targetL3;
    }

    private static class NewL3Item {
        String l1;
        String l2;
        String l3;
    }

    private static List<KeywordRule> KEYWORD_RULES;
    private static Map<String, String> FALLBACK_MAP;
    private static Map<String, String> SEMANTIC_OVERRIDES;

    static {
        KEYWORD_RULES = new ArrayList<>();

        KeywordRule r;

        r = new KeywordRule(); r.patterns = Arrays.asList("毛球修剪", "毛球修剪器", "粘毛", "除毛"); r.targetL3 = "衣物护理"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("干衣机", "烘干机"); r.targetL3 = "衣物护理"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("灭蚊灯", "灭蚊", "蚊灯"); r.targetL3 = "驱蚊"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("油烟机", "燃气灶", "消毒柜", "电饼铛", "煮蛋器", "煎蛋器", "面包机", "酸奶机", "电炖锅", "电蒸锅", "多士炉", "三明治机", "除湿机", "电暖器", "电暖气", "净水器", "热水器", "电视", "洗衣机", "空调", "电热饭盒", "冰淇淋机", "电子汤煲"); r.targetL3 = "其他电器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电烧烤箱"); r.targetL3 = "空气炸锅/烤箱/微波炉"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("破壁机", "豆浆机", "榨汁机", "打蛋器"); r.targetL3 = "料理机/搅拌机"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("养生壶", "煎药壶"); r.targetL3 = "热水壶"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("理疗仪", "理疗", "按摩", "足浴", "泡脚"); r.targetL3 = "足浴盆/按摩器材"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("美容", "洁面仪", "导入仪", "射频", "脱毛仪"); r.targetL3 = "美容仪"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("盆/桶"); r.targetL3 = "清洁工具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("台灯", "护眼灯", "落地灯", "夜灯"); r.targetL3 = "其他电器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("豆芽机", "电火锅", "多用途锅"); r.targetL3 = "其他电器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("剃/脱毛器", "剃毛器", "脱毛器"); r.targetL3 = "美容仪"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("平板电脑", "台式机", "笔记本", "电脑", "一体机", "移动硬盘", "路由器", "U盘", "硬盘", "网卡", "交换机", "鼠标", "键盘", "键鼠", "插排", "插座", "插线板", "转换器", "智能穿戴", "智能手表", "手环", "VR", "AR", "智能眼镜", "MP3", "MP4", "播放器", "随身听", "手写板", "线缆", "老人机", "手机存储卡", "智能家居", "智能机器人"); r.targetL3 = "数码/数码配件"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("麦克风", "专业音频", "耳机/耳麦", "蓝牙耳机", "耳机/耳塞", "耳麦"); r.targetL3 = "耳机/话筒"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("收音机"); r.targetL3 = "音箱"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("单反", "微单", "拍立得", "镜头", "相机", "摄像头", "摄像机", "卡片机", "拍照配件"); r.targetL3 = "摄影摄像"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("碗筷", "碗", "筷子", "砧板", "菜板", "刀具", "锅铲", "勺子", "酒具", "调料器皿"); r.targetL3 = "厨房用具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("营养零食"); r.targetL3 = "其他零食"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("麦片", "藕粉", "芝麻糊"); r.targetL3 = "谷类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("乌龙", "普洱", "龙井", "绿茶", "红茶", "花茶", "白茶", "茶叶", "茶"); r.targetL3 = "茶饮"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("拉拉裤", "纸尿裤", "尿不湿", "隔尿垫", "尿垫", "纸尿片"); r.targetL3 = "纸尿裤"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("湿巾", "湿纸巾"); r.targetL3 = "湿巾"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("爬行垫", "爬行", "学步车", "儿童自行车", "婴儿车", "儿童座椅"); r.targetL3 = "婴儿出行用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("婴儿枕", "婴童枕", "婴儿鞋服", "婴儿服", "婴儿衣", "婴儿鞋", "婴儿袜", "襁褓", "抱被", "包被", "婴儿防护"); r.targetL3 = "婴儿服饰及用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电动牙刷"); r.targetL3 = "电动牙刷/冲牙器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("儿童牙刷", "儿童餐具", "餐椅", "餐具", "儿童用具"); r.targetL3 = "餐具工具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("洗澡", "浴盆", "儿童护肤"); r.targetL3 = "婴儿沐浴护肤"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("毛巾浴巾"); r.targetL3 = "毯类/毛巾"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("健康杂粮", "杂粮", "粗粮", "冲调品"); r.targetL3 = "谷类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("膨化", "粗粮膨化"); r.targetL3 = "膨化食品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("垃圾袋", "垃圾桶", "工具箱", "玻璃", "保洁", "一次性用品", "清洁剂"); r.targetL3 = "清洁工具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("窗帘", "窗纱", "被子", "毯子", "枕套", "枕巾", "抱枕", "靠垫", "地毯", "桌布", "沙发垫套", "蚊帐", "家居家纺", "家具", "家庭装饰"); r.targetL3 = "居家布艺"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("染发剂", "染发", "美甲"); r.targetL3 = "美发造型"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("保暖内衣", "内衣/内裤", "家居服饰"); r.targetL3 = "服饰"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("瑜伽", "瑜伽垫", "瑜伽服", "短裤", "套衫", "卫衣", "外套", "上衣", "跳绳", "游泳配件", "西裤", "西服套装", "运动T恤", "运动风衣", "运动鞋", "运动裤", "运动夹克", "运动套装", "速干毛巾", "运动帽"); r.targetL3 = "健身服饰/鞋包"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("乒乓球", "乒乓球拍", "篮球", "足球", "排球", "网球", "羽毛球"); r.targetL3 = "各种球类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("体育周边", "运动周边", "健身辅具", "运动护具"); r.targetL3 = "配套器材及配件"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("书籍", "图书", "书", "读物", "记事本", "笔", "文具", "文件夹", "文件袋"); r.targetL3 = "文具类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("太阳镜", "墨镜", "眼镜架", "镜框", "镜架", "隐形眼镜", "美瞳", "戒指", "项链", "耳环", "手链", "手镯", "吊坠", "首饰", "钥匙扣"); r.targetL3 = "配饰"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("打印机", "墨盒", "硒鼓", "打印纸"); r.targetL3 = "办公耗材"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电话", "对讲机", "投影仪"); r.targetL3 = "办公设备"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("闹钟", "挂钟", "座钟", "钟表", "手表"); r.targetL3 = "装饰/香氛"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("蛋糕", "西点", "面包", "甜点", "烘焙", "粽子", "月饼", "糕点炒货"); r.targetL3 = "饼干糕点"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("消费券", "券", "卡券", "电影"); r.targetL3 = "其他用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("野餐", "野餐垫", "野餐篮", "踏青", "郊游", "春游", "帐篷", "防潮垫", "睡袋", "吊床", "折叠桌椅", "折叠野营车", "钓竿", "钓伞", "鱼线", "垂钓", "钓鱼"); r.targetL3 = "露营野餐装备"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("防晒衣", "防晒霜", "防晒"); r.targetL3 = "防晒隔离"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("钙铁锌", "钙", "铁", "锌", "DHA", "益生菌", "维生素", "孕期营养", "胶原蛋白", "蛋白质", "肠胃养护", "骨骼健康", "膳食纤维", "鱼油/磷脂", "维生素其它", "B族维生素"); r.targetL3 = "功能性营养品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("奶粉", "婴幼儿奶粉", "辅食", "米粉", "果泥", "肉泥"); r.targetL3 = "奶粉/婴幼儿辅食"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电热毯"); r.targetL3 = "取暖器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("生活小电"); r.targetL3 = "其他电器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("保鲜盒", "保鲜膜", "饭盒/提锅"); r.targetL3 = "餐具保鲜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("袜子"); r.targetL3 = "鞋袜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("挂件", "香薰", "炭包", "净化剂", "除味", "除臭", "去味", "消臭", "清新剂", "空气清新", "活性炭", "竹炭", "摆件", "鲜花", "花束", "绿植", "盆栽", "多肉"); r.targetL3 = "装饰/香氛"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("坐垫座套", "脚垫", "头枕腰靠", "遮阳/雪挡", "遮阳", "雪挡", "车载储物箱", "车载支架", "行车记录仪", "车载应急电源", "车载充电器", "车载净化器", "车载冰箱", "车载影音", "车载充气泵", "车载", "车蜡", "洗车", "机油", "汽车养护", "创意车载"); r.targetL3 = "汽车用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("洗面奶", "洁面乳"); r.targetL3 = "洁面/卸妆"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("护理套装"); r.targetL3 = "精华水/乳液/面霜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("爽肤水"); r.targetL3 = "精华水/乳液/面霜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("牙膏", "牙具", "牙线", "牙贴", "洗牙器", "冲牙器"); r.targetL3 = "口腔护理"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("香皂", "沐浴露"); r.targetL3 = "沐浴清洁"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("花露水", "精油", "浴盐", "眼罩", "护手霜"); r.targetL3 = "身体乳/手足护理"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("面巾纸", "手帕纸", "卷筒纸"); r.targetL3 = "卷纸/抽纸/厨房纸"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("洗衣液", "洗洁精", "洁厕剂", "洗衣凝珠", "洗衣粉", "其他衣物清洁"); r.targetL3 = "洗衣清洁"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("粉底"); r.targetL3 = "面部彩妆"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("化妆用具"); r.targetL3 = "化妆工具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("眼影", "眼线", "眉笔", "眉粉", "睫毛膏", "眼部"); r.targetL3 = "眉眼彩妆"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("腮红", "高光", "修容", "遮瑕", "粉饼", "定妆"); r.targetL3 = "面部彩妆"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("卷/直发器", "理发器", "电吹风"); r.targetL3 = "美发电器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("洗护套装"); r.targetL3 = "洗发护发"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("口红"); r.targetL3 = "唇部彩妆"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("眼霜"); r.targetL3 = "精华水/乳液/面霜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("BB霜", "CC霜"); r.targetL3 = "防晒隔离"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("炒锅", "不粘锅", "砂锅", "煎锅", "奶锅", "汤锅", "蒸锅", "火锅"); r.targetL3 = "锅具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("烧烤用具"); r.targetL3 = "露营野餐装备"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("孕妇服", "防辐射服"); r.targetL3 = "孕妈服饰及用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("吸奶器"); r.targetL3 = "其他用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("手拿包", "化妆包", "钱包", "单肩包", "双肩包", "手包", "手提包", "拉杆箱", "旅行包", "背包", "手臂包", "腰包"); r.targetL3 = "箱包"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("调味品"); r.targetL3 = "调味香辛料"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("休闲鞋", "登山鞋", "越野跑鞋", "拖鞋"); r.targetL3 = "鞋袜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("登山杖"); r.targetL3 = "登山徒步装备"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("山地车", "公路车", "平衡车", "骑行"); r.targetL3 = "骑行运动"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("跑步机", "甩脂机", "健身车", "健腹机", "划船机"); r.targetL3 = "健身运动器械"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("足贴", "暖宝宝", "暖腰带", "创可贴", "绷带", "棉签", "口罩", "消毒液", "酒精"); r.targetL3 = "养生用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("苹果", "芒果", "橙子", "椰子", "榴莲", "地标水果", "热销水果", "其他水果"); r.targetL3 = "常规水果"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("鸡肉", "鸭肉"); r.targetL3 = "禽/蛋类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("牛肉", "羊肉"); r.targetL3 = "牛羊肉"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("内脏类", "肉类地标产品", "其它肉类"); r.targetL3 = "禽/蛋类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("鲜菌菇"); r.targetL3 = "豆菌菇类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("方便速食", "方便食品", "拌面"); r.targetL3 = "方便面/粉"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("果汁", "饮品甜品"); r.targetL3 = "饮料"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("蜂蜜", "人参", "阿胶膏", "阿胶"); r.targetL3 = "传统滋补品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("南北干货"); r.targetL3 = "蔬菜/菌干货"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("半加工菜"); r.targetL3 = "净菜/切配蔬菜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("儿童玩具", "早教机"); r.targetL3 = "益智早教玩具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("体温计", "电子体温计"); r.targetL3 = "体温枪"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("助听器", "健康秤", "计步器", "脂肪检测仪", "脂肪检测"); r.targetL3 = "矫姿带"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("工艺礼品", "礼品", "国潮", "文创", "非遗", "传统工艺"); r.targetL3 = "居家布艺"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("酸牛奶"); r.targetL3 = "酸奶"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("纯牛奶", "豆奶"); r.targetL3 = "动/植物奶"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("植物奶", "动物奶"); r.targetL3 = "动/植物奶"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电烤箱"); r.targetL3 = "空气炸锅/烤箱/微波炉"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("食用油"); r.targetL3 = "食用油"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("挂烫机", "熨斗"); r.targetL3 = "衣物护理"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("除螨仪", "空气净化器", "蒸汽拖把", "拖地机", "扫地机器人", "吸尘器"); r.targetL3 = "清洁家电"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("果脯蜜饯", "枣类"); r.targetL3 = "果干蜜饯"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("豆干"); r.targetL3 = "其他零食"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("鱼类", "虾类", "蟹类", "海参"); r.targetL3 = "鱼/虾/蟹/贝类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("根茎类"); r.targetL3 = "根茎瓜类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("茄果瓜类"); r.targetL3 = "茄果椒类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("葱姜蒜椒"); r.targetL3 = "葱姜蒜调味菜"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("米面/面粉", "米面"); r.targetL3 = "面粉/面条"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("水具", "保温杯", "杯具"); r.targetL3 = "杯壶水具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("晾衣架", "挂钩"); r.targetL3 = "收纳"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("被套", "床单被罩"); r.targetL3 = "套件"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("运动水杯"); r.targetL3 = "杯壶水具"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("会议音频视频"); r.targetL3 = "音箱"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("老花镜"); r.targetL3 = "配饰"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电吹风", "吹风机"); r.targetL3 = "美发电器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("剃须刀", "电动剃须刀"); r.targetL3 = "剃须刀"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("美容仪", "洁面仪", "导入仪", "射频仪", "脱毛仪", "美颜仪", "蒸脸器"); r.targetL3 = "美容仪"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("空气炸锅", "烤饼机", "早餐机", "光波炉"); r.targetL3 = "空气炸锅/烤箱/微波炉"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("微波炉", "微蒸烤"); r.targetL3 = "空气炸锅/烤箱/微波炉"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("咖啡机", "磨豆机", "奶泡机"); r.targetL3 = "咖啡机/饮水机"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("饮水机", "直饮机", "管线机", "茶吧机", "即热饮水机"); r.targetL3 = "咖啡机/饮水机"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电动牙刷", "声波牙刷"); r.targetL3 = "电动牙刷/冲牙器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("冲牙器", "水牙线"); r.targetL3 = "电动牙刷/冲牙器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("足浴盆", "泡脚盆", "足浴器", "洗脚盆", "按摩椅", "按摩披肩", "颈椎按摩", "腰部按摩", "足底按摩", "按摩枕", "筋膜枪", "保健器材", "肩颈按摩", "保健器械"); r.targetL3 = "足浴盆/按摩器材"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电饭煲", "电饭锅", "电压力锅", "压力锅"); r.targetL3 = "电饭煲/电压力锅"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("电磁炉", "电陶炉", "电灶"); r.targetL3 = "电炉"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("绞肉机", "辅食机", "原汁机", "果蔬机", "和面机", "厨师机"); r.targetL3 = "料理机/搅拌机"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("热水壶", "电水壶", "保温壶", "烧水壶"); r.targetL3 = "热水壶"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("风扇", "电风扇", "落地扇", "台扇", "吊扇", "塔扇", "循环扇", "空调扇", "冷风扇", "无叶风扇"); r.targetL3 = "风扇"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("取暖", "电暖器", "暖风机", "踢脚线", "油汀", "小太阳"); r.targetL3 = "取暖器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("加湿器", "加湿", "香薰机", "雾化"); r.targetL3 = "加湿器"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("熏香", "香薰", "香氛蜡烛"); r.targetL3 = "装饰/香氛"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("辣椒酱", "番茄酱", "沙拉酱", "蛋黄酱", "果酱", "花生酱", "芝麻酱", "千岛酱"); r.targetL3 = "酱汁"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("酱油", "醋", "料酒", "蚝油", "鸡精", "味精", "盐", "糖", "生抽", "老抽", "豆瓣酱"); r.targetL3 = "厨房调料"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("花椒", "八角", "桂皮", "胡椒", "孜然", "五香粉", "十三香", "咖喱", "茴香"); r.targetL3 = "调味香辛料"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("红豆", "绿豆", "黑豆", "黄豆", "芸豆", "鹰嘴豆"); r.targetL3 = "豆类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("芝麻", "南瓜子", "莲子"); r.targetL3 = "其他类"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("卤味", "熟食", "卤菜", "卤肉", "酱鸭", "烧鸡"); r.targetL3 = "卤味熟食"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("腊肉", "腊肠", "腊鱼", "咸肉", "风干", "火腿"); r.targetL3 = "腊味制品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("方便粥", "即食粥", "自热锅", "自热饭", "速食粥", "八宝粥"); r.targetL3 = "方便粥/饭"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("火腿肠", "肉肠"); r.targetL3 = "火腿肠"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("罐头", "鱼罐头", "水果罐头", "午餐肉", "黄桃罐头"); r.targetL3 = "罐头"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("肉干", "牛肉干", "猪肉脯", "鸭脖", "鸭舌", "鸡爪", "凤爪", "卤蛋", "鱿鱼丝"); r.targetL3 = "肉干卤味"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("橄榄油"); r.targetL3 = "橄榄油/亚麻籽油"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("亚麻籽油", "茶油", "核桃油", "牛油果油", "葡萄籽油", "椰子油"); r.targetL3 = "其他品种油"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("避孕套", "安全套", "验孕", "排卵", "润滑剂", "情趣"); r.targetL3 = "计生用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("奶瓶", "奶嘴", "安抚奶嘴", "学饮杯", "吸管杯", "鸭嘴杯"); r.targetL3 = "奶瓶/奶嘴/水杯"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("宠物零食", "猫零食", "狗零食", "宠物食品", "猫粮", "狗粮"); r.targetL3 = "宠物零食/保健用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("宠物保健", "宠物营养", "化毛膏", "猫草", "宠物维生素"); r.targetL3 = "宠物零食/保健用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("猫砂", "猫厕所", "狗窝", "猫窝", "宠物玩具", "逗猫棒", "牵引绳", "宠物碗", "宠物笼", "宠物梳", "宠物清洁", "宠物尿垫"); r.targetL3 = "宠物用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("卸妆", "卸妆水", "卸妆油", "卸妆乳", "卸妆膏", "卸妆湿巾"); r.targetL3 = "洁面/卸妆"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("燕窝", "枸杞", "西洋参", "花胶", "石斛", "陈皮", "鹿茸", "灵芝", "蜂胶", "蜂王浆", "雪蛤", "虫草", "三七", "天麻", "当归", "黄芪", "党参", "红参"); r.targetL3 = "传统滋补品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("蛋白粉", "褪黑素", "酵素", "代餐", "左旋", "肌酸", "支链", "氮泵", "蛋白棒", "能量胶"); r.targetL3 = "功能性营养品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("泡脚包", "艾灸", "热敷", "刮痧", "拔罐", "暖贴", "艾条"); r.targetL3 = "养生用品"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("血糖仪", "血糖试纸", "采血针"); r.targetL3 = "血糖仪"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("血压计", "电子血压计"); r.targetL3 = "血压计"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("体温枪", "额温枪", "耳温枪", "温度计"); r.targetL3 = "体温枪"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("矫姿带", "背背佳", "姿势矫正", "护腰带"); r.targetL3 = "矫姿带"; KEYWORD_RULES.add(r);
        r = new KeywordRule(); r.patterns = Arrays.asList("轮椅", "代步车", "拐杖", "助行器", "护理床"); r.targetL3 = "轮椅"; KEYWORD_RULES.add(r);

        FALLBACK_MAP = new LinkedHashMap<>();
        FALLBACK_MAP.put("大家电_default", "其他电器");
        FALLBACK_MAP.put("生活电器_default", "其他电器");
        FALLBACK_MAP.put("厨卫电器_default", "其他电器");
        FALLBACK_MAP.put("IT产品_default", "数码/数码配件");
        FALLBACK_MAP.put("手机通讯_default", "数码/数码配件");
        FALLBACK_MAP.put("手机配件_default", "数码/数码配件");
        FALLBACK_MAP.put("摄影摄像_default", "摄影摄像");
        FALLBACK_MAP.put("智能设备_default", "数码/数码配件");
        FALLBACK_MAP.put("影音娱乐_default", "音箱");
        FALLBACK_MAP.put("车载电器_default", "汽车用品");
        FALLBACK_MAP.put("维修保养_default", "汽车用品");
        FALLBACK_MAP.put("装饰配件_default", "汽车用品");
        FALLBACK_MAP.put("家庭清洁_default", "清洁工具");
        FALLBACK_MAP.put("厨具_default", "厨房用具");
        FALLBACK_MAP.put("家纺_default", "居家布艺");
        FALLBACK_MAP.put("家具_default", "居家布艺");
        FALLBACK_MAP.put("生活日用_default", "清洁工具");
        FALLBACK_MAP.put("内衣配饰_default", "鞋袜");
        FALLBACK_MAP.put("洗发护发_default", "洗发护发");
        FALLBACK_MAP.put("面部护理_default", "精华水/乳液/面霜");
        FALLBACK_MAP.put("口腔护理_default", "口腔护理");
        FALLBACK_MAP.put("女性护理_default", "卫生巾");
        FALLBACK_MAP.put("化妆彩妆_default", "面部彩妆");
        FALLBACK_MAP.put("身体护理_default", "身体乳/手足护理");
        FALLBACK_MAP.put("生活用纸_default", "卷纸/抽纸/厨房纸");
        FALLBACK_MAP.put("护理护具_default", "养生用品");
        FALLBACK_MAP.put("个护健康_default", "美容仪");
        FALLBACK_MAP.put("尿裤湿巾_default", "纸尿裤");
        FALLBACK_MAP.put("婴儿用品_default", "其他用品");
        FALLBACK_MAP.put("妈妈专区_default", "孕妈服饰及用品");
        FALLBACK_MAP.put("玩具乐器_default", "益智早教玩具");
        FALLBACK_MAP.put("玩具早教_default", "益智早教玩具");
        FALLBACK_MAP.put("童车座椅_default", "婴儿出行用品");
        FALLBACK_MAP.put("体育休闲_default", "健身服饰/鞋包");
        FALLBACK_MAP.put("户外装备_default", "露营野餐装备");
        FALLBACK_MAP.put("户外鞋服_default", "鞋袜");
        FALLBACK_MAP.put("游泳装备_default", "健身服饰/鞋包");
        FALLBACK_MAP.put("运动设备_default", "健身运动器械");
        FALLBACK_MAP.put("运动鞋服_default", "健身服饰/鞋包");
        FALLBACK_MAP.put("健身器材_default", "健身运动器械");
        FALLBACK_MAP.put("运动包/配件_default", "配套器材及配件");
        FALLBACK_MAP.put("骑行运动_default", "骑行运动");
        FALLBACK_MAP.put("女包_default", "箱包");
        FALLBACK_MAP.put("时尚背包_default", "箱包");
        FALLBACK_MAP.put("功能箱包_default", "箱包");
        FALLBACK_MAP.put("商务服饰_default", "服饰");
        FALLBACK_MAP.put("眼镜_default", "配饰");
        FALLBACK_MAP.put("钟表_default", "装饰/香氛");
        FALLBACK_MAP.put("首饰_default", "配饰");
        FALLBACK_MAP.put("图书_default", "文具类");
        FALLBACK_MAP.put("营养辅食_default", "功能性营养品");
        FALLBACK_MAP.put("冲调饮品_default", "谷类");
        FALLBACK_MAP.put("牛奶饮料_default", "饮料");
        FALLBACK_MAP.put("传统滋补_default", "传统滋补品");
        FALLBACK_MAP.put("营养保健_default", "功能性营养品");
        FALLBACK_MAP.put("粮油米面_default", "谷类");
        FALLBACK_MAP.put("休闲食品_default", "其他零食");
        FALLBACK_MAP.put("新鲜水果_default", "常规水果");
        FALLBACK_MAP.put("蔬菜蛋品_default", "豆菌菇类");
        FALLBACK_MAP.put("精选肉类_default", "牛羊肉");
        FALLBACK_MAP.put("海鲜水产_default", "水产/海产干货");
        FALLBACK_MAP.put("冷冻饮食_default", "冷冻面点");
        FALLBACK_MAP.put("农副加工_default", "蔬菜/菌干货");
        FALLBACK_MAP.put("蛋糕西点_default", "饼干糕点");
        FALLBACK_MAP.put("旅行踏青_default", "露营野餐装备");
        FALLBACK_MAP.put("户外出行_default", "露营野餐装备");
        FALLBACK_MAP.put("精品电器_default", "其他电器");
        FALLBACK_MAP.put("保健品_default", "功能性营养品");
        FALLBACK_MAP.put("保健器械_default", "足浴盆/按摩器材");
        FALLBACK_MAP.put("家政保洁_default", "清洁工具");
        FALLBACK_MAP.put("礼品花卉_default", "装饰/香氛");
        FALLBACK_MAP.put("伴手礼_default", "手工刺绣");
        FALLBACK_MAP.put("垂钓产品_default", "露营野餐装备");

        SEMANTIC_OVERRIDES = new LinkedHashMap<>();
        SEMANTIC_OVERRIDES.put("纯牛奶/豆奶", "动/植物奶");
        SEMANTIC_OVERRIDES.put("纯牛奶", "动/植物奶");
        SEMANTIC_OVERRIDES.put("豆奶", "动/植物奶");
        SEMANTIC_OVERRIDES.put("植物奶", "动/植物奶");
        SEMANTIC_OVERRIDES.put("动物奶", "动/植物奶");
        SEMANTIC_OVERRIDES.put("酸牛奶", "酸奶");
        SEMANTIC_OVERRIDES.put("挂烫机/熨斗", "衣物护理");
        SEMANTIC_OVERRIDES.put("挂烫机", "衣物护理");
        SEMANTIC_OVERRIDES.put("熨斗", "衣物护理");
        SEMANTIC_OVERRIDES.put("破壁机/豆浆机/榨汁机", "料理机/搅拌机");
        SEMANTIC_OVERRIDES.put("麦片/藕粉/芝麻糊", "谷类");
        SEMANTIC_OVERRIDES.put("冲调品", "谷类");
        SEMANTIC_OVERRIDES.put("电烤箱", "空气炸锅/烤箱/微波炉");
        SEMANTIC_OVERRIDES.put("除螨仪", "清洁家电");
        SEMANTIC_OVERRIDES.put("空气净化器", "清洁家电");
        SEMANTIC_OVERRIDES.put("扫地机器人", "清洁家电");
        SEMANTIC_OVERRIDES.put("吸尘器", "清洁家电");
        SEMANTIC_OVERRIDES.put("蒸汽拖把", "清洁家电");
        SEMANTIC_OVERRIDES.put("根茎类", "根茎瓜类");
        SEMANTIC_OVERRIDES.put("茄果瓜类", "茄果椒类");
        SEMANTIC_OVERRIDES.put("葱姜蒜椒", "葱姜蒜调味菜");
        SEMANTIC_OVERRIDES.put("米面/面粉", "面粉/面条");
        SEMANTIC_OVERRIDES.put("玉米油/花生油/菜籽油", "食用油");
        SEMANTIC_OVERRIDES.put("橄榄油", "橄榄油/亚麻籽油");
        SEMANTIC_OVERRIDES.put("水具/保温杯", "杯壶水具");
        SEMANTIC_OVERRIDES.put("晾衣架/挂钩", "收纳");
        SEMANTIC_OVERRIDES.put("被套/床单被罩", "套件");
        SEMANTIC_OVERRIDES.put("果脯蜜饯/枣类", "果干蜜饯");
        SEMANTIC_OVERRIDES.put("吹风机", "美发电器");
        SEMANTIC_OVERRIDES.put("电吹风", "美发电器");
        SEMANTIC_OVERRIDES.put("剃须刀/电动剃须刀", "剃须刀");
        SEMANTIC_OVERRIDES.put("电饭煲/电压力锅", "电饭煲/电压力锅");
        SEMANTIC_OVERRIDES.put("电磁炉/电陶炉", "电炉");
        SEMANTIC_OVERRIDES.put("绞肉机/辅食机", "料理机/搅拌机");
        SEMANTIC_OVERRIDES.put("电烧烤箱", "空气炸锅/烤箱/微波炉");
        SEMANTIC_OVERRIDES.put("干衣机/烘干机", "衣物护理");
        SEMANTIC_OVERRIDES.put("电炖锅/电蒸锅", "其他电器");
        SEMANTIC_OVERRIDES.put("化妆品套装/护理套装", "精华水/乳液/面霜");
        SEMANTIC_OVERRIDES.put("男士护肤品", "精华水/乳液/面霜");
        SEMANTIC_OVERRIDES.put("地被/草籽/种子/种苗", "装饰/香氛");
        SEMANTIC_OVERRIDES.put("五金工具", "清洁工具");
        SEMANTIC_OVERRIDES.put("清洁服务商品", "清洁工具");
        SEMANTIC_OVERRIDES.put("打蛋器/煮蛋器/煎蛋器", "料理机/搅拌机");
        SEMANTIC_OVERRIDES.put("煮蛋器", "料理机/搅拌机");
        SEMANTIC_OVERRIDES.put("打蛋器", "料理机/搅拌机");
        SEMANTIC_OVERRIDES.put("煎蛋器", "料理机/搅拌机");
    }

    private static String normalize(String str) {
        if (str == null) return "";
        return str.replaceAll("[\\s/()（）【】\\[\\]{}「」『』\"\"''·•\\-—]", "").toLowerCase();
    }

    /**
     * Load additional mapping rules from mapping-rules.yml at startup.
     * Rules from YAML are ADDED to the existing hardcoded rules (does not replace them).
     * If the YAML file is missing or malformed, the service starts with hardcoded rules only.
     */
    @PostConstruct
    public void loadYamlRules() {
        try {
            ClassPathResource resource = new ClassPathResource("mapping-rules.yml");
            if (!resource.exists()) {
                log.info("mapping-rules.yml not found, using hardcoded rules only");
                return;
            }
            Yaml yaml = new Yaml();
            try (InputStream is = resource.getInputStream()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> config = yaml.load(is);
                if (config == null) return;

                int keywordAdded = 0, fallbackAdded = 0, semanticAdded = 0;

                // Load keyword rules
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> yamlKeywordRules = (List<Map<String, Object>>) config.get("keyword_rules");
                if (yamlKeywordRules != null) {
                    for (Map<String, Object> ruleMap : yamlKeywordRules) {
                        KeywordRule rule = new KeywordRule();
                        @SuppressWarnings("unchecked")
                        List<String> patterns = (List<String>) ruleMap.get("patterns");
                        rule.patterns = patterns != null ? patterns : Collections.emptyList();
                        rule.targetL3 = (String) ruleMap.get("target_l3");
                        if (rule.targetL3 != null && !rule.patterns.isEmpty()) {
                            KEYWORD_RULES.add(rule);
                            keywordAdded++;
                        }
                    }
                }

                // Load fallback map
                @SuppressWarnings("unchecked")
                Map<String, String> yamlFallbackMap = (Map<String, String>) config.get("fallback_map");
                if (yamlFallbackMap != null) {
                    FALLBACK_MAP.putAll(yamlFallbackMap);
                    fallbackAdded = yamlFallbackMap.size();
                }

                // Load semantic overrides
                @SuppressWarnings("unchecked")
                Map<String, String> yamlSemanticOverrides = (Map<String, String>) config.get("semantic_overrides");
                if (yamlSemanticOverrides != null) {
                    SEMANTIC_OVERRIDES.putAll(yamlSemanticOverrides);
                    semanticAdded = yamlSemanticOverrides.size();
                }

                log.info("Loaded mapping rules from YAML: {} keyword rules, {} fallback entries, {} semantic overrides",
                    keywordAdded, fallbackAdded, semanticAdded);
            }
        } catch (Exception e) {
            log.warn("Failed to load mapping-rules.yml, using hardcoded rules only. Error: {}", e.getMessage());
        }
    }

    private static double similarity(String a, String b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty()) return 0;
        String na = normalize(a);
        String nb = normalize(b);
        if (na.equals(nb)) return 1.0;
        if (na.length() < 2 || nb.length() < 2) return 0;

        // Strategy 1: Substring containment (highest confidence for simple cases)
        double sContain = 0;
        if (na.contains(nb) && nb.length() >= 2) sContain = 0.92;
        else if (nb.contains(na) && na.length() >= 2) sContain = 0.92;

        // Strategy 2: Character bigram Jaccard similarity
        Set<String> bigramsA = new HashSet<>();
        Set<String> bigramsB = new HashSet<>();
        for (int i = 0; i < na.length() - 1; i++) bigramsA.add(na.substring(i, i + 2));
        for (int i = 0; i < nb.length() - 1; i++) bigramsB.add(nb.substring(i, i + 2));
        Set<String> bigramIntersection = new HashSet<>(bigramsA);
        bigramIntersection.retainAll(bigramsB);
        Set<String> bigramUnion = new HashSet<>(bigramsA);
        bigramUnion.addAll(bigramsB);
        double sBigram = bigramUnion.size() > 0 ? (double) bigramIntersection.size() / bigramUnion.size() : 0;

        // Strategy 3: Character set Jaccard similarity
        Set<String> setA = new HashSet<>(Arrays.asList(na.split("")));
        Set<String> setB = new HashSet<>(Arrays.asList(nb.split("")));
        Set<String> charIntersection = new HashSet<>(setA);
        charIntersection.retainAll(setB);
        Set<String> charUnion = new HashSet<>(setA);
        charUnion.addAll(setB);
        double sCharSet = charUnion.size() > 0 ? (double) charIntersection.size() / charUnion.size() : 0;

        // Strategy 4: Edit distance similarity (Levenshtein ratio)
        int editDist = levenshteinDistance(na, nb);
        int maxLen = Math.max(na.length(), nb.length());
        double sEdit = maxLen > 0 ? 1.0 - (double) editDist / maxLen : 0;

        // Strategy 5: Longest common substring ratio
        int lcsLen = longestCommonSubstringLength(na, nb);
        double sLcs = maxLen > 0 ? (double) lcsLen / maxLen : 0;

        // Early exit: if very few characters in common and no containment, it's a mismatch
        if (charIntersection.size() < 2 && setA.size() >= 2 && setB.size() >= 2 && sContain == 0) return 0;

        // Weighted combination: containment > LCS > edit > bigram > charset
        double best = sContain;
        if (sLcs > best) best = sLcs;
        if (sEdit > best) best = sEdit;
        // Blend bigram and charset with containment/LCS for edge cases
        double blended = 0.4 * sBigram + 0.3 * sCharSet + 0.3 * sEdit;
        if (blended > best) best = blended;

        return best;
    }

    /**
     * Compute Levenshtein (edit) distance between two strings.
     */
    private static int levenshteinDistance(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, Math.min(dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost));
            }
        }
        return dp[a.length()][b.length()];
    }

    /**
     * Compute the length of the longest common substring.
     */
    private static int longestCommonSubstringLength(String a, String b) {
        int maxLen = 0;
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    if (dp[i][j] > maxLen) maxLen = dp[i][j];
                }
            }
        }
        return maxLen;
    }

    private static int applySemanticOverrides(List<MappingResult> mappings, List<NewL3Item> newL3Index) {
        int fixed = 0;
        for (MappingResult m : mappings) {
            String override = SEMANTIC_OVERRIDES.get(m.oldL3Name);
            if (override != null && !override.equals(m.newL3Name)) {
                NewL3Item target = findByL3(newL3Index, override);
                if (target != null) {
                    m.newL1Name = target.l1;
                    m.newL2Name = target.l2;
                    m.newL3Name = target.l3;
                    m.score = Math.max(m.score, 0.950);
                    m.matchMethod = "语义修正";
                    m.status = "精准匹配";
                    fixed++;
                }
            }
        }
        return fixed;
    }

    private static NewL3Item findByL3(List<NewL3Item> index, String l3Name) {
        for (NewL3Item item : index) {
            if (item.l3.equals(l3Name)) return item;
        }
        return null;
    }

    private static class MappingResult {
        String systemCategoryId;
        String systemCategoryName;
        String systemCategoryFullPath;
        String systemL1Name;
        String systemL2Name;
        String oldL3Name;
        String newL1Name;
        String newL2Name;
        String newL3Name;
        double score;
        String matchMethod;
        String status;
    }

    private List<MappingResult> performMapping(
            List<ProductCategory> systemLeafCategories,
            List<NewL3Item> newL3Index,
            Map<String, ProductCategory> categoryMap) {

        List<MappingResult> results = new ArrayList<>();

        for (ProductCategory sysCat : systemLeafCategories) {
            String oldL3Name = sysCat.getName();

            ProductCategory parentCat = categoryMap.get(sysCat.getParentId());
            String oldL2Name = parentCat != null ? parentCat.getName() : "";
            String oldL1Name = "";
            if (parentCat != null && parentCat.getParentId() != null) {
                ProductCategory grandParentCat = categoryMap.get(parentCat.getParentId());
                if (grandParentCat != null) {
                    oldL1Name = grandParentCat.getName();
                }
            }

            NewL3Item bestL3 = null;
            double bestScore = 0;
            String matchMethod = "";

            for (KeywordRule rule : KEYWORD_RULES) {
                for (String pattern : rule.patterns) {
                    if (oldL3Name.contains(pattern)) {
                        NewL3Item target = findByL3(newL3Index, rule.targetL3);
                        if (target != null) {
                            bestL3 = target;
                            bestScore = 0.85;
                            matchMethod = "关键词规则";
                            break;
                        }
                    }
                }
                if (bestL3 != null) break;
            }

            if (bestL3 == null) {
                for (KeywordRule rule : KEYWORD_RULES) {
                    for (String pattern : rule.patterns) {
                        if (oldL2Name.contains(pattern)) {
                            NewL3Item target = findByL3(newL3Index, rule.targetL3);
                            if (target != null) {
                                bestL3 = target;
                                bestScore = 0.75;
                                matchMethod = "关键词规则(L2)";
                                break;
                            }
                        }
                    }
                    if (bestL3 != null) break;
                }
            }

            if (bestL3 == null) {
                for (NewL3Item item : newL3Index) {
                    double s = similarity(oldL3Name, item.l3);
                    if (s > bestScore) {
                        bestScore = s;
                        bestL3 = item;
                        matchMethod = "名称相似度";
                    }
                }
                if (bestScore < 0.60) {
                    bestL3 = null;
                    bestScore = 0;
                }
            }

            if (bestScore < 0.55) {
                for (NewL3Item item : newL3Index) {
                    double s = similarity(oldL2Name, item.l3);
                    if (s > bestScore) {
                        bestScore = s;
                        bestL3 = item;
                        matchMethod = "二级名称→三级匹配";
                    }
                }
                if (bestScore < 0.55) {
                    bestL3 = null;
                    bestScore = 0;
                }
            }

            if (bestScore < 0.55) {
                String fallbackKey = oldL2Name + "_default";
                String fallbackTarget = FALLBACK_MAP.get(fallbackKey);
                if (fallbackTarget != null) {
                    NewL3Item fallbackItem = findByL3(newL3Index, fallbackTarget);
                    if (fallbackItem != null) {
                        bestL3 = fallbackItem;
                        bestScore = 0.40;
                        matchMethod = "兜底分类";
                    }
                }
            }

            if (bestScore < 0.55) {
                String fallbackKey = oldL1Name + "_default";
                String fallbackTarget = FALLBACK_MAP.get(fallbackKey);
                if (fallbackTarget != null) {
                    NewL3Item fallbackItem = findByL3(newL3Index, fallbackTarget);
                    if (fallbackItem != null) {
                        bestL3 = fallbackItem;
                        bestScore = 0.35;
                        matchMethod = "兜底分类(L1)";
                    }
                }
            }

            if (bestScore < 0.55) {
                double bestOtherScore = 0;
                NewL3Item bestOtherItem = null;
                for (NewL3Item item : newL3Index) {
                    if (item.l3.contains("其他") || item.l3.contains("其它")) {
                        double l2Sim = similarity(oldL2Name, item.l2);
                        double combined = l2Sim * 0.6;
                        if (combined > bestOtherScore) {
                            bestOtherScore = combined;
                            bestOtherItem = item;
                        }
                    }
                }
                if (bestOtherItem != null && bestOtherScore > 0.25) {
                    bestL3 = bestOtherItem;
                    bestScore = bestOtherScore;
                    matchMethod = "其他兜底";
                }
            }

            boolean isMatched = bestScore >= 0.35;
            String finalL1 = isMatched ? bestL3.l1 : "未匹配";
            String finalL2 = isMatched ? bestL3.l2 : "未匹配";
            String finalL3 = isMatched ? bestL3.l3 : "未匹配";

            String status;
            if (isMatched && bestScore >= 0.65) status = "精准匹配";
            else if (isMatched && bestScore >= 0.45) status = "模糊匹配";
            else if (isMatched) status = "兜底匹配";
            else status = "匹配失败";

            MappingResult result = new MappingResult();
            result.systemCategoryId = sysCat.getCategoryId();
            result.systemCategoryName = oldL3Name;
            result.systemCategoryFullPath = sysCat.getFullPath();
            result.systemL1Name = oldL1Name;
            result.systemL2Name = oldL2Name;
            result.oldL3Name = oldL3Name;
            result.newL1Name = finalL1;
            result.newL2Name = finalL2;
            result.newL3Name = finalL3;
            result.score = bestScore;
            result.matchMethod = matchMethod;
            result.status = status;

            results.add(result);
        }

        List<MappingResult> matched = results.stream()
                .filter(m -> !"匹配失败".equals(m.status))
                .collect(Collectors.toList());
        applySemanticOverrides(matched, newL3Index);

        return results;
    }

    private List<ProductCategory> getSystemLeafCategories() {
        List<ProductCategory> allCategories = productCategoryRepository.findAll();
        Set<String> parentIds = allCategories.stream()
                .map(ProductCategory::getParentId)
                .filter(pid -> pid != null && !pid.isEmpty() && !"0".equals(pid))
                .collect(Collectors.toSet());
        return allCategories.stream()
                .filter(c -> !parentIds.contains(c.getCategoryId()))
                .collect(Collectors.toList());
    }

    private List<NewL3Item> buildProjectL3Index(String salesProjectId) {
        List<ProjectCategory> leafCategories = projectCategoryRepository.findBySalesProjectIdAndIsLeafTrue(salesProjectId);
        List<ProjectCategory> allProjectCategories = projectCategoryRepository.findBySalesProjectId(salesProjectId);
        Map<String, ProjectCategory> projectCatMap = allProjectCategories.stream()
                .collect(Collectors.toMap(ProjectCategory::getProjectCategoryId, c -> c, (a, b) -> a));

        List<NewL3Item> index = new ArrayList<>();
        for (ProjectCategory leaf : leafCategories) {
            NewL3Item item = new NewL3Item();
            item.l3 = leaf.getName();

            ProjectCategory parent = projectCatMap.get(leaf.getParentId());
            if (parent != null) {
                item.l2 = parent.getName();
                ProjectCategory grandParent = projectCatMap.get(parent.getParentId());
                if (grandParent != null) {
                    item.l1 = grandParent.getName();
                } else {
                    item.l1 = parent.getName();
                }
            } else {
                item.l2 = leaf.getName();
                item.l1 = leaf.getName();
            }
            index.add(item);
        }
        return index;
    }

    private CategoryMapping toEntity(MappingResult result, String salesProjectId) {
        CategoryMapping mapping = new CategoryMapping();
        mapping.setSystemCategoryId(result.systemCategoryId);
        mapping.setSystemCategoryName(result.systemCategoryName);
        mapping.setSystemCategoryFullPath(result.systemCategoryFullPath);
        mapping.setSystemCategoryLevel(3);
        mapping.setProjectCategoryName(result.newL3Name);
        mapping.setProjectCategoryFullPath(result.newL1Name + "/" + result.newL2Name + "/" + result.newL3Name);
        mapping.setSalesProjectId(salesProjectId);
        mapping.setMatchScore(String.format("%.3f", result.score));
        mapping.setMatchMethod(result.matchMethod);
        mapping.setMatchStatus(result.status);
        return mapping;
    }

    @Override
    public List<CategoryMapping> getMappings(String salesProjectId) {
        return mappingRepository.findBySalesProjectId(salesProjectId);
    }

    @Override
    @Transactional
    public List<CategoryMapping> autoMap(String salesProjectId, boolean useAi) {
        List<ProductCategory> systemLeafCategories = getSystemLeafCategories();
        List<NewL3Item> newL3Index = buildProjectL3Index(salesProjectId);

        List<ProductCategory> allCategories = productCategoryRepository.findAll();
        Map<String, ProductCategory> categoryMap = allCategories.stream()
                .collect(Collectors.toMap(ProductCategory::getCategoryId, c -> c, (a, b) -> a));

        List<MappingResult> mappingResults = performMapping(systemLeafCategories, newL3Index, categoryMap);

        mappingRepository.deleteBySalesProjectId(salesProjectId);
        mappingRepository.flush();

        List<ProjectCategory> projectCats = projectCategoryRepository.findBySalesProjectIdAndIsLeafTrue(salesProjectId);
        Map<String, ProjectCategory> projectCatByName = projectCats.stream()
                .collect(Collectors.toMap(ProjectCategory::getName, pc -> pc, (a, b) -> a));

        List<CategoryMapping> savedMappings = new ArrayList<>();
        for (MappingResult result : mappingResults) {
            if (!"匹配失败".equals(result.status)) {
                NewL3Item target = findByL3(newL3Index, result.newL3Name);
                if (target != null) {
                    ProjectCategory pc = projectCatByName.get(target.l3);
                    if (pc != null) {
                        CategoryMapping entity = toEntity(result, salesProjectId);
                        entity.setProjectCategoryId(pc.getProjectCategoryId());
                        entity.setProjectCategoryFullPath(pc.getFullPath());
                        savedMappings.add(entity);
                    }
                }
            } else {
                CategoryMapping entity = toEntity(result, salesProjectId);
                entity.setProjectCategoryId("0");
                entity.setProjectCategoryName("未匹配");
                entity.setProjectCategoryFullPath("未匹配");
                savedMappings.add(entity);
            }
        }

        savedMappings = mappingRepository.saveAll(savedMappings);

        if (useAi) {
            enhanceWithAi(savedMappings, salesProjectId, newL3Index);
        }

        return savedMappings;
    }

    /**
     * Enhance low-confidence mappings using AI.
     *
     * Only mappings with score < 0.65 or status "兜底匹配"/"模糊匹配" are sent to AI.
     * AI returns corrected target L3 categories, and mappings are updated in-place.
     * If AI is unavailable or errors occur, the method logs a warning and returns gracefully
     * — the algorithm-only results remain usable.
     */
    private void enhanceWithAi(List<CategoryMapping> mappings, String salesProjectId, List<NewL3Item> newL3Index) {
        if (aiProxyService == null) {
            log.info("AiProxyService not available, skipping AI enhancement");
            return;
        }

        // Filter low-confidence mappings
        List<CategoryMapping> lowConfidence = mappings.stream()
                .filter(m -> {
                    try {
                        double score = Double.parseDouble(m.getMatchScore() != null ? m.getMatchScore() : "0");
                        return score < 0.65 || "兜底匹配".equals(m.getMatchStatus())
                                || "模糊匹配".equals(m.getMatchStatus());
                    } catch (NumberFormatException e) {
                        return false;
                    }
                })
                .collect(Collectors.toList());

        if (lowConfidence.isEmpty()) {
            log.info("No low-confidence mappings to enhance with AI");
            return;
        }

        log.info("AI enhancing {} low-confidence mappings out of {} total", lowConfidence.size(), mappings.size());

        try {
            // Build available L3 category list
            List<String> projectL3Names = newL3Index.stream()
                    .map(item -> item.l3)
                    .distinct()
                    .collect(Collectors.toList());

            // Process in batches of 50 to avoid token limits
            int batchSize = 50;
            int enhanced = 0;

            for (int i = 0; i < lowConfidence.size(); i += batchSize) {
                int end = Math.min(i + batchSize, lowConfidence.size());
                List<CategoryMapping> batch = lowConfidence.subList(i, end);

                String prompt = buildAiEnhancePrompt(batch, projectL3Names);
                List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", "你是一个专业的电商类目映射专家，精通商品分类逻辑。只返回JSON格式结果，不要添加任何解释。"),
                    Map.of("role", "user", "content", prompt)
                );

                Map<String, Object> aiRequest = new HashMap<>();
                aiRequest.put("providerKey", "deepseek");
                aiRequest.put("model", "deepseek-chat");
                aiRequest.put("messages", messages);
                aiRequest.put("temperature", 0.1);
                aiRequest.put("max_tokens", 4096);

                Map<String, Object> aiResponse = aiProxyService.proxyChat(aiRequest);
                List<Map<String, Object>> corrections = parseAiCorrections(aiResponse);

                // Apply corrections
                for (Map<String, Object> correction : corrections) {
                    String systemName = (String) correction.get("systemCategoryName");
                    String newL3 = (String) correction.get("newL3");
                    if (systemName == null || newL3 == null || "无匹配".equals(newL3)) continue;

                    for (CategoryMapping m : batch) {
                        if (systemName.equals(m.getSystemCategoryName())) {
                            NewL3Item target = findByL3(newL3Index, newL3);
                            if (target != null) {
                                m.setProjectCategoryName(target.l3);
                                m.setProjectCategoryFullPath(target.l1 + "/" + target.l2 + "/" + target.l3);
                                m.setMatchScore("0.800");
                                m.setMatchMethod("AI推理");
                                m.setMatchStatus("AI匹配");
                                enhanced++;
                            }
                            break;
                        }
                    }
                }
            }

            log.info("AI enhancement completed: updated {} mappings", enhanced);
        } catch (Exception e) {
            log.warn("AI enhancement failed, using algorithm-only results. Error: {}", e.getMessage());
        }
    }

    /**
     * Build the AI prompt for mapping enhancement.
     *
     * Key improvements for high accuracy:
     * 1. Emphasize full-path context (L1 > L2 > L3), not just L3 name
     * 2. Use e-commerce domain knowledge for semantic matching
     * 3. Consider the category hierarchy when matching
     * 4. Provide concrete examples of correct matching logic
     */
    private String buildAiEnhancePrompt(List<CategoryMapping> lowConfidenceMappings, List<String> projectL3Names) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是电商类目映射专家。请为每条低置信度映射从【可选项目末级分类】中选出最匹配的分类。\n\n");

        sb.append("【可选项目末级分类】（共").append(projectL3Names.size()).append("个，仅能从中选择）\n");
        for (int i = 0; i < projectL3Names.size(); i++) {
            sb.append(i + 1).append(". ").append(projectL3Names.get(i)).append("\n");
        }

        sb.append("\n【需要重新映射的系统分类】（共").append(lowConfidenceMappings.size()).append("条）\n");
        for (int i = 0; i < lowConfidenceMappings.size(); i++) {
            CategoryMapping m = lowConfidenceMappings.get(i);
            String fullPath = m.getSystemCategoryFullPath() != null ? m.getSystemCategoryFullPath() : "";
            String[] parts = fullPath.split("/");
            String l1 = parts.length > 0 ? parts[0] : "";
            String l2 = parts.length > 1 ? parts[1] : "";
            String l3 = parts.length > 2 ? parts[2] : m.getSystemCategoryName();

            sb.append(i + 1).append(". ");
            sb.append("一级:").append(l1).append(" | 二级:").append(l2).append(" | 末级:").append(l3);
            sb.append(" | 当前映射→").append(m.getProjectCategoryName());
            sb.append(" | 得分:").append(m.getMatchScore());
            sb.append("\n");
        }

        sb.append("\n【匹配规则 - 请严格遵守】\n");
        sb.append("1. **全路径语义优先**：结合完整路径（一级/二级/末级）理解分类上下文。\n");
        sb.append("   正确：\"母婴宠物/服饰/婴儿袜\"→\"婴儿服饰及用品\"（非\"鞋袜\"）\n");
        sb.append("   正确：\"食品饮料/休闲零食/饼干\"→\"饼干糕点\"（非\"其他零食\"）\n");
        sb.append("   正确：\"家用电器/厨房电器/电饭煲\"→\"电饭煲/电压力锅\"（非\"其他电器\"）\n");
        sb.append("   正确：\"美容护肤/面部护理/洗面奶\"→\"洁面/卸妆\"（非\"精华水/乳液/面霜\"）\n");
        sb.append("2. **大类优先匹配**：优先将L1大类相同或相近的匹配在一起。\n");
        sb.append("   母婴→母婴 | 食品→食品 | 电器→电器 | 美妆→美妆 | 家居→家居\n");
        sb.append("3. **品类语义匹配**：理解商品真实用途。\n");
        sb.append("   \"炭包/净化剂\"→家居净化→\"装饰/香氛\" | \"电动牙刷\"→\"电动牙刷/冲牙器\"\n");
        sb.append("4. **就近匹配**：找不到精确匹配时选语义最接近的。\n");
        sb.append("5. **已有正确映射不修改**，无法匹配的标记\"无匹配\"。\n");

        sb.append("\n请严格返回JSON数组（不要加```json标记，只返回纯JSON数组）：\n");
        sb.append("[\n");
        sb.append("  {\"systemCategoryName\": \"系统末级分类名\", \"newL3\": \"选中的项目末级分类\"},\n");
        sb.append("  ...\n");
        sb.append("]\n");

        return sb.toString();
    }

    /**
     * Parse AI response to extract mapping corrections.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseAiCorrections(Map<String, Object> aiResponse) {
        try {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) aiResponse.get("choices");
            if (choices == null || choices.isEmpty()) return Collections.emptyList();

            Map<String, Object> choice = choices.get(0);
            Map<String, Object> message = (Map<String, Object>) choice.get("message");
            String content = (String) message.get("content");
            if (content == null || content.isBlank()) {
                content = (String) message.get("reasoning_content");
            }
            if (content == null || content.isBlank()) return Collections.emptyList();

            // Extract JSON array from content
            String cleaned = content.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```\\s*$", "").trim();
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\[[\\s\\S]*\\]").matcher(cleaned);
            String jsonStr = matcher.find() ? matcher.group() : cleaned;

            return objectMapper.readValue(jsonStr, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse AI corrections: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    @Transactional
    public CategoryMapping createManualMapping(CategoryMapping mapping) {
        List<CategoryMapping> existing = mappingRepository.findBySalesProjectIdAndSystemCategoryId(
                mapping.getSalesProjectId(), mapping.getSystemCategoryId());
        if (!existing.isEmpty()) {
            throw new RuntimeException("该系统分类已存在映射，请使用编辑功能修改");
        }
        return mappingRepository.save(mapping);
    }

    @Override
    @Transactional
    public CategoryMapping updateMapping(Long id, CategoryMapping mapping) {
        CategoryMapping existing = mappingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("映射记录不存在"));

        if (mapping.getSystemCategoryId() != null && !mapping.getSystemCategoryId().equals(existing.getSystemCategoryId())) {
            List<CategoryMapping> duplicates = mappingRepository.findBySalesProjectIdAndSystemCategoryId(
                    existing.getSalesProjectId(), mapping.getSystemCategoryId());
            for (CategoryMapping dup : duplicates) {
                if (!dup.getId().equals(id)) {
                    throw new RuntimeException("该系统分类已映射到其他项目分类");
                }
            }
        }

        if (mapping.getSystemCategoryId() != null) existing.setSystemCategoryId(mapping.getSystemCategoryId());
        if (mapping.getSystemCategoryName() != null) existing.setSystemCategoryName(mapping.getSystemCategoryName());
        if (mapping.getSystemCategoryFullPath() != null) existing.setSystemCategoryFullPath(mapping.getSystemCategoryFullPath());
        if (mapping.getSystemCategoryLevel() != null) existing.setSystemCategoryLevel(mapping.getSystemCategoryLevel());
        if (mapping.getProjectCategoryId() != null) existing.setProjectCategoryId(mapping.getProjectCategoryId());
        if (mapping.getProjectCategoryName() != null) existing.setProjectCategoryName(mapping.getProjectCategoryName());
        if (mapping.getProjectCategoryFullPath() != null) existing.setProjectCategoryFullPath(mapping.getProjectCategoryFullPath());
        if (mapping.getMatchScore() != null) existing.setMatchScore(mapping.getMatchScore());
        if (mapping.getMatchMethod() != null) existing.setMatchMethod(mapping.getMatchMethod());
        if (mapping.getMatchStatus() != null) existing.setMatchStatus(mapping.getMatchStatus());

        return mappingRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteMapping(Long id) {
        mappingRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void batchSave(String salesProjectId, List<CategoryMapping> mappings) {
        mappingRepository.deleteBySalesProjectId(salesProjectId);
        mappingRepository.flush();
        for (CategoryMapping mapping : mappings) {
            mapping.setSalesProjectId(salesProjectId);
            mapping.setId(null);
            mappingRepository.save(mapping);
        }
    }

    @Override
    @Transactional
    public List<CategoryMapping> reCompare(String salesProjectId, boolean useAi) {
        List<CategoryMapping> existingMappings = mappingRepository.findBySalesProjectId(salesProjectId);
        List<ProductCategory> currentSystemLeaves = getSystemLeafCategories();
        List<NewL3Item> newL3Index = buildProjectL3Index(salesProjectId);

        Map<String, CategoryMapping> existingBySystemId = existingMappings.stream()
                .collect(Collectors.toMap(CategoryMapping::getSystemCategoryId, m -> m, (a, b) -> a));

        Set<String> currentSystemIds = currentSystemLeaves.stream()
                .map(ProductCategory::getCategoryId)
                .collect(Collectors.toSet());

        Set<String> currentProjectL3Names = newL3Index.stream()
                .map(item -> item.l3)
                .collect(Collectors.toSet());

        List<CategoryMapping> result = new ArrayList<>();

        for (CategoryMapping existing : existingMappings) {
            if (!currentSystemIds.contains(existing.getSystemCategoryId())) {
                existing.setMatchStatus("分类已删除");
                existing.setMatchMethod("系统分类已移除");
                result.add(mappingRepository.save(existing));
                continue;
            }
            if (!currentProjectL3Names.contains(existing.getProjectCategoryName())) {
                existing.setMatchStatus("项目分类已移除");
                existing.setMatchMethod("项目分类不存在");
                result.add(mappingRepository.save(existing));
                continue;
            }
            result.add(existing);
        }

        List<ProductCategory> allCategories = productCategoryRepository.findAll();
        Map<String, ProductCategory> categoryMap = allCategories.stream()
                .collect(Collectors.toMap(ProductCategory::getCategoryId, c -> c, (a, b) -> a));

        List<ProductCategory> newSystemLeaves = currentSystemLeaves.stream()
                .filter(c -> !existingBySystemId.containsKey(c.getCategoryId()))
                .collect(Collectors.toList());

        if (!newSystemLeaves.isEmpty()) {
            List<MappingResult> newResults = performMapping(newSystemLeaves, newL3Index, categoryMap);

            // Hoist: query leaf project categories once, not per result
            List<ProjectCategory> projectCats = projectCategoryRepository
                    .findBySalesProjectIdAndIsLeafTrue(salesProjectId);
            Map<String, ProjectCategory> projectCatByName = projectCats.stream()
                    .collect(Collectors.toMap(ProjectCategory::getName, pc -> pc, (a, b) -> a));

            for (MappingResult mr : newResults) {
                if (!"匹配失败".equals(mr.status)) {
                    NewL3Item target = findByL3(newL3Index, mr.newL3Name);
                    if (target != null) {
                        ProjectCategory pc = projectCatByName.get(target.l3);
                        if (pc != null) {
                            CategoryMapping entity = toEntity(mr, salesProjectId);
                            entity.setProjectCategoryId(pc.getProjectCategoryId());
                            entity.setProjectCategoryFullPath(pc.getFullPath());
                            result.add(mappingRepository.save(entity));
                        }
                    }
                } else {
                    CategoryMapping entity = toEntity(mr, salesProjectId);
                    entity.setProjectCategoryId("0");
                    entity.setProjectCategoryName("未匹配");
                    entity.setProjectCategoryFullPath("未匹配");
                    result.add(mappingRepository.save(entity));
                }
            }
        }

        if (useAi) {
            enhanceWithAi(result, salesProjectId, newL3Index);
        }

        return result;
    }
}
