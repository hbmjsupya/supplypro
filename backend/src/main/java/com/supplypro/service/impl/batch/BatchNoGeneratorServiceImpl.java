package com.supplypro.service.impl.batch;

import com.supplypro.entity.Product;
import com.supplypro.service.BatchNoGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class BatchNoGeneratorServiceImpl implements BatchNoGeneratorService {

    private final StringRedisTemplate redisTemplate;

    @Override
    public String generateBatchNo(Product product, String providedSupplierName) {
        // 1. Date part: YYYYMMDD
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        
        // 2. Supplier name part
        String supplierName = "未知供应商";
        if (providedSupplierName != null && !providedSupplierName.trim().isEmpty()) {
            supplierName = providedSupplierName;
        } else if (product != null && product.getDefaultSupplierName() != null && !product.getDefaultSupplierName().trim().isEmpty()) {
            supplierName = product.getDefaultSupplierName();
        }

        // 3. Sequence part: 3 digits
        String redisKey = "batch_seq:" + dateStr;
        Long seq = redisTemplate.opsForValue().increment(redisKey);
        
        if (seq != null && seq == 1) {
            redisTemplate.expire(redisKey, 24, TimeUnit.HOURS);
        }
        
        // Ensure 3 digits, e.g. 001, 002... 999
        String seqStr = String.format("%03d", seq);
        
        // Final format: YYYYMMDD + seq + Supplier Name
        return dateStr + seqStr + supplierName;
    }
}
