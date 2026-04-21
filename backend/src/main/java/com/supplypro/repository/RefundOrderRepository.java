package com.supplypro.repository;

import com.supplypro.entity.RefundOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundOrderRepository extends JpaRepository<RefundOrder, Long> {

    Page<RefundOrder> findByStatus(RefundOrder.Status status, Pageable pageable);

    List<RefundOrder> findByRelatedOrderNo(String relatedOrderNo);

    List<RefundOrder> findByTrackingNo(String trackingNo);

    RefundOrder findByRefundNo(String refundNo);

    List<RefundOrder> findByRelatedOrderIdAndBizType(Long relatedOrderId, RefundOrder.BizType bizType);

    @Query("SELECT r FROM RefundOrder r WHERE " +
           "(:refundNo IS NULL OR r.refundNo LIKE %:refundNo%) AND " +
           "(:relatedOrderNo IS NULL OR r.relatedOrderNo = :relatedOrderNo) AND " +
           "(:platformRefundNo IS NULL OR r.platformRefundNo = :platformRefundNo) AND " +
           "(:refundType IS NULL OR r.refundType = :refundType) AND " +
           "(:bearer IS NULL OR r.bearer = :bearer) AND " +
           "(:status IS NULL OR r.status = :status)")
    Page<RefundOrder> search(
        @Param("refundNo") String refundNo,
        @Param("relatedOrderNo") String relatedOrderNo,
        @Param("platformRefundNo") String platformRefundNo,
        @Param("refundType") RefundOrder.RefundType refundType,
        @Param("bearer") RefundOrder.Bearer bearer,
        @Param("status") RefundOrder.Status status,
        Pageable pageable
    );

    @Query("SELECT MAX(r.refundNo) FROM RefundOrder r WHERE r.refundNo LIKE :prefix")
    String findMaxRefundNoByPrefix(@Param("prefix") String prefix);
}
