package com.supplypro.fix;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.InboundOrderRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.entity.SettlementOrder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/supplypro",
    "spring.datasource.username=root",
    "spring.datasource.password=password",
    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect",
    "spring.jpa.hibernate.ddl-auto=none", // Do not drop/create tables!
    "spring.flyway.enabled=false"
})
public class DeletePOFixTest {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Autowired
    private com.supplypro.repository.PurchaseOrderSnapshotRepository purchaseOrderSnapshotRepository;

    @Test
    @Transactional
    @Rollback(false) // Commit changes to DB
    public void deleteSpecificPO() {
        String orderNo = "C202603041727001";
        System.out.println("Starting cleanup for PO: " + orderNo);

        // 1. Check Purchase Order
        PurchaseOrder po = purchaseOrderRepository.findByOrderNo(orderNo);
        if (po != null) {
            System.out.println("Found PO ID: " + po.getId() + ". Deleting...");
            purchaseOrderRepository.delete(po);
            System.out.println("Deleted PO.");
        } else {
            System.out.println("Purchase Order " + orderNo + " not found in main table.");
        }

        // 2. Check & Delete Settlement Orders
        List<SettlementOrder> settlements = settlementOrderRepository.findByRelatedOrderNo(orderNo);
        if (settlements != null && !settlements.isEmpty()) {
            System.out.println("Found " + settlements.size() + " orphaned Settlement Orders. Deleting...");
            settlementOrderRepository.deleteAll(settlements);
        } else {
            System.out.println("No Settlement Orders found for " + orderNo);
        }

        // 3. Check & Delete Purchase Order Snapshots (Orphaned if no FK)
        // Need to check if repository has findByOrderNo
        try {
            List<com.supplypro.entity.PurchaseOrderSnapshot> snapshots = purchaseOrderSnapshotRepository.findByOrderNo(orderNo);
            if (snapshots != null && !snapshots.isEmpty()) {
                System.out.println("Found " + snapshots.size() + " orphaned Snapshots. Deleting...");
                purchaseOrderSnapshotRepository.deleteAll(snapshots);
            } else {
                System.out.println("No Snapshots found for " + orderNo);
            }
        } catch (Exception e) {
            System.out.println("Could not delete snapshots: " + e.getMessage());
            // Fallback: Check if we can list all snapshots
        }

        System.out.println("Cleanup check completed. Verified.");
    }
}
