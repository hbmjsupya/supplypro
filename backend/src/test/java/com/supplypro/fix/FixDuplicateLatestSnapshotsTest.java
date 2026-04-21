package com.supplypro.fix;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import java.math.BigInteger;
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
public class FixDuplicateLatestSnapshotsTest {

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    public void fixDuplicateLatestSnapshots() {
        System.out.println("=== Starting Fix for Duplicate Latest Snapshots ===");
        
        // Step 1: Find all purchase_order_ids that have multiple is_latest=true records
        Query findDuplicates = entityManager.createNativeQuery(
            "SELECT purchase_order_id FROM purchase_order_snapshots " +
            "WHERE is_latest = true GROUP BY purchase_order_id HAVING COUNT(*) > 1");
        
        @SuppressWarnings("unchecked")
        List<BigInteger> duplicatePOIds = findDuplicates.getResultList();
        
        System.out.println("Found " + duplicatePOIds.size() + " purchase orders with duplicate latest snapshots");
        
        int fixedCount = 0;
        
        // Step 2: For each duplicate, keep only the latest one (highest id)
        for (BigInteger poId : duplicatePOIds) {
            Long poIdLong = poId.longValue();
            
            // Find the max id for this purchase_order_id
            Query findMaxId = entityManager.createNativeQuery(
                "SELECT MAX(id) FROM purchase_order_snapshots WHERE purchase_order_id = :poId");
            findMaxId.setParameter("poId", poIdLong);
            BigInteger maxId = (BigInteger) findMaxId.getSingleResult();
            
            // Get the status of the latest snapshot
            Query getStatus = entityManager.createNativeQuery(
                "SELECT status FROM purchase_order_snapshots WHERE id = :maxId");
            getStatus.setParameter("maxId", maxId.longValue());
            String latestStatus = (String) getStatus.getSingleResult();
            
            System.out.println("  - PO ID " + poIdLong + ": Latest snapshot (id=" + maxId + ") has status: " + latestStatus);
            
            // Set all to false for this purchase_order_id
            Query setAllFalse = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots SET is_latest = false WHERE purchase_order_id = :poId");
            setAllFalse.setParameter("poId", poIdLong);
            setAllFalse.executeUpdate();
            
            // Set the latest one (highest id) to true
            Query setLatestTrue = entityManager.createNativeQuery(
                "UPDATE purchase_order_snapshots SET is_latest = true WHERE id = :maxId");
            setLatestTrue.setParameter("maxId", maxId.longValue());
            fixedCount += setLatestTrue.executeUpdate();
            
            System.out.println("    Fixed: Only snapshot id=" + maxId + " is now latest");
        }
        
        // Step 3: Verify fix
        Query verifyDuplicates = entityManager.createNativeQuery(
            "SELECT COUNT(*) FROM (SELECT purchase_order_id FROM purchase_order_snapshots " +
            "WHERE is_latest = true GROUP BY purchase_order_id HAVING COUNT(*) > 1) as duplicates");
        BigInteger remainingDuplicates = (BigInteger) verifyDuplicates.getSingleResult();
        
        System.out.println("\n=== Fix Complete ===");
        System.out.println("Fixed " + fixedCount + " snapshots");
        System.out.println("Remaining duplicates: " + remainingDuplicates.intValue());
        
        // Step 4: Verify specific order C202603051744001
        Query checkOrder = entityManager.createNativeQuery(
            "SELECT id, status, is_latest FROM purchase_order_snapshots " +
            "WHERE purchase_order_id = (SELECT id FROM purchase_orders WHERE order_no = 'C202603051744001') " +
            "ORDER BY id DESC LIMIT 5");
        @SuppressWarnings("unchecked")
        List<Object[]> orderSnapshots = checkOrder.getResultList();
        
        System.out.println("\n=== Order C202603051744001 Snapshots ===");
        for (Object[] row : orderSnapshots) {
            System.out.println("  ID: " + row[0] + ", Status: " + row[1] + ", IsLatest: " + row[2]);
        }
        
        // Step 5: Verify status summary for product "测试商品02"
        Query statusSummary = entityManager.createNativeQuery(
            "SELECT pos.status, COUNT(DISTINCT pos.purchase_order_id) as count " +
            "FROM purchase_order_snapshots pos " +
            "INNER JOIN purchase_orders po ON po.id = pos.purchase_order_id " +
            "WHERE pos.is_latest = true AND pos.snapshot_data IS NOT NULL " +
            "AND pos.snapshot_data != '' AND pos.snapshot_data != '{}' " +
            "AND (pos.product_names LIKE '%测试商品02%' OR pos.product_specs LIKE '%测试商品02%') " +
            "GROUP BY pos.status");
        
        @SuppressWarnings("unchecked")
        List<Object[]> summary = statusSummary.getResultList();
        
        System.out.println("\n=== Status Summary for '测试商品02' ===");
        for (Object[] row : summary) {
            System.out.println("  Status: " + row[0] + ", Count: " + row[1]);
        }
        
        assert remainingDuplicates.intValue() == 0 : "Should have no duplicate latest snapshots";
    }
}
