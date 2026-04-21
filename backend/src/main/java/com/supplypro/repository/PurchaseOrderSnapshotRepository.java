package com.supplypro.repository;

import com.supplypro.entity.PurchaseOrderSnapshot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PurchaseOrderSnapshotRepository extends JpaRepository<PurchaseOrderSnapshot, Long>, JpaSpecificationExecutor<PurchaseOrderSnapshot> {
    
    Optional<PurchaseOrderSnapshot> findTopByPurchaseOrderIdOrderByVersionDesc(Long purchaseOrderId);
    
    @Query("SELECT s FROM PurchaseOrderSnapshot s WHERE s.purchaseOrderId = :poId AND s.isLatest = true ORDER BY s.version DESC")
    java.util.List<PurchaseOrderSnapshot> findLatestByPurchaseOrderId(@Param("poId") Long poId);
    
    // For verifying uniqueness/updates
    boolean existsByPurchaseOrderIdAndVersion(Long purchaseOrderId, Integer version);

    java.util.List<PurchaseOrderSnapshot> findByOrderNo(String orderNo);
    
    // Delete all snapshots for a purchase order
    void deleteByPurchaseOrderId(Long purchaseOrderId);
    
    // Delete all snapshots for a purchase order and return count
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM PurchaseOrderSnapshot s WHERE s.purchaseOrderId = :purchaseOrderId")
    int deleteByPurchaseOrderIdReturningCount(@org.springframework.data.repository.query.Param("purchaseOrderId") Long purchaseOrderId);
}
