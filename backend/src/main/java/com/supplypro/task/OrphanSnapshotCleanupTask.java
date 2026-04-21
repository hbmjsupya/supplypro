package com.supplypro.task;

import com.supplypro.repository.PurchaseOrderSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 孤儿快照记录清理定时任务
 * 定期检查并清理快照表中purchase_order_id不存在于主表的孤儿记录
 */
@Component
public class OrphanSnapshotCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(OrphanSnapshotCleanupTask.class);
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * 每日凌晨2点执行孤儿快照记录检查与清理
     * cron表达式：秒 分 时 日 月 周
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOrphanSnapshots() {
        String startTime = LocalDateTime.now().format(formatter);
        log.info("========== [定时任务] 开始清理孤儿快照记录 ==========");
        log.info("执行时间: {}", startTime);
        
        long taskStartTime = System.currentTimeMillis();
        
        try {
            // 步骤1：查找孤儿快照记录数量
            log.info("[步骤1] 查找孤儿快照记录...");
            javax.persistence.Query findOrphans = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM purchase_order_snapshots pos " +
                "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id)");
            Long orphanCount = ((Number) findOrphans.getSingleResult()).longValue();
            log.info("发现孤儿快照记录: {} 条", orphanCount);
            
            // 步骤2：如果存在孤儿记录，记录详细信息并删除
            if (orphanCount > 0) {
                // 查找孤儿快照记录的详细信息（前10条）
                javax.persistence.Query findOrphanDetails = entityManager.createNativeQuery(
                    "SELECT pos.id, pos.purchase_order_id, pos.status, pos.version " +
                    "FROM purchase_order_snapshots pos " +
                    "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id) " +
                    "LIMIT 10");
                @SuppressWarnings("unchecked")
                List<Object[]> results = findOrphanDetails.getResultList();
                
                log.warn("发现孤儿快照记录详情（前10条）:");
                for (Object[] row : results) {
                    log.warn("  - 快照ID: {}, 采购单ID: {}, 状态: {}, 版本: {}", 
                        row[0], row[1], row[2], row[3]);
                }
                
                // 删除孤儿快照记录
                log.info("[步骤2] 删除孤儿快照记录...");
                javax.persistence.Query deleteOrphans = entityManager.createNativeQuery(
                    "DELETE FROM purchase_order_snapshots pos " +
                    "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id)");
                int deletedCount = deleteOrphans.executeUpdate();
                log.info("已删除孤儿快照记录: {} 条", deletedCount);
                
                // 发送通知（可以扩展为邮件或系统通知）
                sendNotification(orphanCount, deletedCount);
            } else {
                log.info("未发现孤儿快照记录，数据完整性良好");
            }
            
            long taskEndTime = System.currentTimeMillis();
            long duration = taskEndTime - taskStartTime;
            log.info("========== [定时任务] 清理孤儿快照记录完成，耗时: {} ms ==========", duration);
            
        } catch (Exception e) {
            log.error("[定时任务] 清理孤儿快照记录失败: {}", e.getMessage(), e);
            // 发送错误通知
            sendErrorNotification(e.getMessage());
        }
    }

    /**
     * 每小时执行一次数据完整性检查（仅检查不删除）
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void checkDataIntegrity() {
        log.info("========== [定时任务] 数据完整性检查 ==========");
        
        try {
            // 检查孤儿快照记录数量
            javax.persistence.Query findOrphans = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM purchase_order_snapshots pos " +
                "WHERE NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pos.purchase_order_id)");
            Long orphanCount = ((Number) findOrphans.getSingleResult()).longValue();
            
            // 检查重复的is_latest=true记录
            javax.persistence.Query findDuplicates = entityManager.createNativeQuery(
                "SELECT purchase_order_id, COUNT(*) as cnt FROM purchase_order_snapshots " +
                "WHERE is_latest = true GROUP BY purchase_order_id HAVING COUNT(*) > 1");
            @SuppressWarnings("unchecked")
            List<Object[]> duplicates = findDuplicates.getResultList();
            
            // 检查snapshot_data为null的记录
            javax.persistence.Query findNullData = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM purchase_order_snapshots WHERE snapshot_data IS NULL");
            Long nullDataCount = ((Number) findNullData.getSingleResult()).longValue();
            
            // 记录检查结果
            log.info("数据完整性检查结果:");
            log.info("  - 孤儿快照记录: {} 条", orphanCount);
            log.info("  - 重复is_latest=true记录: {} 个采购单", duplicates.size());
            log.info("  - snapshot_data为null记录: {} 条", nullDataCount);
            
            // 如果存在问题，记录警告
            if (orphanCount > 0 || !duplicates.isEmpty() || nullDataCount > 0) {
                log.warn("数据完整性检查发现异常，建议执行清理操作");
            }
            
        } catch (Exception e) {
            log.error("数据完整性检查失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 发送清理完成通知
     */
    private void sendNotification(long orphanCount, int deletedCount) {
        // 可以扩展为发送邮件或系统通知
        log.info("[通知] 孤儿快照记录清理完成: 发现 {} 条，删除 {} 条", orphanCount, deletedCount);
    }

    /**
     * 发送错误通知
     */
    private void sendErrorNotification(String errorMessage) {
        // 可以扩展为发送邮件或系统通知
        log.error("[通知] 孤儿快照记录清理失败: {}", errorMessage);
    }
}
