package com.supplypro.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Data Quality Monitor
 * Periodically checks for data integrity issues, specifically null product IDs.
 */
@Component
public class DataQualityMonitor {

    private static final Logger logger = LoggerFactory.getLogger(DataQualityMonitor.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Run every hour
    @Scheduled(fixedRate = 3600000)
    public void checkNullProductIds() {
        logger.info("Starting Data Quality Check for Null Product IDs...");

        Map<String, String> tablesToCheck = new HashMap<>();
        tablesToCheck.put("sales_order_items", "product_id");
        tablesToCheck.put("purchase_order_items", "product_id");
        tablesToCheck.put("inbound_order_items", "product_id");
        tablesToCheck.put("stock_batches", "product_id");
        tablesToCheck.put("stock_flows", "product_id");

        boolean issuesFound = false;

        for (Map.Entry<String, String> entry : tablesToCheck.entrySet()) {
            String tableName = entry.getKey();
            String columnName = entry.getValue();

            try {
                String sql = "SELECT COUNT(*) FROM " + tableName + " WHERE " + columnName + " IS NULL";
                Integer count = jdbcTemplate.queryForObject(sql, Integer.class);

                if (count != null && count > 0) {
                    logger.error("DATA QUALITY ALERT: Found {} records with NULL {} in table {}", count, columnName, tableName);
                    issuesFound = true;
                } else {
                    logger.debug("Table {} check passed (0 nulls).", tableName);
                }
            } catch (Exception e) {
                logger.error("Failed to check table {}: {}", tableName, e.getMessage());
            }
        }

        if (!issuesFound) {
            logger.info("Data Quality Check completed: No null Product IDs found.");
        } else {
            logger.warn("Data Quality Check completed with ERRORS. Check logs for details.");
        }
    }

    /**
     * Check Purchase Order and Inbound Order Integrity
     */
    @Scheduled(fixedRate = 3600000)
    public void checkPurchaseOrderIntegrity() {
        logger.info("Starting Purchase Order Integrity Check...");
        
        // 1. Check for INBOUND POs without associated InboundOrder
        // Logic: PO is INBOUND and status is CONFIRMED or SHIPPED, but no record in inbound_orders points to it.
        // Note: PO status GENERATED_INBOUND is deprecated/removed. We assume creation should happen on confirmation.
        // We only check for anomalies where an inbound order *should* exist but doesn't.
        // However, without a specific status indicating "Inbound Generated", we rely on the existence of Inbound Order for INBOUND type POs.
        // If PO is INBOUND, an Inbound Order should usually be created.
        String sqlOrphanPO = "SELECT count(*) FROM purchase_orders po " +
                             "LEFT JOIN inbound_orders io ON io.purchase_order_id = po.id " +
                             "WHERE po.type = 'INBOUND' AND po.status IN ('CONFIRMED', 'SHIPPED') AND io.id IS NULL";
        
        try {
            Integer count = jdbcTemplate.queryForObject(sqlOrphanPO, Integer.class);
            if (count != null && count > 0) {
                logger.warn("DATA QUALITY ALERT: Found {} INBOUND Purchase Orders (CONFIRMED/SHIPPED) without associated Inbound Order!", count);
            }
        } catch (Exception e) {
            logger.error("Failed to check Orphan POs: {}", e.getMessage());
        }

        // 2. Check for Inbound Orders with missing Warehouse
        String sqlMissingWarehouse = "SELECT count(*) FROM inbound_orders WHERE warehouse_id IS NULL";
        try {
            Integer count = jdbcTemplate.queryForObject(sqlMissingWarehouse, Integer.class);
            if (count != null && count > 0) {
                logger.error("DATA QUALITY ALERT: Found {} Inbound Orders with NULL Warehouse ID!", count);
            }
        } catch (Exception e) {
             logger.error("Failed to check Inbound Order Warehouse: {}", e.getMessage());
        }
        
        // 3. Check for Purchase Orders with missing Supplier
        String sqlMissingSupplier = "SELECT count(*) FROM purchase_orders WHERE supplier_id IS NULL";
        try {
            Integer count = jdbcTemplate.queryForObject(sqlMissingSupplier, Integer.class);
            if (count != null && count > 0) {
                logger.error("DATA QUALITY ALERT: Found {} Purchase Orders with NULL Supplier ID!", count);
            }
        } catch (Exception e) {
            logger.error("Failed to check PO Supplier: {}", e.getMessage());
        }

        logger.info("Purchase Order Integrity Check completed.");
    }

    /**
     * Check consistency between Purchase Order Status Summary and List View
     * Ensure total counts match and no data corruption exists.
     */
    @Scheduled(fixedRate = 1800000) // Run every 30 minutes
    public void checkStatusSummaryConsistency() {
        logger.info("Starting Status Summary Consistency Check...");

        // 1. Check for Corrupted Snapshots (is_latest=true but snapshot_data is NULL)
        // These are excluded from status summary but might cause list view issues if not filtered
        String sqlCorrupted = "SELECT COUNT(*) FROM purchase_order_snapshots WHERE is_latest = true AND snapshot_data IS NULL";
        try {
            Integer count = jdbcTemplate.queryForObject(sqlCorrupted, Integer.class);
            if (count != null && count > 0) {
                logger.error("DATA CONSISTENCY ALERT: Found {} corrupted latest snapshots (snapshot_data IS NULL). " +
                        "These will cause discrepancy between Status Summary and List View total!", count);
            }
        } catch (Exception e) {
            logger.error("Failed to check corrupted snapshots: {}", e.getMessage());
        }

        // 2. Check for Missing Snapshots (POs without is_latest=true snapshot)
        // This means the PO exists but won't show up in the snapshot-based list view
        String sqlMissingSnapshot = "SELECT COUNT(*) FROM purchase_orders po " +
                                    "LEFT JOIN purchase_order_snapshots s ON s.purchase_order_id = po.id AND s.is_latest = true " +
                                    "WHERE s.id IS NULL";
        try {
            Integer count = jdbcTemplate.queryForObject(sqlMissingSnapshot, Integer.class);
            if (count != null && count > 0) {
                logger.error("DATA CONSISTENCY ALERT: Found {} Purchase Orders without a latest snapshot! " +
                        "These orders are invisible in the snapshot-based list.", count);
            }
        } catch (Exception e) {
            logger.error("Failed to check missing snapshots: {}", e.getMessage());
        }

        // 3. Check for Duplicate Latest Snapshots (Multiple is_latest=true for same PO)
        // This causes inflated counts in status summary
        String sqlDuplicateLatest = "SELECT COUNT(*) FROM (SELECT purchase_order_id FROM purchase_order_snapshots " +
                                    "WHERE is_latest = true GROUP BY purchase_order_id HAVING COUNT(*) > 1) as duplicates";
        try {
            Integer count = jdbcTemplate.queryForObject(sqlDuplicateLatest, Integer.class);
            if (count != null && count > 0) {
                logger.error("DATA CONSISTENCY ALERT: Found {} Purchase Orders with multiple latest snapshots! " +
                        "This causes incorrect status summary counts.", count);
            }
        } catch (Exception e) {
            logger.error("Failed to check duplicate latest snapshots: {}", e.getMessage());
        }

        logger.info("Status Summary Consistency Check completed.");
    }
}
