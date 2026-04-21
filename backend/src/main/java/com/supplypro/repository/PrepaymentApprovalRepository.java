package com.supplypro.repository;

import com.supplypro.entity.PrepaymentApproval;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrepaymentApprovalRepository extends JpaRepository<PrepaymentApproval, Long> {
    List<PrepaymentApproval> findBySupplierIdOrderByCreatedAtDesc(Long supplierId);
    Page<PrepaymentApproval> findBySupplierId(Long supplierId, Pageable pageable);
    Page<PrepaymentApproval> findByLogisticsProviderId(Long logisticsProviderId, Pageable pageable);
    PrepaymentApproval findByApprovalNo(String approvalNo);
}
