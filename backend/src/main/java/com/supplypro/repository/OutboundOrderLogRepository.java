package com.supplypro.repository;

import com.supplypro.entity.OutboundOrderLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboundOrderLogRepository extends JpaRepository<OutboundOrderLog, Long> {
    List<OutboundOrderLog> findByOutboundOrderIdOrderByCreatedAtDesc(Long outboundOrderId);
    
    void deleteByOutboundOrderId(Long outboundOrderId);
}
