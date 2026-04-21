package com.supplypro.repository;

import com.supplypro.entity.PlatformPendingOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformPendingOrderRepository extends JpaRepository<PlatformPendingOrder, Long> {
    
    Page<PlatformPendingOrder> findByStatus(PlatformPendingOrder.Status status, Pageable pageable);
    
    List<PlatformPendingOrder> findByStatus(PlatformPendingOrder.Status status);
    
    Optional<PlatformPendingOrder> findByOrderNo(String orderNo);
    
    boolean existsByOrderNo(String orderNo);
    
    long countByStatus(PlatformPendingOrder.Status status);
}
