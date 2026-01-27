package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.SupplierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SettlementService {
    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private SupplierRepository supplierRepository;
    
    @Autowired
    private SupplierFinanceService supplierFinanceService;

    @Transactional
    public SettlementOrder createSettlement(Long supplierId, List<Long> purchaseOrderIds, String createdBy) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        List<PurchaseOrder> orders = purchaseOrderRepository.findAllById(purchaseOrderIds);
        
        // Validate orders
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (PurchaseOrder order : orders) {
            if (!order.getSupplier().getId().equals(supplierId)) {
                throw new RuntimeException("Order " + order.getOrderNo() + " does not belong to supplier");
            }
            if (order.getSettlementStatus() == PurchaseOrder.SettlementStatus.SETTLED) {
                 throw new RuntimeException("Order " + order.getOrderNo() + " is already settled");
            }
            totalAmount = totalAmount.add(order.getTotalAmount());
        }

        SettlementOrder settlement = new SettlementOrder();
        settlement.setSettlementNo("ST" + System.currentTimeMillis());
        settlement.setSupplier(supplier);
        settlement.setType(SettlementOrder.Type.PURCHASE);
        settlement.setTotalAmount(totalAmount);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setCreatedBy(createdBy);
        
        SettlementOrder savedSettlement = settlementOrderRepository.save(settlement);

        // Update POs
        for (PurchaseOrder order : orders) {
            order.setSettlementOrder(savedSettlement);
            order.setSettlementStatus(PurchaseOrder.SettlementStatus.SETTLED); // Assume full settlement for now
            purchaseOrderRepository.save(order);
        }

        return savedSettlement;
    }

    @Transactional
    public void paySettlement(Long settlementId, String paymentMethod, String paymentProof, String operator) {
        SettlementOrder settlement = settlementOrderRepository.findById(settlementId)
                .orElseThrow(() -> new RuntimeException("Settlement not found"));
        
        if (settlement.getStatus() == SettlementOrder.Status.PAID || settlement.getStatus() == SettlementOrder.Status.COMPLETED) {
            throw new RuntimeException("Settlement already paid");
        }

        settlement.setPaymentMethod(paymentMethod);
        settlement.setPaymentProof(paymentProof);
        settlement.setPaymentDate(java.time.LocalDateTime.now());
        settlement.setStatus(SettlementOrder.Status.PAID);
        
        settlementOrderRepository.save(settlement);

        if ("PREPAYMENT_BALANCE".equals(paymentMethod)) {
             supplierFinanceService.deduct(
                 settlement.getSupplier().getId(), 
                 settlement.getTotalAmount(), 
                 settlement.getSettlementNo(), 
                 "Settlement Payment", 
                 operator
             );
        }
    }
    
    public List<SettlementOrder> getAll() {
        return settlementOrderRepository.findAll();
    }
}
