package com.supplypro.repository;

import com.supplypro.entity.InboundOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InboundOrderItemRepository extends JpaRepository<InboundOrderItem, Long> {
    void deleteByProductId(Long productId);
}
