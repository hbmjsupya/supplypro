package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.impl.PurchaseOrderServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
public class PurchaseOrderDuplicateTest {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseOrderServiceImpl purchaseOrderService;

    @Test
    public void testDuplicateOrderNumberThrowsException() {
        // Create first PO
        PurchaseOrder po1 = new PurchaseOrder();
        po1.setOrderNo("C202603021401003");
        po1.setSupplierId(1L);
        po1.setType(PurchaseOrder.Type.STANDARD);
        po1.setTotalAmount(new BigDecimal("100.00"));
        po1.setStatus(PurchaseOrder.Status.PENDING);
        
        purchaseOrderRepository.saveAndFlush(po1);

        // Create second PO with SAME number
        PurchaseOrder po2 = new PurchaseOrder();
        po2.setOrderNo("C202603021401003"); // Duplicate
        po2.setSupplierId(2L);
        po2.setType(PurchaseOrder.Type.STANDARD);
        po2.setTotalAmount(new BigDecimal("200.00"));
        po2.setStatus(PurchaseOrder.Status.PENDING);

        // Should throw DataIntegrityViolationException
        assertThrows(DataIntegrityViolationException.class, () -> {
            purchaseOrderRepository.saveAndFlush(po2);
        });
    }
}
