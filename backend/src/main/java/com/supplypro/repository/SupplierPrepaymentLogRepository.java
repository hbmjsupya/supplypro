package com.supplypro.repository;

import com.supplypro.entity.SupplierPrepaymentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierPrepaymentLogRepository extends JpaRepository<SupplierPrepaymentLog, Long> {
    List<SupplierPrepaymentLog> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);
    List<SupplierPrepaymentLog> findByLogisticsProviderIdOrderByCreatedAtDesc(Long logisticsProviderId);
    List<SupplierPrepaymentLog> findByRelatedOrderNoAndType(String relatedOrderNo, SupplierPrepaymentLog.Type type);
}
