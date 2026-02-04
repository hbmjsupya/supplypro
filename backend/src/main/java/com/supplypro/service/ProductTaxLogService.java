package com.supplypro.service;

import com.supplypro.entity.ProductTaxChangeLog;
import com.supplypro.repository.ProductTaxChangeLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class ProductTaxLogService {

    private static final Logger logger = LoggerFactory.getLogger(ProductTaxLogService.class);

    @Autowired
    private ProductTaxChangeLogRepository productTaxChangeLogRepository;

    /**
     * Logs a tax rate change in a separate transaction.
     * If this fails, it will NOT roll back the main transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logTaxChange(Long productId, BigDecimal oldRate, BigDecimal newRate, String reason) {
        try {
            ProductTaxChangeLog log = new ProductTaxChangeLog();
            log.setProductId(productId);
            log.setOldRate(oldRate);
            log.setNewRate(newRate);
            log.setReason(reason);
            log.setCreatedAt(LocalDateTime.now());
            // createdBy will be populated by JPA Auditing if available, 
            // but since this is a new transaction, security context might not be propagated automatically 
            // unless SecurityContextHolder is inheritable. 
            // Spring Security's context is ThreadLocal. REQUIRES_NEW runs in the same thread, just new transaction.
            // So SecurityContext should be available.

            productTaxChangeLogRepository.save(log);
            logger.info("Saved tax log for product {}: {} -> {}", productId, oldRate, newRate);
        } catch (Exception e) {
            logger.error("Failed to save tax change log for product {}: {}", productId, e.getMessage(), e);
            // We catch it here so the new transaction commits (or rolls back) without affecting the caller.
            // Actually, if we catch it, the transaction commits (if no other error). 
            // But if save() failed, the transaction is marked for rollback. 
            // Since it's a NEW transaction, its rollback won't affect the outer transaction.
        }
    }
}
