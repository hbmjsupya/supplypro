package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.RefundOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.RefundOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.SupplierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.RedisTemplate;
import java.util.concurrent.TimeUnit;
import java.time.format.DateTimeFormatter;

@Service
public class SettlementService {
    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private SupplierRepository supplierRepository;
    
    @Autowired
    private RefundOrderRepository refundOrderRepository;

    @Autowired
    private SupplierFinanceService supplierFinanceService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private com.supplypro.repository.LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private com.supplypro.repository.SupplierAccountRepository supplierAccountRepository;

    public synchronized String generateSettlementNo() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        String dateStr = DateTimeFormatter.ofPattern("yyyyMMddHHmm").format(now);
        String key = "settlement_seq:" + dateStr;
        
        for (int i = 0; i < 50; i++) {
            Long seq = null;
            try {
                seq = redisTemplate.opsForValue().increment(key);
            } catch (Exception e) {
                // Redis 连接失败，使用数据库回退
            }
            
            if (seq == null) {
                seq = getNextSeqFromDb(dateStr);
            }
            
            if (seq == 1) {
                redisTemplate.expire(key, 10, TimeUnit.MINUTES);
            }
            
            if (seq > 999) {
                 throw new RuntimeException("Settlement Order sequence limit (999) exceeded for current minute.");
            }
            
            String seqStr = String.format("%03d", seq);
            String candidateNo = "JS" + dateStr + seqStr;
            
            if (settlementOrderRepository.findBySettlementNo(candidateNo) == null) {
                return candidateNo;
            }
        }
         throw new RuntimeException("Failed to generate unique Settlement Order Number after 50 retries.");
    }
    
    private long getNextSeqFromDb(String dateStr) {
        String prefix = "JS" + dateStr;
        Long maxSeq = settlementOrderRepository.findMaxSequenceByPrefix(prefix);
        return (maxSeq != null ? maxSeq : 0) + 1;
    }
    
    private long getNextDeliverySeqFromDb(String dateStr) {
        String prefix = "PS" + dateStr;
        Long maxSeq = settlementOrderRepository.findMaxDeliverySequenceByPrefix(prefix);
        return (maxSeq != null ? maxSeq : 0) + 1;
    }
    
    public synchronized String generateDeliveryNo() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        String dateStr = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(now);
        String key = "delivery_seq:" + dateStr;
        
        for (int i = 0; i < 50; i++) {
            Long seq = redisTemplate.opsForValue().increment(key);
            
            if (seq == null) {
                seq = getNextDeliverySeqFromDb(dateStr);
            }
            
            if (seq == 1) {
                redisTemplate.expire(key, 10, TimeUnit.MINUTES);
            }
            
            if (seq > 999) {
                 throw new RuntimeException("Delivery Order sequence limit (999) exceeded for current second.");
            }
            
            String seqStr = String.format("%03d", seq);
            String candidateNo = "PS" + dateStr + seqStr;
            
            if (settlementOrderRepository.findByDeliveryNo(candidateNo) == null) {
                return candidateNo;
            }
        }
         throw new RuntimeException("Failed to generate unique Delivery Order Number after 50 retries.");
    }

    @Transactional
    public SettlementOrder createSettlement(Long supplierId, List<Long> purchaseOrderIds, String createdBy) {
        if (supplierId == null) {
            throw new RuntimeException("supplierId cannot be null");
        }
        if (purchaseOrderIds == null || purchaseOrderIds.isEmpty()) {
            throw new RuntimeException("orderIds cannot be null");
        }
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        List<PurchaseOrder> orders = purchaseOrderRepository.findAllById(purchaseOrderIds);
        
        // Validate orders
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (PurchaseOrder order : orders) {
            if (!order.getSupplier().getId().equals(supplierId)) {
                throw new RuntimeException("Order " + order.getOrderNo() + " does not belong to supplier");
            }
            if (order.getSettlementStatus() == PurchaseOrder.SettlementStatus.SETTLED) {
                 throw new RuntimeException("Order " + order.getOrderNo() + " is already settled");
            }
            totalAmount = totalAmount.add(order.getTotalAmount());
        }

        SettlementOrder settlement = new SettlementOrder();
        settlement.setSettlementNo(generateSettlementNo());
        settlement.setSupplier(supplier);
        settlement.setType(SettlementOrder.Type.PURCHASE);
        settlement.setSourceType("采购单");
        settlement.setTotalAmount(totalAmount);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setCreatedBy(createdBy);
        settlement.setCreatedAt(java.time.LocalDateTime.now());
        
        SettlementOrder savedSettlement = settlementOrderRepository.save(settlement);

        // Update POs
        for (PurchaseOrder order : orders) {
            order.setSettlementOrder(savedSettlement);
            order.setSettlementStatus(PurchaseOrder.SettlementStatus.SETTLED); // Assume full settlement for now
            purchaseOrderRepository.save(order);
        }

        return savedSettlement;
    }
    
    @Transactional
    public SettlementOrder createBatchSettlement(Long supplierId, String source, BigDecimal amount, String createdBy, String deliveryNo, String relatedOrderNo) {
        SettlementOrder settlement = new SettlementOrder();
        settlement.setSettlementNo(generateSettlementNo());
        
        // 保存配送单号和关联采购单号
        if (deliveryNo != null && !deliveryNo.isEmpty()) {
            settlement.setDeliveryNo(deliveryNo);
        }
        if (relatedOrderNo != null && !relatedOrderNo.isEmpty()) {
            settlement.setRelatedOrderNo(relatedOrderNo);
        }
        
        if ("Delivery".equals(source)) {
            // 来源类型设置为"配送单"
            settlement.setSourceType("配送单");
            settlement.setType(SettlementOrder.Type.LOGISTICS);
            
            // 优先检查LogisticsProvider
            com.supplypro.entity.LogisticsProvider lp = logisticsProviderRepository.findById(supplierId).orElse(null);
            if (lp != null) {
                settlement.setLogisticsProvider(lp);
                // 结算周期取自物流供应商的预设设置
                if (lp.getSettlementPeriod() != null) {
                    settlement.setSettlementPeriod(lp.getSettlementPeriod());
                }
            } else {
                // 检查Supplier（自配送情况）
                Supplier s = supplierRepository.findById(supplierId).orElse(null);
                if (s != null) {
                    settlement.setSupplier(s);
                    // 结算周期取自供应商的预设设置
                    if (s.getSettlementPeriod() != null) {
                        settlement.setSettlementPeriod(s.getSettlementPeriod());
                    }
                } else {
                    throw new RuntimeException("Provider not found for ID: " + supplierId);
                }
            }
        } else {
            // 采购单来源
            settlement.setSourceType("采购单");
            settlement.setType(SettlementOrder.Type.PURCHASE);
            Supplier s = supplierRepository.findById(supplierId).orElse(null);
            if (s != null) {
                settlement.setSupplier(s);
                // 结算周期取自供应商的预设设置
                if (s.getSettlementPeriod() != null) {
                    settlement.setSettlementPeriod(s.getSettlementPeriod());
                }
            }
        }
        
        settlement.setTotalAmount(amount != null ? amount : BigDecimal.ZERO);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setCreatedBy(createdBy);
        settlement.setCreatedAt(java.time.LocalDateTime.now());
        
        return settlementOrderRepository.save(settlement);
    }

    @Transactional
    public void paySettlement(Long settlementId, String paymentMethod, String paymentProof, String operator) {
        SettlementOrder settlement = settlementOrderRepository.findById(settlementId)
                .orElseThrow(() -> new RuntimeException("Settlement not found"));
        
        if (settlement.getStatus() == SettlementOrder.Status.PAID) {
            throw new RuntimeException("Settlement already paid");
        }
        
        settlement.setPaymentMethod(paymentMethod);
        settlement.setPaymentProof(paymentProof);
        settlement.setPaymentDate(java.time.LocalDateTime.now());
        settlement.setStatus(SettlementOrder.Status.PAID);
        
        settlementOrderRepository.save(settlement);

        if ("PREPAYMENT_BALANCE".equals(paymentMethod)) {
             supplierFinanceService.deduct(
                 settlement.getSupplier().getId(), 
                 settlement.getTotalAmount(), 
                 settlement.getSettlementNo(), 
                 "Settlement Payment", 
                 operator
             );
        }
    }
    
    @Transactional
    public void batchDeletePurchaseSettlements(List<Long> settlementIds) {
        for (Long settlementId : settlementIds) {
            SettlementOrder settlement = settlementOrderRepository.findById(settlementId).orElse(null);
            if (settlement == null) {
                continue;
            }
            
            // 只删除采购结算单（type = PURCHASE）
            if (settlement.getType() != SettlementOrder.Type.PURCHASE) {
                continue;
            }
            
            // 删除结算单
            settlementOrderRepository.delete(settlement);
        }
    }
    
    @Transactional
    public void batchRestorePendingPurchaseOrders(List<Long> settlementIds, List<Long> pendingPurchaseOrderIds) {
        for (int i = 0; i < settlementIds.size(); i++) {
            Long settlementId = settlementIds.get(i);
            Long pendingPurchaseOrderId = pendingPurchaseOrderIds.get(i);
            
            SettlementOrder settlement = settlementOrderRepository.findById(settlementId).orElse(null);
            if (settlement == null) {
                continue;
            }
            
            // 只恢复采购结算单（type = PURCHASE）
            if (settlement.getType() != SettlementOrder.Type.PURCHASE) {
                continue;
            }
            
            // 恢复对应的待结算采购单
            PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(pendingPurchaseOrderId).orElse(null);
            if (purchaseOrder == null) {
                continue;
            }
            
            purchaseOrder.setSettlementOrder(null);
            purchaseOrder.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
            purchaseOrderRepository.save(purchaseOrder);
        }
    }
    
    @Transactional
    public List<SettlementOrder> createPurchaseSettlementsFromPendingPurchaseOrders(
            List<Long> pendingPurchaseOrderIds, String createdBy,
            String payeeAccountType, String payeeAccountName, String payeeBank, String payeeAccount) {
        // 批量获取采购单（带供应商急加载）
        List<PurchaseOrder> purchaseOrders = purchaseOrderRepository.findByIdWithSupplierIn(pendingPurchaseOrderIds);
        
        // 按供应商分组
        Map<Long, List<PurchaseOrder>> supplierGroups = new HashMap<>();
        for (PurchaseOrder po : purchaseOrders) {
            if (po == null) {
                continue;
            }
            
            if (po.getSettlementStatus() == PurchaseOrder.SettlementStatus.SETTLED) {
                throw new RuntimeException("采购单 " + po.getOrderNo() + " 已经结算");
            }
            
            if (po.getSupplier() == null) {
                throw new RuntimeException("采购单 " + po.getOrderNo() + " 没有关联供应商");
            }
            
            Long supplierId = po.getSupplier().getId();
            if (supplierId == null) {
                throw new RuntimeException("采购单 " + po.getOrderNo() + " 的供应商ID为空");
            }
            
            if (!supplierGroups.containsKey(supplierId)) {
                supplierGroups.put(supplierId, new ArrayList<>());
            }
            supplierGroups.get(supplierId).add(po);
        }
        
        // 为每个供应商生成一个采购结算单
        List<SettlementOrder> createdSettlements = new ArrayList<>();
        for (Map.Entry<Long, List<PurchaseOrder>> entry : supplierGroups.entrySet()) {
            Long supplierId = entry.getKey();
            List<PurchaseOrder> orders = entry.getValue();
            
            // 计算总金额
            BigDecimal totalAmount = BigDecimal.ZERO;
            for (PurchaseOrder order : orders) {
                totalAmount = totalAmount.add(order.getTotalAmount());
            }
            
            // 生成结算单
            SettlementOrder settlement = new SettlementOrder();
            settlement.setSettlementNo(generateSettlementNo());
            settlement.setSupplier(orders.get(0).getSupplier());
            settlement.setType(SettlementOrder.Type.PURCHASE);
            settlement.setSourceType("采购单");
            settlement.setTotalAmount(totalAmount);
            settlement.setStatus(SettlementOrder.Status.PENDING);
            settlement.setCreatedBy(createdBy);
            settlement.setCreatedAt(java.time.LocalDateTime.now());
            
            // 保存关联的采购单号（逗号分隔）
            String relatedOrderNos = orders.stream()
                .map(PurchaseOrder::getOrderNo)
                .collect(java.util.stream.Collectors.joining(","));
            settlement.setRelatedOrderNo(relatedOrderNos);
            
            SettlementOrder savedSettlement = settlementOrderRepository.save(settlement);
            
            // 设置银行账户信息（如果提供了）
            if (payeeAccountType != null && payeeBank != null && payeeAccount != null) {
                savedSettlement.setPayeeAccountType(payeeAccountType);
                savedSettlement.setPayeeAccountName(payeeAccountName);
                savedSettlement.setPayeeBank(payeeBank);
                savedSettlement.setPayeeAccount(payeeAccount);
            } else {
                // 自动填充供应商默认银行账户
                fillSupplierDefaultAccount(savedSettlement);
            }
            
            savedSettlement = settlementOrderRepository.save(savedSettlement);
            createdSettlements.add(savedSettlement);
            
            // 更新待结算采购单状态
            for (PurchaseOrder order : orders) {
                order.setSettlementOrder(savedSettlement);
                order.setSettlementStatus(PurchaseOrder.SettlementStatus.SETTLED);
                purchaseOrderRepository.save(order);
            }
        }
        
        return createdSettlements;
    }
    
    // 保留原有方法签名以兼容其他调用
    @Transactional
    public List<SettlementOrder> createPurchaseSettlementsFromPendingPurchaseOrders(List<Long> pendingPurchaseOrderIds, String createdBy) {
        return createPurchaseSettlementsFromPendingPurchaseOrders(pendingPurchaseOrderIds, createdBy, null, null, null, null);
    }
    
    @Transactional
    public List<SettlementOrder> createSettlementsFromBizItems(
            List<Map<String, Object>> items, String createdBy,
            String payeeAccountType, String payeeAccountName, String payeeBank, String payeeAccount) {
        
        // 按供应商分组
        Map<Long, List<Map<String, Object>>> supplierGroups = new HashMap<>();
        for (Map<String, Object> item : items) {
            if (item == null) continue;
            
            Object supplierIdObj = item.get("supplierId");
            Long supplierId = null;
            if (supplierIdObj instanceof Number) {
                supplierId = ((Number) supplierIdObj).longValue();
            } else if (supplierIdObj instanceof String) {
                supplierId = Long.valueOf((String) supplierIdObj);
            }
            
            if (supplierId == null) {
                throw new RuntimeException("记录缺少供应商ID");
            }
            
            if (!supplierGroups.containsKey(supplierId)) {
                supplierGroups.put(supplierId, new ArrayList<>());
            }
            supplierGroups.get(supplierId).add(item);
        }
        
        // 为每个供应商生成一个采购结算单
        List<SettlementOrder> createdSettlements = new ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        
        for (Map.Entry<Long, List<Map<String, Object>>> entry : supplierGroups.entrySet()) {
            Long supplierId = entry.getKey();
            List<Map<String, Object>> groupItems = entry.getValue();
            
            Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("供应商不存在: " + supplierId));
            
            // 计算总金额（勾选记录的金额之和）
            BigDecimal totalAmount = BigDecimal.ZERO;
            List<String> relatedOrderNos = new ArrayList<>();
            
            for (Map<String, Object> item : groupItems) {
                Object amountObj = item.get("amount");
                if (amountObj != null) {
                    BigDecimal itemAmount = new BigDecimal(amountObj.toString());
                    totalAmount = totalAmount.add(itemAmount);
                }
                
                String bizNo = (String) item.get("bizNo");
                if (bizNo != null && !relatedOrderNos.contains(bizNo)) {
                    relatedOrderNos.add(bizNo);
                }
            }
            
            // 生成结算单
            SettlementOrder settlement = new SettlementOrder();
            settlement.setSettlementNo(generateSettlementNo());
            settlement.setSupplier(supplier);
            settlement.setType(SettlementOrder.Type.PURCHASE);
            settlement.setSourceType("采购单");
            settlement.setTotalAmount(totalAmount);
            settlement.setStatus(SettlementOrder.Status.PENDING);
            settlement.setCreatedBy(createdBy);
            settlement.setCreatedAt(java.time.LocalDateTime.now());
            settlement.setRelatedOrderNo(String.join(",", relatedOrderNos));
            
            // 存储关联的业务变动记录信息
            try {
                settlement.setSettlementItems(mapper.writeValueAsString(groupItems));
            } catch (Exception e) {
                settlement.setSettlementItems(groupItems.toString());
            }
            
            // 设置银行账户信息
            if (payeeAccountType != null && payeeBank != null && payeeAccount != null) {
                settlement.setPayeeAccountType(payeeAccountType);
                settlement.setPayeeAccountName(payeeAccountName);
                settlement.setPayeeBank(payeeBank);
                settlement.setPayeeAccount(payeeAccount);
            } else {
                fillSupplierDefaultAccount(settlement);
            }
            
            SettlementOrder savedSettlement = settlementOrderRepository.save(settlement);
            createdSettlements.add(savedSettlement);
            
            for (Map<String, Object> item : groupItems) {
                String itemBizType = (String) item.get("bizType");
                Object purchaseOrderIdObj = item.get("purchaseOrderId");
                Long purchaseOrderId = null;
                if (purchaseOrderIdObj instanceof Number) {
                    purchaseOrderId = ((Number) purchaseOrderIdObj).longValue();
                } else if (purchaseOrderIdObj instanceof String) {
                    purchaseOrderId = Long.valueOf((String) purchaseOrderIdObj);
                }
                
                if (purchaseOrderId != null) {
                    PurchaseOrder po = purchaseOrderRepository.findById(purchaseOrderId).orElse(null);
                    if (po != null) {
                        if ("REFUND".equals(itemBizType)) {
                            Object rawIdObj = item.get("rawId");
                            Long refundOrderId = null;
                            if (rawIdObj instanceof Number) {
                                refundOrderId = ((Number) rawIdObj).longValue();
                            }
                            if (refundOrderId != null) {
                                RefundOrder ro = refundOrderRepository.findById(refundOrderId).orElse(null);
                                if (ro != null) {
                                    ro.setSettlementStatus("SETTLED");
                                    refundOrderRepository.save(ro);
                                }
                            }
                        } else {
                            po.setSettlementStatus(PurchaseOrder.SettlementStatus.SETTLED);
                            po.setSettlementOrder(savedSettlement);
                            purchaseOrderRepository.save(po);
                        }
                    }
                }
            }
        }
        
        return createdSettlements;
    }
    
    public List<SettlementOrder> getAll() {
        return settlementOrderRepository.findAll();
    }
    
    private void fillSupplierDefaultAccount(SettlementOrder settlement) {
        if (settlement.getSupplier() == null) {
            return;
        }
        
        Long supplierId = settlement.getSupplier().getId();
        if (supplierId == null) {
            return;
        }
        
        List<com.supplypro.entity.SupplierAccount> accounts = supplierAccountRepository.findBySupplierId(supplierId);
        
        com.supplypro.entity.SupplierAccount defaultAcc = null;
        for (com.supplypro.entity.SupplierAccount acc : accounts) {
            if (acc.isDefault()) {
                defaultAcc = acc;
                break;
            }
        }
        if (defaultAcc == null && !accounts.isEmpty()) {
            defaultAcc = accounts.get(0);
        }
        if (defaultAcc != null) {
            settlement.setPayeeAccountType(defaultAcc.getType() != null ? defaultAcc.getType().name() : "COMPANY");
            settlement.setPayeeAccountName(defaultAcc.getName());
            settlement.setPayeeBank(defaultAcc.getBank());
            settlement.setPayeeAccount(defaultAcc.getAccount());
            settlementOrderRepository.save(settlement);
        }
    }
}
