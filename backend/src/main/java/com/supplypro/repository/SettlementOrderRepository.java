package com.supplypro.repository;

import com.supplypro.entity.SettlementOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface SettlementOrderRepository extends JpaRepository<SettlementOrder, Long>, JpaSpecificationExecutor<SettlementOrder> {
    Page<SettlementOrder> findByType(SettlementOrder.Type type, Pageable pageable);
}
