package com.supplypro.service.impl;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.LogisticsTrack;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.LogisticsTrackRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.LogisticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class LogisticsServiceImpl implements LogisticsService {

    @Autowired
    private LogisticsTrackRepository logisticsTrackRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Override
    public List<LogisticsTrack> getTracks(String bizNo) {
        return logisticsTrackRepository.findByBizNoOrderByEventTimeDesc(bizNo);
    }

    @Override
    @Transactional
    public LogisticsTrack addTrack(String bizNo, String status, String location, String description, String operator) {
        LogisticsTrack track = new LogisticsTrack();
        track.setBizNo(bizNo);
        track.setStatus(status);
        track.setLocation(location);
        track.setDescription(description);
        track.setEventTime(LocalDateTime.now());
        
        // Determine BizType
        if (bizNo.startsWith("PO")) {
            track.setBizType(LogisticsTrack.BizType.PURCHASE);
            PurchaseOrder po = purchaseOrderRepository.findByOrderNo(bizNo);
            if (po != null) {
                track.setLogisticsProvider(po.getLogisticsCompany());
                track.setTrackingNo(po.getTrackingNumber());
            }
        } else if (bizNo.startsWith("IN")) {
            track.setBizType(LogisticsTrack.BizType.INBOUND);
            inboundOrderRepository.findByInboundNo(bizNo).ifPresent(io -> {
                track.setLogisticsProvider(io.getLogisticsCompany());
                track.setTrackingNo(io.getTrackingNo());
            });
        } else {
            // Default or throw
            track.setBizType(LogisticsTrack.BizType.PURCHASE); // Fallback
        }

        return logisticsTrackRepository.save(track);
    }

    @Override
    @Transactional
    public void updateLogisticsInfo(String bizNo, String company, String trackingNo, String status, String location, String description) {
        LocalDateTime now = LocalDateTime.now();

        // Update Main Entity
        if (bizNo.startsWith("PO")) {
            PurchaseOrder po = purchaseOrderRepository.findByOrderNo(bizNo);
            if (po == null) {
                throw new RuntimeException("Purchase Order not found: " + bizNo);
            }
            
            if (company != null) po.setLogisticsCompany(company);
            if (trackingNo != null) po.setTrackingNumber(trackingNo);
            
            // Map status string to Enum if possible
            if ("SHIPPED".equalsIgnoreCase(status)) {
                po.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
                if (po.getShippedAt() == null) po.setShippedAt(now);
                if (po.getStatus() == PurchaseOrder.Status.CONFIRMED || po.getStatus() == PurchaseOrder.Status.PENDING) {
                    po.setStatus(PurchaseOrder.Status.SHIPPED);
                }
            } else if ("RECEIVED".equalsIgnoreCase(status)) {
                po.setShippingStatus(PurchaseOrder.ShippingStatus.RECEIVED);
            }
            
            purchaseOrderRepository.save(po);

        } else if (bizNo.startsWith("IN")) {
            InboundOrder io = inboundOrderRepository.findByInboundNo(bizNo)
                    .orElseThrow(() -> new RuntimeException("Inbound Order not found: " + bizNo));
            
            if (company != null) io.setLogisticsCompany(company);
            if (trackingNo != null) io.setTrackingNo(trackingNo);
            
            if ("SHIPPED".equalsIgnoreCase(status)) {
                if (io.getShippedAt() == null) io.setShippedAt(now);
            } else if ("DELIVERED".equalsIgnoreCase(status) || "RECEIVED".equalsIgnoreCase(status)) {
                if (io.getActualArrival() == null) io.setActualArrival(now);
            }
            
            inboundOrderRepository.save(io);
        }

        // Add Track
        addTrack(bizNo, status, location, description, "System"); // Operator passed from Controller usually
    }
}
