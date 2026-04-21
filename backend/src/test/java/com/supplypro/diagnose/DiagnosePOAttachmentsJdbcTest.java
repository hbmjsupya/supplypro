package com.supplypro.diagnose;

import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;

public class DiagnosePOAttachmentsJdbcTest {

    private static final Logger logger = LoggerFactory.getLogger(DiagnosePOAttachmentsJdbcTest.class);
    
    private static final String DB_URL = "jdbc:mysql://127.0.0.1:3307/supplypro?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=utf-8";
    private static final String DB_USER = "root";
    private static final String DB_PASS = "password";

    @Test
    public void diagnosePO() {
        String targetNo = "C202603031619002";
        logger.info("Starting diagnosis for PO: {}", targetNo);

        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS)) {
            String query = "SELECT id, order_no, delivery_method, attachments FROM purchase_orders WHERE order_no = ?";
            
            try (PreparedStatement ps = conn.prepareStatement(query)) {
                ps.setString(1, targetNo);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        logger.info("Found PO: ID={}, OrderNo={}, DeliveryMethod={}, Attachments={}", 
                            rs.getLong("id"), rs.getString("order_no"), rs.getString("delivery_method"), rs.getString("attachments"));
                    } else {
                        logger.error("PO NOT FOUND: {}", targetNo);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error during diagnosis", e);
            throw new RuntimeException(e);
        }
    }
}
