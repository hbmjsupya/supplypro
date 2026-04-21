package com.supplypro.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(1)
public class EnumFixInitializer implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        fixPurchaseOrderStatusEnum();
        fixInboundOrderStatusEnum();
    }

    private void fixPurchaseOrderStatusEnum() {
        try {
            log.info("Checking purchase_orders status ENUM definition...");
            
            String checkSql = "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'status'";
            String columnType = jdbcTemplate.queryForObject(checkSql, String.class);
            
            log.info("Current purchase_orders status column type: {}", columnType);
            
            if (columnType != null && !columnType.contains("PENDING_SETTLEMENT")) {
                log.info("Fixing purchase_orders status ENUM definition...");
                
                jdbcTemplate.execute("UPDATE purchase_orders SET status = 'RECEIVED' WHERE status = 'COMPLETED'");
                
                String alterSql = "ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'RECEIVED', 'CANCELLED', 'PENDING_SETTLEMENT') DEFAULT 'PENDING' COMMENT '订单状态'";
                jdbcTemplate.execute(alterSql);
                
                log.info("Successfully fixed purchase_orders status ENUM definition");
            } else {
                log.info("purchase_orders status ENUM definition is already correct");
            }
        } catch (Exception e) {
            log.warn("Could not fix purchase_orders ENUM definition: {}", e.getMessage());
        }
    }

    private void fixInboundOrderStatusEnum() {
        try {
            log.info("Checking inbound_orders status ENUM definition...");
            
            String checkSql = "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inbound_orders' AND COLUMN_NAME = 'status'";
            String columnType = jdbcTemplate.queryForObject(checkSql, String.class);
            
            log.info("Current inbound_orders status column type: {}", columnType);
            
            // Always migrate old statuses first
            log.info("Migrating old inbound_orders statuses...");
            jdbcTemplate.execute("UPDATE inbound_orders SET status = 'RECEIVED' WHERE status IN ('SHIPPED', 'COMPLETED')");
            
            // Update ENUM definition to new values (without SHIPPED and COMPLETED)
            String alterSql = "ALTER TABLE inbound_orders MODIFY COLUMN status ENUM('PENDING', 'RECEIVED', 'CANCELLED') DEFAULT 'PENDING' COMMENT '状态'";
            jdbcTemplate.execute(alterSql);
            
            log.info("Successfully fixed inbound_orders status ENUM definition");
        } catch (Exception e) {
            log.warn("Could not fix inbound_orders ENUM definition: {}", e.getMessage());
        }
    }
}
