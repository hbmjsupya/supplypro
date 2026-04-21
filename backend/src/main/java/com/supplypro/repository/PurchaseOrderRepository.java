package com.supplypro.repository;

import com.supplypro.entity.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import javax.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {
    Page<PurchaseOrder> findByOrderNoContaining(String orderNo, Pageable pageable);
    PurchaseOrder findByOrderNo(String orderNo);
    Optional<PurchaseOrder> findByBizNo(String bizNo);
    List<PurchaseOrder> findByOrderNoIn(List<String> orderNos);
    
    // Returns all POs for a given tracking number
    @Query(value = "SELECT * FROM purchase_orders WHERE tracking_number = :trackingNumber ORDER BY updated_at DESC", nativeQuery = true)
    List<PurchaseOrder> findByTrackingNumber(@Param("trackingNumber") String trackingNumber);
    
    // Find POs with same tracking number and fee > 0
    @Query("SELECT p FROM PurchaseOrder p WHERE p.trackingNumber = :trackingNumber AND p.logisticsFee > 0")
    List<PurchaseOrder> findByTrackingNumberAndFeeGreaterThanZero(@Param("trackingNumber") String trackingNumber);

    List<PurchaseOrder> findByTrackingNumberAndDeliveryMethodAndLogisticsFeeGreaterThanAndOrderNoNot(
        String trackingNumber, 
        String deliveryMethod, 
        java.math.BigDecimal fee, 
        String orderNo
    );
    
    List<PurchaseOrder> findByTrackingNumberAndDeliveryMethodAndOrderNoNot(
        String trackingNumber, 
        String deliveryMethod, 
        String orderNo
    );

    List<PurchaseOrder> findBySettlementStatusNot(PurchaseOrder.SettlementStatus status);
    void deleteByWarehouseId(Long warehouseId);

    List<PurchaseOrder> findAllByStatus(PurchaseOrder.Status status);

    List<PurchaseOrder> findByStatusAndUpdatedAtBefore(PurchaseOrder.Status status, java.time.LocalDateTime dateTime);

    @Query("SELECT DISTINCT p FROM PurchaseOrder p LEFT JOIN FETCH p.items i LEFT JOIN FETCH i.product WHERE p.id = :id")
    List<PurchaseOrder> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT DISTINCT p FROM PurchaseOrder p LEFT JOIN FETCH p.items i LEFT JOIN FETCH i.product WHERE p.id IN :ids")
    List<PurchaseOrder> findByIdWithItemsIn(@Param("ids") List<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PurchaseOrder p WHERE p.id = :id")
    Optional<PurchaseOrder> findByIdWithLock(@Param("id") Long id);

    @Modifying
    @Query(value = "UPDATE purchase_orders SET current_snapshot_id = :snapshotId WHERE id = :poId", nativeQuery = true)
    void updateCurrentSnapshotId(@Param("poId") Long poId, @Param("snapshotId") Long snapshotId);

    @Query("SELECT p FROM PurchaseOrder p LEFT JOIN FETCH p.supplier WHERE p.id = :id")
    Optional<PurchaseOrder> findByIdWithSupplier(@Param("id") Long id);

    @Query("SELECT p FROM PurchaseOrder p LEFT JOIN FETCH p.supplier WHERE p.id IN :ids")
    List<PurchaseOrder> findByIdWithSupplierIn(@Param("ids") List<Long> ids);
}
