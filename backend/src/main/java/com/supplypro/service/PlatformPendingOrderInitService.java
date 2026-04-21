package com.supplypro.service;

import com.supplypro.entity.PlatformPendingOrder;
import com.supplypro.entity.Product;
import com.supplypro.entity.Sku;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PlatformPendingOrderRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.SkuRepository;
import com.supplypro.repository.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class PlatformPendingOrderInitService {

    private static final Logger logger = LoggerFactory.getLogger(PlatformPendingOrderInitService.class);

    @Autowired
    private PlatformPendingOrderRepository platformPendingOrderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private SkuRepository skuRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initMockData() {
        long existingCount = platformPendingOrderRepository.count();
        if (existingCount > 0) {
            logger.info("平台待确认订单已存在 {} 条，跳过初始化", existingCount);
            return;
        }

        logger.info("开始初始化平台待确认订单模拟数据...");
        generateMockOrders();
        logger.info("平台待确认订单模拟数据初始化完成");
    }

    private void generateMockOrders() {
        List<Product> allProducts = productRepository.findAll();

        // 过滤掉组合商品（有bundleItems的），只保留普通商品
        List<Product> normalProducts = allProducts.stream()
            .filter(p -> p.getBundleItems() == null || p.getBundleItems().isEmpty())
            .collect(Collectors.toList());

        // 收集所有有规格参数的SKU
        List<Sku> validSkus = new ArrayList<>();
        for (Product product : normalProducts) {
            List<Sku> skus = skuRepository.findByProductId(product.getId());
            // 只选择有规格参数且有成本价的SKU
            for (Sku sku : skus) {
                if (sku.getSpecification() != null && !sku.getSpecification().isEmpty() 
                    && sku.getCostPrice() != null && sku.getCostPrice().compareTo(BigDecimal.ZERO) > 0) {
                    validSkus.add(sku);
                }
            }
        }

        if (validSkus.isEmpty()) {
            logger.warn("没有符合条件的商品规格（需要有规格参数、成本价），无法生成模拟订单");
            return;
        }

        logger.info("找到 {} 个符合条件的商品规格", validSkus.size());

        Random random = new Random();
        String[] receivers = {"张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十"};
        String[] phones = {"13800138001", "13800138002", "13800138003", "13800138004", "13800138005", 
                          "13900139001", "13900139002", "13900139003"};
        String[] addresses = {
            "北京市朝阳区建国路88号",
            "上海市浦东新区陆家嘴环路1000号",
            "广州市天河区天河路385号",
            "深圳市南山区科技园南区",
            "杭州市西湖区文三路398号",
            "成都市高新区天府大道北段1700号",
            "南京市鼓楼区中山北路30号",
            "武汉市江汉区解放大道688号"
        };
        String[] projects = {"项目A", "项目B", "项目C", "项目D", "项目E", null, null, null};
        String[] platforms = {"京东", "淘宝", "拼多多", "抖音", "快手", null, null};
        String[] remarks = {"加急", "常规", "批量采购", "样品采购", null, null, null};

        int orderCount = 15;
        
        for (int i = 0; i < orderCount; i++) {
            PlatformPendingOrder order = new PlatformPendingOrder();
            
            order.setOrderNo("ORD" + (System.currentTimeMillis() + i));
            
            boolean isOrderPurchase = random.nextBoolean();
            order.setOrderType(isOrderPurchase ? 
                PlatformPendingOrder.OrderType.OrderPurchase : 
                PlatformPendingOrder.OrderType.Replenishment);
            
            // 从符合条件的SKU中随机选择
            Sku sku = validSkus.get(random.nextInt(validSkus.size()));
            Product product = sku.getProduct();
            
            order.setProduct(product);
            order.setSku(sku);
            order.setSpecName(sku.getSpecification());
            
            // 从SKU获取成本价
            BigDecimal costPrice = sku.getCostPrice();
            order.setCost(costPrice);
            
            // 从SKU获取供应商
            Supplier supplier = sku.getSupplier();
            if (supplier != null) {
                order.setSupplier(supplier);
            }
            
            order.setQuantity(random.nextInt(20) + 1);
            
            int idx = random.nextInt(receivers.length);
            order.setReceiver(receivers[idx]);
            order.setReceiverPhone(phones[idx]);
            order.setAddress(addresses[idx]);
            
            String project = projects[random.nextInt(projects.length)];
            if (project != null) {
                order.setProjectName(project);
            }
            
            boolean isPlatform = random.nextDouble() < 0.7;
            order.setCostType(isPlatform ? 
                PlatformPendingOrder.CostType.Platform : 
                PlatformPendingOrder.CostType.Supplier);
            
            if (random.nextDouble() < 0.6) {
                String platform = platforms[random.nextInt(platforms.length)];
                if (platform != null) {
                    order.setPlatformName(platform);
                    order.setPlatformOrderNo("PO" + System.currentTimeMillis() + i);
                }
            }
            
            order.setExpectedReceiveTime(LocalDateTime.now().plusDays(random.nextInt(14) + 1));
            
            String remark = remarks[random.nextInt(remarks.length)];
            if (remark != null) {
                order.setOrderRemark(remark);
            }
            
            order.setBizNo("BIZ" + (System.currentTimeMillis() + i));
            order.setThirdPartyNo("TP" + (System.currentTimeMillis() + i));
            
            platformPendingOrderRepository.save(order);
        }
        
        logger.info("已生成 {} 条模拟平台待确认订单", orderCount);
    }

    public void regenerateMockData() {
        logger.info("清除现有平台待确认订单数据...");
        platformPendingOrderRepository.deleteAll();
        
        logger.info("重新生成模拟数据...");
        generateMockOrders();
    }
}
