package com.supplypro.repository;

import com.supplypro.entity.OutboundOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboundOrderRepository extends JpaRepository<OutboundOrder, Long>, JpaSpecificationExecutor<OutboundOrder> {
    OutboundOrder findByOutboundNo(String outboundNo);
    List<OutboundOrder> findBySettlementStatusNot(OutboundOrder.SettlementStatus status);
}
