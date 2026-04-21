package com.supplypro.service;

import com.supplypro.entity.SettlementOrder;
import com.supplypro.repository.SettlementOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class DocumentNumberMigrationService {

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Transactional
    public void migrateDocumentNumbers() {
        // 只查找需要迁移的记录，避免处理所有记录
        List<SettlementOrder> ordersToMigrate = settlementOrderRepository.findAll();
        int migratedCount = 0;
        
        for (SettlementOrder order : ordersToMigrate) {
            boolean updated = false;
            
            // Update deliveryNo format: DO -> PS (if starts with DO)
            if (order.getDeliveryNo() != null && order.getDeliveryNo().startsWith("DO")) {
                try {
                    String newDeliveryNo = generateDeliveryNo();
                    order.setDeliveryNo(newDeliveryNo);
                    updated = true;
                } catch (Exception e) {
                    System.err.println("Failed to generate delivery no for order " + order.getId() + ": " + e.getMessage());
                }
            }
            
            // Update settlementNo format: PS -> JS (if starts with PS)
            if (order.getSettlementNo() != null && order.getSettlementNo().startsWith("PS")) {
                try {
                    String newSettlementNo = generateSettlementNo();
                    order.setSettlementNo(newSettlementNo);
                    updated = true;
                } catch (Exception e) {
                    System.err.println("Failed to generate settlement no for order " + order.getId() + ": " + e.getMessage());
                }
            }
            
            if (updated) {
                try {
                    settlementOrderRepository.save(order);
                    migratedCount++;
                } catch (Exception e) {
                    System.err.println("Failed to save order " + order.getId() + ": " + e.getMessage());
                }
            }
        }

        System.out.println("Document Number Migration Completed. Migrated " + migratedCount + " records.");
    }

    private synchronized String generateDeliveryNo() {
        // Generate Delivery No: PS + yyyyMMddHHmmss + 001-999
        // 配送单号格式: PS + 时间戳(14位) + 序列号(3位)
        LocalDateTime now = LocalDateTime.now();
        String timeStr = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(now);
        String key = "delivery_seq:" + timeStr;

        for (int i = 0; i < 50; i++) {
            Long seq = redisTemplate.opsForValue().increment(key);

            if (seq != null && seq == 1) {
                redisTemplate.expire(key, 10, TimeUnit.MINUTES);
            }

            if (seq != null && seq > 999) {
                throw new RuntimeException("Delivery Order sequence limit (999) exceeded for current second.");
            }

            String seqStr = String.format("%03d", seq != null ? seq : 1);
            String candidateNo = "PS" + timeStr + seqStr;

            if (settlementOrderRepository.findByDeliveryNo(candidateNo) == null) {
                return candidateNo;
            }
        }
        throw new RuntimeException("Failed to generate unique Delivery Order Number after 50 retries.");
    }

    private synchronized String generateSettlementNo() {
        // Generate Settlement No: JS + yyyyMMddHHmm + 001-999
        // 结算单号格式: JS + 时间戳(12位) + 序列号(3位)
        LocalDateTime now = LocalDateTime.now();
        String timeStr = DateTimeFormatter.ofPattern("yyyyMMddHHmm").format(now);
        String key = "settlement_seq:" + timeStr;

        for (int i = 0; i < 50; i++) {
            Long seq = redisTemplate.opsForValue().increment(key);

            if (seq != null && seq == 1) {
                redisTemplate.expire(key, 10, TimeUnit.MINUTES);
            }

            if (seq != null && seq > 999) {
                throw new RuntimeException("Settlement Order sequence limit (999) exceeded for current minute.");
            }

            String seqStr = String.format("%03d", seq != null ? seq : 1);
            String candidateNo = "JS" + timeStr + seqStr;

            if (settlementOrderRepository.findBySettlementNo(candidateNo) == null) {
                return candidateNo;
            }
        }
        throw new RuntimeException("Failed to generate unique Settlement Order Number after 50 retries.");
    }
}
