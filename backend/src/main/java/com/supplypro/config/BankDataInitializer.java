package com.supplypro.config;

import com.supplypro.entity.Bank;
import com.supplypro.repository.BankRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(1)
public class BankDataInitializer implements CommandLineRunner {

    @Autowired
    private BankRepository bankRepository;

    @Override
    public void run(String... args) throws Exception {
        if (bankRepository.count() > 0) {
            log.info("Bank data already exists, skipping initialization");
            return;
        }

        log.info("Starting Bank Data Initialization...");
        List<Bank> banks = new ArrayList<>();

        banks.add(createBank("102100099996", "中国工商银行股份有限公司", "工商银行",
            Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "西城区", "北京市西城区复兴门内大街55号", "95588", "ICBKCNBJ"));

        banks.add(createBank("103100099992", "中国农业银行股份有限公司", "农业银行",
            Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "东城区", "北京市东城区建国门内大街69号", "95599", "ABOCCNBJ"));

        banks.add(createBank("104100000004", "中国银行股份有限公司", "中国银行",
            Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "西城区", "北京市西城区复兴门内大街1号", "95566", "BKCHCNBJ"));

        banks.add(createBank("105100000017", "中国建设银行股份有限公司", "建设银行",
            Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "西城区", "北京市西城区金融大街25号", "95533", "PCBCCNBJ"));

        banks.add(createBank("301290000007", "交通银行股份有限公司", "交通银行",
            Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE,
            "上海", "上海", "浦东新区", "上海市浦东新区银城中路188号", "95559", "COMMCN"));

        banks.add(createBank("403100000004", "中国邮政储蓄银行股份有限公司", "邮储银行",
            Bank.BankType.STATE_OWNED, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "西城区", "北京市西城区金融大街3号", "95580", "PSBCCNBJ"));

        banks.add(createBank("308584000013", "招商银行股份有限公司", "招商银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "广东", "深圳", "福田区", "深圳市福田区深南大道7088号", "95555", "CMBCCNBS"));

        banks.add(createBank("310290000013", "上海浦东发展银行股份有限公司", "浦发银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "上海", "上海", "黄浦区", "上海市黄浦区中山东一路12号", "95528", "SPDBCNSH"));

        banks.add(createBank("302100011000", "中信银行股份有限公司", "中信银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "东城区", "北京市东城区朝阳门北大街9号", "95558", "CIBKCNBJ"));

        banks.add(createBank("309391000011", "兴业银行股份有限公司", "兴业银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "福建", "福州", "鼓楼区", "福州市鼓楼区湖东路154号", "95561", "FJIBCNBA"));

        banks.add(createBank("305100000013", "中国民生银行股份有限公司", "民生银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "西城区", "北京市西城区复兴门内大街2号", "95568", "MSBCCNBJ"));

        banks.add(createBank("303100000006", "中国光大银行股份有限公司", "光大银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "西城区", "北京市西城区太平桥大街25号", "95595", "EVERCNBJ"));

        banks.add(createBank("307584007998", "平安银行股份有限公司", "平安银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "广东", "深圳", "福田区", "深圳市福田区益田路5023号", "95511", "SZDBCNBS"));

        banks.add(createBank("304100040000", "华夏银行股份有限公司", "华夏银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "东城区", "北京市东城区建国门内大街22号", "95577", "HXBKCN"));

        banks.add(createBank("306581000003", "广发银行股份有限公司", "广发银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "广东", "广州", "越秀区", "广州市越秀区东风东路713号", "95508", "GZBCCN2A"));

        banks.add(createBank("313100000013", "浙商银行股份有限公司", "浙商银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "浙江", "杭州", "拱墅区", "杭州市拱墅区庆春路288号", "95527", "ZJCBCN2N"));

        banks.add(createBank("313110000014", "渤海银行股份有限公司", "渤海银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "天津", "天津", "河西区", "天津市河西区马场道188号", "95541", "BHABCN22"));

        banks.add(createBank("313100000016", "恒丰银行股份有限公司", "恒丰银行",
            Bank.BankType.JOINT_STOCK, Bank.BankLevel.HEAD_OFFICE,
            "山东", "烟台", "芝罘区", "烟台市芝罘区南大街248号", "95568", "HFBACNBS"));

        banks.add(createBank("313301080010", "北京银行股份有限公司", "北京银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "北京", "北京", "西城区", "北京市西城区金融大街丙17号", "95526", "BJCNCNBJ"));

        banks.add(createBank("313290000013", "上海银行股份有限公司", "上海银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "上海", "上海", "浦东新区", "上海市浦东新区银城中路168号", "95594", "BOSHCNSH"));

        banks.add(createBank("313584000013", "江苏银行股份有限公司", "江苏银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "江苏", "南京", "玄武区", "南京市玄武区中山路288号", "95319", "BOJSCNBN"));

        banks.add(createBank("313301070012", "杭州银行股份有限公司", "杭州银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "浙江", "杭州", "上城区", "杭州市上城区庆春路46号", "95523", "HZCBCN2H"));

        banks.add(createBank("313587000012", "宁波银行股份有限公司", "宁波银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "浙江", "宁波", "鄞州区", "宁波市鄞州区宁南南路700号", "95574", "BKNBCN2N"));

        banks.add(createBank("313443000011", "南京银行股份有限公司", "南京银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "江苏", "南京", "玄武区", "南京市玄武区中山路286号", "95507", "NJCBCN2N"));

        banks.add(createBank("313658000011", "成都银行股份有限公司", "成都银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "四川", "成都", "青羊区", "成都市青羊区西御街16号", "95507", "BOCDCNBD"));

        banks.add(createBank("313403088888", "长沙银行股份有限公司", "长沙银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "湖南", "长沙", "岳麓区", "长沙市岳麓区滨江路53号", "96511", "CSCBCN2C"));

        banks.add(createBank("313591000013", "重庆银行股份有限公司", "重庆银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "重庆", "重庆", "江北区", "重庆市江北区永平门街6号", "96899", "CQCBCN2Q"));

        banks.add(createBank("313421099996", "广州银行股份有限公司", "广州银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "广东", "广州", "天河区", "广州市天河区珠江东路30号", "96699", "GZCBCN22"));

        banks.add(createBank("313302000011", "天津银行股份有限公司", "天津银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "天津", "天津", "河西区", "天津市河西区友谊路15号", "960296", "TJCBCNBT"));

        banks.add(createBank("314305000011", "哈尔滨银行股份有限公司", "哈尔滨银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "黑龙江", "哈尔滨", "道里区", "哈尔滨市道里区尚志大街160号", "95537", "HRBBCNBH"));

        banks.add(createBank("314582000011", "盛京银行股份有限公司", "盛京银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "辽宁", "沈阳", "沈河区", "沈阳市沈河区北站路109号", "96666", "SJCBCNBS"));

        banks.add(createBank("314584000013", "大连银行股份有限公司", "大连银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "辽宁", "大连", "中山区", "大连市中山区中山路88号", "4006640066", "DLBCCNBD"));

        banks.add(createBank("314305000014", "齐商银行股份有限公司", "齐商银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "淄博", "张店区", "淄博市张店区中心路105号", "96588", "QSBCNBQ"));

        banks.add(createBank("314305000015", "潍坊银行股份有限公司", "潍坊银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "潍坊", "奎文区", "潍坊市奎文区胜利东街5151号", "96568", "WFBCN2W"));

        banks.add(createBank("314305000016", "威海市商业银行股份有限公司", "威海市商业银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "威海", "环翠区", "威海市环翠区宝泉路6号", "96666", "WHBCN2W"));

        banks.add(createBank("314305000017", "德州银行股份有限公司", "德州银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "德州", "德城区", "德州市德城区东风中路1188号", "96588", "DZBCNBD"));

        banks.add(createBank("314305000018", "济宁银行股份有限公司", "济宁银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "济宁", "任城区", "济宁市任城区金宇路6号", "96588", "JNBCNBJ"));

        banks.add(createBank("314305000019", "泰安银行股份有限公司", "泰安银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "泰安", "泰山区", "泰安市泰山区擂鼓石大街西段", "96588", "TABCNBT"));

        banks.add(createBank("314305000020", "临沂银行股份有限公司", "临沂银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "临沂", "兰山区", "临沂市兰山区沂蒙路338号", "96588", "LYBCNBL"));

        banks.add(createBank("314305000021", "日照银行股份有限公司", "日照银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "日照", "东港区", "日照市东港区烟台路197号", "96588", "RZBCNBR"));

        banks.add(createBank("314305000022", "莱商银行股份有限公司", "莱商银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "莱芜", "莱城区", "济南市历下区经十路13777号", "96588", "LSBCNBL"));

        banks.add(createBank("314305000023", "枣庄银行股份有限公司", "枣庄银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "枣庄", "市中区", "枣庄市市中区光明大道1666号", "96588", "ZZBCNBZ"));

        banks.add(createBank("314305000024", "东营银行股份有限公司", "东营银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "东营", "东营区", "东营市东营区庐山路108号", "96588", "DYBCNBD"));

        banks.add(createBank("314305000025", "烟台银行股份有限公司", "烟台银行",
            Bank.BankType.CITY_COMMERCIAL, Bank.BankLevel.HEAD_OFFICE,
            "山东", "烟台", "芝罘区", "烟台市芝罘区海港路25号", "96588", "YTBCNBY"));

        bankRepository.saveAll(banks);
        log.info("Bank Data Initialization Completed. Total banks: {}", banks.size());
    }

    private Bank createBank(String bankCode, String name, String shortName,
                            Bank.BankType type, Bank.BankLevel level,
                            String province, String city, String district,
                            String address, String phone, String swiftCode) {
        Bank bank = new Bank();
        bank.setBankCode(bankCode);
        bank.setName(name);
        bank.setShortName(shortName);
        bank.setType(type);
        bank.setLevel(level);
        bank.setProvince(province);
        bank.setCity(city);
        bank.setDistrict(district);
        bank.setAddress(address);
        bank.setPhone(phone);
        bank.setSwiftCode(swiftCode);
        bank.setStatus(true);
        return bank;
    }
}
