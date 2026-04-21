package com.supplypro.service;

import com.supplypro.entity.InboundOrder;
import com.supplypro.entity.LogisticsTrack;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.LogisticsTrackRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.impl.LogisticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LogisticsServiceTest {

    @InjectMocks
    private LogisticsServiceImpl logisticsService;

    @Mock
    private LogisticsTrackRepository logisticsTrackRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private InboundOrderRepository inboundOrderRepository;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void addTrack_PurchaseOrder_Success() {
        String bizNo = "PO123456";
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo(bizNo);
        po.setLogisticsCompany("DHL");
        po.setTrackingNumber("TRACK123");

        when(purchaseOrderRepository.findByOrderNo(bizNo)).thenReturn(po);
        when(logisticsTrackRepository.save(any(LogisticsTrack.class))).thenAnswer(i -> i.getArguments()[0]);

        LogisticsTrack track = logisticsService.addTrack(bizNo, "SHIPPED", "Shanghai", "Dispatched", "Admin");

        assertNotNull(track);
        assertEquals(LogisticsTrack.BizType.PURCHASE, track.getBizType());
        assertEquals("DHL", track.getLogisticsProvider());
        assertEquals("TRACK123", track.getTrackingNo());
        assertEquals("SHIPPED", track.getStatus());
    }

    @Test
    void updateLogisticsInfo_InboundOrder_Success() {
        String bizNo = "IN20231010";
        InboundOrder io = new InboundOrder();
        io.setInboundNo(bizNo);

        when(inboundOrderRepository.findByInboundNo(bizNo)).thenReturn(Optional.of(io));
        when(inboundOrderRepository.save(any(InboundOrder.class))).thenAnswer(i -> i.getArguments()[0]);
        when(logisticsTrackRepository.save(any(LogisticsTrack.class))).thenAnswer(i -> i.getArguments()[0]);

        logisticsService.updateLogisticsInfo(bizNo, "FedEx", "TRACK999", "DELIVERED", "Beijing", "Arrived");

        assertEquals("FedEx", io.getLogisticsCompany());
        assertEquals("TRACK999", io.getTrackingNo());
        assertNotNull(io.getActualArrival());
    }
}
