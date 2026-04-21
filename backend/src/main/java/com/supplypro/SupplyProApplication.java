package com.supplypro;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;
import javax.annotation.PostConstruct;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class SupplyProApplication implements CommandLineRunner {

    @Autowired(required = false)
    private com.supplypro.service.DeliveryNoMigrationService deliveryNoMigrationService;

    @Autowired(required = false)
    private com.supplypro.service.DocumentNumberMigrationService documentNumberMigrationService;

    @PostConstruct
    void started() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Shanghai"));
    }

    public static void main(String[] args) {
        SpringApplication.run(SupplyProApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        // Migrate existing delivery numbers on startup
        if (deliveryNoMigrationService != null) {
            try {
                deliveryNoMigrationService.migrateDeliveryNos();
            } catch (Exception e) {
                System.err.println("DeliveryNo migration failed: " + e.getMessage());
            }
        }
        
        // Migrate document number formats (DO -> PS, PS -> JS)
        if (documentNumberMigrationService != null) {
            try {
                documentNumberMigrationService.migrateDocumentNumbers();
            } catch (Exception e) {
                System.err.println("DocumentNumber migration failed: " + e.getMessage());
            }
        }
    }
}
