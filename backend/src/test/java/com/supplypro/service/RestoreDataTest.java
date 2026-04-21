package com.supplypro.service;

import com.supplypro.controller.PurchaseOrderController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test") 
public class RestoreDataTest {

    @Autowired
    private PurchaseOrderController purchaseOrderController;

    @Test
    public void testRestoreFromSnapshots() {
        System.out.println("Starting Data Restoration & Repair...");
        try {
            var response = purchaseOrderController.restoreFromSnapshots();
            System.out.println("Restore Response: " + response.getBody());
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
        System.out.println("Data Restoration Completed.");
    }
}
