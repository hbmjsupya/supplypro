package com.supplypro.controller;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/platform-pending-orders")
@CrossOrigin(origins = "*")
public class PlatformPendingOrderController {

    private static final Logger logger = LoggerFactory.getLogger(PlatformPendingOrderController.class);

    @Autowired
    private PlatformPendingOrderRepository platformPendingOrderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private SkuRepository skuRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String orderType,
            @RequestParam(required = false) String costType) {
        
        Page<PlatformPendingOrder> pageResult;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("id").descending());
        
        if (status != null && !status.isEmpty()) {
            PlatformPendingOrder.Status orderStatus = PlatformPendingOrder.Status.valueOf(status);
            pageResult = platformPendingOrderRepository.findByStatus(orderStatus, pageRequest);
        } else {
            pageResult = platformPendingOrderRepository.findAll(pageRequest);
        }
        
        List<Map<String, Object>> records = new ArrayList<>();
        for (PlatformPendingOrder order : pageResult.getContent()) {
            records.add(convertToMap(order));
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
            "records", records,
            "totalElements", pageResult.getTotalElements(),
            "totalPages", pageResult.getTotalPages(),
            "currentPage", page
        ));
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        Optional<PlatformPendingOrder> orderOpt = platformPendingOrderRepository.findById(id);
        
        if (orderOpt.isEmpty()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 404);
            errorResponse.put("message", "订单不存在");
            return ResponseEntity.status(404).body(errorResponse);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", convertToMap(orderOpt.get()));
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> payload) {
        try {
            PlatformPendingOrder order = new PlatformPendingOrder();
            
            order.setOrderNo(generateOrderNo());
            
            if (payload.get("orderType") != null) {
                order.setOrderType(PlatformPendingOrder.OrderType.valueOf(payload.get("orderType").toString()));
            } else {
                order.setOrderType(PlatformPendingOrder.OrderType.OrderPurchase);
            }
            
            order.setBizNo((String) payload.get("bizNo"));
            order.setThirdPartyNo((String) payload.get("thirdPartyNo"));
            order.setPlatformName((String) payload.get("platformName"));
            order.setPlatformOrderNo((String) payload.get("platformOrderNo"));
            
            if (payload.get("productId") != null) {
                Long productId = Long.valueOf(payload.get("productId").toString());
                Product product = productRepository.findById(productId).orElse(null);
                if (product != null) {
                    order.setProduct(product);
                }
            }
            
            order.setProductName((String) payload.get("productName"));
            order.setSpecName((String) payload.get("specName"));
            order.setQuantity(payload.get("quantity") != null ? Integer.valueOf(payload.get("quantity").toString()) : 1);
            
            if (payload.get("cost") != null) {
                order.setCost(new BigDecimal(payload.get("cost").toString()));
            }
            
            if (payload.get("supplierId") != null) {
                Long supplierId = Long.valueOf(payload.get("supplierId").toString());
                Supplier supplier = supplierRepository.findById(supplierId).orElse(null);
                if (supplier != null) {
                    order.setSupplier(supplier);
                }
            }
            
            order.setSupplierName((String) payload.get("supplierName"));
            order.setReceiver((String) payload.get("receiver"));
            order.setReceiverPhone((String) payload.get("receiverPhone"));
            order.setAddress((String) payload.get("address"));
            order.setProjectName((String) payload.get("projectName"));
            
            if (payload.get("costType") != null) {
                order.setCostType(PlatformPendingOrder.CostType.valueOf(payload.get("costType").toString()));
            } else {
                order.setCostType(PlatformPendingOrder.CostType.Platform);
            }
            
            if (payload.get("expectedReceiveTime") != null) {
                order.setExpectedReceiveTime(LocalDateTime.parse(payload.get("expectedReceiveTime").toString()));
            }
            
            order.setOrderRemark((String) payload.get("orderRemark"));
            
            PlatformPendingOrder saved = platformPendingOrderRepository.save(order);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "创建成功");
            response.put("data", convertToMap(saved));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("创建平台待确认订单失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "创建失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Optional<PlatformPendingOrder> orderOpt = platformPendingOrderRepository.findById(id);
            
            if (orderOpt.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 404);
                errorResponse.put("message", "订单不存在");
                return ResponseEntity.status(404).body(errorResponse);
            }
            
            PlatformPendingOrder order = orderOpt.get();
            
            if (payload.get("supplierId") != null) {
                Long supplierId = Long.valueOf(payload.get("supplierId").toString());
                Supplier supplier = supplierRepository.findById(supplierId).orElse(null);
                if (supplier != null) {
                    order.setSupplier(supplier);
                }
            }
            
            if (payload.get("cost") != null) {
                order.setCost(new BigDecimal(payload.get("cost").toString()));
            }
            
            if (payload.get("status") != null) {
                order.setStatus(PlatformPendingOrder.Status.valueOf(payload.get("status").toString()));
            }
            
            order.setUpdatedAt(LocalDateTime.now());
            
            PlatformPendingOrder saved = platformPendingOrderRepository.save(order);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "更新成功");
            response.put("data", convertToMap(saved));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("更新平台待确认订单失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        try {
            if (!platformPendingOrderRepository.existsById(id)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 404);
                errorResponse.put("message", "订单不存在");
                return ResponseEntity.status(404).body(errorResponse);
            }
            
            platformPendingOrderRepository.deleteById(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "删除成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("删除平台待确认订单失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable Long id) {
        try {
            Optional<PlatformPendingOrder> orderOpt = platformPendingOrderRepository.findById(id);
            
            if (orderOpt.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 404);
                errorResponse.put("message", "订单不存在");
                return ResponseEntity.status(404).body(errorResponse);
            }
            
            PlatformPendingOrder order = orderOpt.get();
            order.setStatus(PlatformPendingOrder.Status.CONFIRMED);
            order.setUpdatedAt(LocalDateTime.now());
            
            platformPendingOrderRepository.save(order);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "确认成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("确认平台待确认订单失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "确认失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> payload) {
        try {
            Optional<PlatformPendingOrder> orderOpt = platformPendingOrderRepository.findById(id);
            
            if (orderOpt.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 404);
                errorResponse.put("message", "订单不存在");
                return ResponseEntity.status(404).body(errorResponse);
            }
            
            PlatformPendingOrder order = orderOpt.get();
            order.setStatus(PlatformPendingOrder.Status.REJECTED);
            order.setUpdatedAt(LocalDateTime.now());
            
            if (payload != null && payload.get("reason") != null) {
                order.setOrderRemark((String) payload.get("reason"));
            }
            
            platformPendingOrderRepository.save(order);
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "驳回成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("驳回平台待确认订单失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "驳回失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/generate-mock-data")
    public ResponseEntity<Map<String, Object>> generateMockData() {
        try {
            generateMockOrders();
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "模拟数据生成成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("生成模拟数据失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "生成模拟数据失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/regenerate-mock-data")
    public ResponseEntity<Map<String, Object>> regenerateMockData() {
        try {
            logger.info("清除现有平台待确认订单数据...");
            platformPendingOrderRepository.deleteAll();
            
            logger.info("重新生成符合规范的数据...");
            generateMockOrders();
            
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "数据重新生成成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("重新生成模拟数据失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "重新生成模拟数据失败: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    private Map<String, Object> convertToMap(PlatformPendingOrder order) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", order.getId());
        map.put("orderNo", order.getOrderNo());
        map.put("orderType", order.getOrderType() != null ? order.getOrderType().name() : null);
        map.put("bizNo", order.getBizNo());
        map.put("thirdPartyNo", order.getThirdPartyNo());
        map.put("platformName", order.getPlatformName());
        map.put("platformOrderNo", order.getPlatformOrderNo());
        map.put("productId", order.getProductId());
        map.put("skuId", order.getSkuId());
        map.put("productName", order.getProductName());
        map.put("specName", order.getSpecName());
        map.put("quantity", order.getQuantity());
        map.put("cost", order.getCost());
        map.put("totalCost", order.getTotalCost());
        map.put("supplierId", order.getSupplierId());
        map.put("supplierName", order.getSupplierName());
        map.put("receiver", order.getReceiver());
        map.put("receiverPhone", order.getReceiverPhone());
        map.put("address", order.getAddress());
        map.put("projectName", order.getProjectName());
        map.put("costType", order.getCostType() != null ? order.getCostType().name() : null);
        map.put("expectedReceiveTime", order.getExpectedReceiveTime());
        map.put("orderRemark", order.getOrderRemark());
        map.put("status", order.getStatus() != null ? order.getStatus().name() : null);
        map.put("createdAt", order.getCreatedAt());
        map.put("updatedAt", order.getUpdatedAt());
        
        if (order.getProduct() != null) {
            Map<String, Object> productMap = new HashMap<>();
            productMap.put("id", order.getProduct().getId());
            productMap.put("name", order.getProduct().getName());
            map.put("product", productMap);
        }
        
        if (order.getSupplier() != null) {
            Map<String, Object> supplierMap = new HashMap<>();
            supplierMap.put("id", order.getSupplier().getId());
            supplierMap.put("name", order.getSupplier().getName());
            map.put("supplier", supplierMap);
        }
        
        if (order.getSku() != null) {
            Map<String, Object> skuMap = new HashMap<>();
            skuMap.put("id", order.getSku().getId());
            skuMap.put("name", order.getSku().getName());
            skuMap.put("specification", order.getSku().getSpecification());
            map.put("sku", skuMap);
        }
        
        return map;
    }

    private String generateOrderNo() {
        return "ORD" + System.currentTimeMillis();
    }

    private void generateMockOrders() {
        List<Product> allProducts = productRepository.findAll();
        
        // 过滤掉组合商品（有bundleItems的），只保留普通商品
        List<Product> normalProducts = allProducts.stream()
            .filter(p -> p.getBundleItems() == null || p.getBundleItems().isEmpty())
            .collect(java.util.stream.Collectors.toList());
        
        // 收集所有有成本价的SKU（规格参数可以为空，使用name代替）
        List<Sku> validSkus = new ArrayList<>();
        for (Product product : normalProducts) {
            List<Sku> skus = skuRepository.findByProductId(product.getId());
            for (Sku sku : skus) {
                // 只需要有成本价即可，规格参数可以为空（使用name代替）
                if (sku.getCostPrice() != null && sku.getCostPrice().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    validSkus.add(sku);
                }
            }
        }
        
        if (validSkus.isEmpty()) {
            logger.warn("没有符合条件的商品规格（需要有成本价），无法生成模拟订单");
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
        
        int orderCount = 50;
        
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
            // 规格名称：优先使用specification，如果为空则使用sku.name
            String specName = (sku.getSpecification() != null && !sku.getSpecification().isEmpty()) 
                ? sku.getSpecification() : sku.getName();
            order.setSpecName(specName);
            
            // 从SKU获取成本价
            java.math.BigDecimal costPrice = sku.getCostPrice();
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
}
