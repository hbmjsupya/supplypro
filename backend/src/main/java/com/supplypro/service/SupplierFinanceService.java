package com.supplypro.service;

import com.supplypro.entity.Supplier;
import com.supplypro.entity.SupplierPrepaymentLog;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.repository.SupplierPrepaymentLogRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SupplierFinanceService {
    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private SupplierPrepaymentLogRepository logRepository;

    @Transactional
    public void charge(Long supplierId, BigDecimal amount, String remark, String createdBy) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Charge amount must be positive");
        }
        updateBalance(supplierId, amount, SupplierPrepaymentLog.Type.CHARGE, null, remark, createdBy);
    }

    @Transactional
    public void chargeLogistics(Long logisticsProviderId, BigDecimal amount, String remark, String createdBy) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Charge amount must be positive");
        }
        updateLogisticsBalance(logisticsProviderId, amount, SupplierPrepaymentLog.Type.CHARGE, null, remark, createdBy);
    }

    @Transactional
    public void deduct(Long supplierId, BigDecimal amount, String orderNo, String remark, String createdBy) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Deduct amount must be positive");
        }
        updateBalance(supplierId, amount.negate(), SupplierPrepaymentLog.Type.DEDUCT, orderNo, remark, createdBy);
    }

    @Transactional
    public void deductLogistics(Long logisticsProviderId, BigDecimal amount, String orderNo, String remark, String createdBy) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Deduct amount must be positive");
        }
        updateLogisticsBalance(logisticsProviderId, amount.negate(), SupplierPrepaymentLog.Type.DEDUCT, orderNo, remark, createdBy);
    }

    @Transactional
    public void refund(Long supplierId, BigDecimal amount, String remark, String createdBy) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Refund amount must be positive");
        }
        updateBalance(supplierId, amount.negate(), SupplierPrepaymentLog.Type.REFUND, null, remark, createdBy);
    }

    private void updateBalance(Long supplierId, BigDecimal delta, SupplierPrepaymentLog.Type type, String orderNo, String remark, String createdBy) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        if (supplier.getPrepaymentBalance() == null) {
            supplier.setPrepaymentBalance(BigDecimal.ZERO);
        }

        BigDecimal newBalance = supplier.getPrepaymentBalance().add(delta);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0 && type == SupplierPrepaymentLog.Type.DEDUCT) {
            throw new RuntimeException("Insufficient prepayment balance");
        }

        supplier.setPrepaymentBalance(newBalance);
        supplierRepository.save(supplier);

        SupplierPrepaymentLog log = new SupplierPrepaymentLog();
        log.setSupplier(supplier);
        log.setType(type);
        log.setAmount(delta.abs());
        log.setBalanceAfter(newBalance);
        log.setRelatedOrderNo(orderNo);
        log.setRemark(remark);
        log.setCreatedBy(createdBy);
        log.setOwnerType("SUPPLIER");
        logRepository.save(log);
    }

    private void updateLogisticsBalance(Long logisticsProviderId, BigDecimal delta, SupplierPrepaymentLog.Type type, String orderNo, String remark, String createdBy) {
        LogisticsProvider lp = logisticsProviderRepository.findById(logisticsProviderId)
                .orElseThrow(() -> new RuntimeException("LogisticsProvider not found"));

        if (lp.getPrepaymentBalance() == null) {
            lp.setPrepaymentBalance(BigDecimal.ZERO);
        }

        BigDecimal newBalance = lp.getPrepaymentBalance().add(delta);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0 && type == SupplierPrepaymentLog.Type.DEDUCT) {
            throw new RuntimeException("Insufficient prepayment balance");
        }

        lp.setPrepaymentBalance(newBalance);
        logisticsProviderRepository.save(lp);

        SupplierPrepaymentLog log = new SupplierPrepaymentLog();
        log.setLogisticsProvider(lp);
        log.setType(type);
        log.setAmount(delta.abs());
        log.setBalanceAfter(newBalance);
        log.setRelatedOrderNo(orderNo);
        log.setRemark(remark);
        log.setCreatedBy(createdBy);
        log.setOwnerType("LOGISTICS");
        logRepository.save(log);
    }
    
    public List<SupplierPrepaymentLog> getLogs(Long supplierId) {
        return logRepository.findBySupplierIdOrderByCreatedAtDesc(supplierId);
    }

    public List<SupplierPrepaymentLog> getLogisticsLogs(Long logisticsProviderId) {
        return logRepository.findByLogisticsProviderIdOrderByCreatedAtDesc(logisticsProviderId);
    }
}
