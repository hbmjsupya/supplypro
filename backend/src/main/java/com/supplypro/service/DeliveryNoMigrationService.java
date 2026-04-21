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
public class DeliveryNoMigrationService {

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Transactional
    public void migrateDeliveryNos() {
        List<SettlementOrder> ordersWithoutDeliveryNo = settlementOrderRepository.findAll()
            .stream()
            .filter(order -> order.getDeliveryNo() == null || order.getDeliveryNo().isEmpty())
            .toList();

        for (SettlementOrder order : ordersWithoutDeliveryNo) {
            String deliveryNo = generateDeliveryNo();
            order.setDeliveryNo(deliveryNo);
            settlementOrderRepository.save(order);
        }

        System.out.println("DeliveryNo Migration Completed. Migrated " + ordersWithoutDeliveryNo.size() + " records.");
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
}
