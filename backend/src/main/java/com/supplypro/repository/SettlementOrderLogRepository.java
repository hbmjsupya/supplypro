package com.supplypro.repository;

import com.supplypro.entity.SettlementOrderLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SettlementOrderLogRepository extends JpaRepository<SettlementOrderLog, Long> {
    List<SettlementOrderLog> findBySettlementOrderIdOrderByCreatedAtDesc(Long settlementOrderId);
}
