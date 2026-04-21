package com.supplypro.repository;

import com.supplypro.entity.DeliveryExportRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

@Repository
public interface DeliveryExportRecordRepository extends JpaRepository<DeliveryExportRecord, Long>, JpaSpecificationExecutor<DeliveryExportRecord> {
    Page<DeliveryExportRecord> findByExportedBy(String exportedBy, Pageable pageable);
    
    List<DeliveryExportRecord> findByExportedByOrderByExportedAtDesc(String exportedBy);
    
    Page<DeliveryExportRecord> findAllByOrderByExportedAtDesc(Pageable pageable);
}
