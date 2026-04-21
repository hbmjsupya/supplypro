package com.supplypro.fix;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/supplypro",
    "spring.datasource.username=root",
    "spring.datasource.password=password",
    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.flyway.enabled=false"
})
public class ResetPurchaseOrderLogisticsTest {

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final String backupDir = "backups/logistics_reset";

    @Test
    @Transactional
    @Rollback(false)
    public void resetLogisticsForOrders() throws Exception {
        String[] targetOrderNos = {"C202603051729005", "C202603051738001"};
        String operator = "admin_reset_agent";
        String reason = "Reset Logistics Info - Invalid Tracking Number";

        System.out.println(">>> Starting Logistics Reset Process");
        System.out.println(">>> Target Orders: " + String.join(", ", targetOrderNos));
        System.out.println(">>> Operator: " + operator);
        System.out.println(">>> Reason: " + reason);
        System.out.println();

        File directory = new File(backupDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

        for (String orderNo : targetOrderNos) {
            System.out.println("=== Processing Order: " + orderNo + " ===");
            
            PurchaseOrder order = purchaseOrderRepository.findByOrderNo(orderNo);
            if (order == null) {
                System.out.println("!!! Order not found: " + orderNo);
                continue;
            }

            System.out.println("    - Order ID: " + order.getId());
            System.out.println("    - Current Status: " + order.getStatus());
            System.out.println("    - Current Shipping Status: " + order.getShippingStatus());
            System.out.println("    - Tracking Number: " + order.getTrackingNumber());
            System.out.println("    - Logistics Company: " + order.getLogisticsCompany());
            System.out.println("    - Logistics Fee: " + order.getLogisticsFee());

            BackupData backupData = new BackupData();
            backupData.orderNo = orderNo;
            backupData.orderId = order.getId();
            backupData.originalStatus = order.getStatus() != null ? order.getStatus().name() : null;
            backupData.originalShippingStatus = order.getShippingStatus() != null ? order.getShippingStatus().name() : null;
            backupData.originalTrackingNumber = order.getTrackingNumber();
            backupData.originalLogisticsCompany = order.getLogisticsCompany();
            backupData.originalLogisticsFee = order.getLogisticsFee();
            backupData.originalDeliveryMethod = order.getDeliveryMethod();
            backupData.originalShippedAt = order.getShippedAt();
            backupData.originalDeliverer = order.getDeliverer();
            backupData.originalDelivererPhone = order.getDelivererPhone();
            backupData.originalPlateNumber = order.getPlateNumber();
            backupData.originalLogisticsProviderId = order.getLogisticsProvider() != null ? order.getLogisticsProvider().getId() : null;
            backupData.operator = operator;
            backupData.operationTime = LocalDateTime.now();
            backupData.reason = reason;

            List<SettlementOrder> settlementOrders = settlementOrderRepository.findByRelatedOrderNo(orderNo);
            System.out.println("    - Found " + settlementOrders.size() + " related settlement orders");
            
            for (SettlementOrder so : settlementOrders) {
                System.out.println("      - Settlement ID: " + so.getId() + ", DeliveryNo: " + so.getDeliveryNo() + ", Status: " + so.getStatus() + ", Type: " + so.getType());
            }
            backupData.settlementOrders = settlementOrders;

            String backupFileName = backupDir + "/backup_" + orderNo + "_" + timestamp + ".json";
            try {
                objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(backupFileName), backupData);
                System.out.println("    - Backup created: " + backupFileName);
            } catch (IOException e) {
                System.out.println("!!! Backup failed: " + e.getMessage());
                throw e;
            }

            boolean hasLogisticsSettlement = settlementOrders.stream()
                .anyMatch(so -> so.getType() == SettlementOrder.Type.LOGISTICS);
            
            if (hasLogisticsSettlement) {
                System.out.println("    - Deleting LOGISTICS type settlement orders...");
                for (SettlementOrder so : settlementOrders) {
                    if (so.getType() == SettlementOrder.Type.LOGISTICS) {
                        if (so.getStatus() == SettlementOrder.Status.PENDING) {
                            System.out.println("      - Deleting settlement order: " + so.getDeliveryNo());
                            settlementOrderRepository.delete(so);
                        } else {
                            System.out.println("      - WARNING: Settlement order " + so.getDeliveryNo() + " has status " + so.getStatus() + ", skipping deletion");
                        }
                    }
                }
            }

            System.out.println("    - Resetting logistics fields...");
            order.setLogisticsCompany(null);
            order.setTrackingNumber(null);
            order.setShippedAt(null);
            order.setDeliverer(null);
            order.setDelivererPhone(null);
            order.setPlateNumber(null);
            order.setLogisticsFee(BigDecimal.ZERO);
            order.setDeliveryMethod(null);
            order.setLogisticsProvider(null);
            order.setLogisticsSupplierName(null);
            order.setShippingStatus(PurchaseOrder.ShippingStatus.PENDING);
            
            if (order.getStatus() == PurchaseOrder.Status.SHIPPED) {
                order.setStatus(PurchaseOrder.Status.PENDING);
                System.out.println("    - Status reset from SHIPPED to PENDING");
            }

            purchaseOrderRepository.save(order);
            System.out.println("    - Order saved successfully");

            String rollbackScript = generateRollbackScript(order, backupData);
            String rollbackFile = backupDir + "/rollback_" + orderNo + "_" + timestamp + ".sql";
            Files.write(Paths.get(rollbackFile), rollbackScript.getBytes());
            System.out.println("    - Rollback SQL generated: " + rollbackFile);

            System.out.println("=== Order " + orderNo + " Reset Complete ===\n");
        }

        System.out.println("\n=== FINAL VERIFICATION ===");
        for (String orderNo : targetOrderNos) {
            PurchaseOrder order = purchaseOrderRepository.findByOrderNo(orderNo);
            if (order != null) {
                System.out.println("Order: " + orderNo);
                System.out.println("  Status: " + order.getStatus());
                System.out.println("  Shipping Status: " + order.getShippingStatus());
                System.out.println("  Tracking Number: " + (order.getTrackingNumber() != null ? order.getTrackingNumber() : "NULL (Cleared)"));
                System.out.println("  Logistics Company: " + (order.getLogisticsCompany() != null ? order.getLogisticsCompany() : "NULL (Cleared)"));
                
                List<SettlementOrder> remainingSettlements = settlementOrderRepository.findByRelatedOrderNo(orderNo);
                long logisticsCount = remainingSettlements.stream()
                    .filter(so -> so.getType() == SettlementOrder.Type.LOGISTICS)
                    .count();
                System.out.println("  Remaining LOGISTICS Settlement Orders: " + logisticsCount);
                System.out.println();
            }
        }
        System.out.println("=== OPERATION COMPLETE ===");
    }

    private String generateRollbackScript(PurchaseOrder order, BackupData backup) {
        StringBuilder sql = new StringBuilder();
        sql.append("-- Rollback script for order: ").append(order.getOrderNo()).append("\n");
        sql.append("-- Generated at: ").append(LocalDateTime.now()).append("\n\n");
        
        sql.append("UPDATE purchase_orders SET ");
        sql.append("status = '").append(backup.originalStatus).append("', ");
        sql.append("shipping_status = '").append(backup.originalShippingStatus).append("', ");
        sql.append("tracking_number = ").append(quote(backup.originalTrackingNumber)).append(", ");
        sql.append("logistics_company = ").append(quote(backup.originalLogisticsCompany)).append(", ");
        sql.append("logistics_fee = ").append(backup.originalLogisticsFee != null ? backup.originalLogisticsFee : "NULL").append(", ");
        sql.append("delivery_method = ").append(quote(backup.originalDeliveryMethod)).append(", ");
        sql.append("shipped_at = ").append(backup.originalShippedAt != null ? "NOW()" : "NULL").append(", ");
        sql.append("deliverer = ").append(quote(backup.originalDeliverer)).append(", ");
        sql.append("deliverer_phone = ").append(quote(backup.originalDelivererPhone)).append(", ");
        sql.append("plate_number = ").append(quote(backup.originalPlateNumber)).append(", ");
        sql.append("logistics_provider_id = ").append(backup.originalLogisticsProviderId != null ? backup.originalLogisticsProviderId : "NULL");
        sql.append(" WHERE id = ").append(order.getId()).append(";\n");
        
        return sql.toString();
    }

    private String quote(String val) {
        return val == null ? "NULL" : "'" + val.replace("'", "''") + "'";
    }

    static class BackupData {
        public String orderNo;
        public Long orderId;
        public String originalStatus;
        public String originalShippingStatus;
        public String originalTrackingNumber;
        public String originalLogisticsCompany;
        public BigDecimal originalLogisticsFee;
        public String originalDeliveryMethod;
        public LocalDateTime originalShippedAt;
        public String originalDeliverer;
        public String originalDelivererPhone;
        public String originalPlateNumber;
        public Long originalLogisticsProviderId;
        public String operator;
        public LocalDateTime operationTime;
        public String reason;
        public List<SettlementOrder> settlementOrders;
    }
}
