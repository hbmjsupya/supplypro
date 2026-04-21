package com.supplypro.service;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.entity.Warehouse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:mysql://localhost:3307/supplypro?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=utf-8",
    "spring.datasource.username=root",
    "spring.datasource.password=password",
    "spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect",
    "spring.jpa.hibernate.ddl-auto=none"
})
public class SettlementDateTest {

    @Autowired
    private SettlementService settlementService;

    @Autowired
    private SettlementOrderRepository settlementOrderRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Test
    @Transactional
    @Rollback(true)
    public void testCreateSettlementSetsCurrentDate() {
        // Setup
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-" + System.currentTimeMillis());
        supplier.setSettlementType(Supplier.SettlementType.PERIOD);
        supplier.setSettlementPeriod(30);
        supplier = supplierRepository.save(supplier);

        Warehouse warehouse = new Warehouse();
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-" + System.currentTimeMillis());
        warehouse = warehouseRepository.save(warehouse);

        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO-TEST-" + System.currentTimeMillis());
        po.setSupplier(supplier);
        po.setWarehouseId(warehouse.getId());
        po.setTotalAmount(new BigDecimal("100.00"));
        po.setType(PurchaseOrder.Type.STANDARD);
        po.setStatus(PurchaseOrder.Status.RECEIVED);
        po.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
        po.setCreatedBy("tester");
        po = purchaseOrderRepository.save(po);

        LocalDateTime beforeCreation = LocalDateTime.now();

        // Execute
        SettlementOrder so = settlementService.createSettlement(supplier.getId(), Collections.singletonList(po.getId()), "tester");

        LocalDateTime afterCreation = LocalDateTime.now();

        // Verify
        assertNotNull(so.getCreatedAt(), "CreatedAt should not be null");
        
        // Allow slight difference due to execution time, but should be within range
        long diffSeconds = ChronoUnit.SECONDS.between(beforeCreation, so.getCreatedAt());
        // Since so.getCreatedAt() is set inside, it should be >= beforeCreation
        // But if DB truncates millis, it might be slightly off.
        // Let's just check if it's close.
        
        assertTrue(so.getCreatedAt().isAfter(beforeCreation.minusSeconds(1)) || so.getCreatedAt().isEqual(beforeCreation), "CreatedAt too early");
        assertTrue(so.getCreatedAt().isBefore(afterCreation.plusSeconds(1)) || so.getCreatedAt().isEqual(afterCreation), "CreatedAt too late");
        
        System.out.println("Settlement Created At: " + so.getCreatedAt());
    }

    @Test
    @Transactional
    @Rollback(true)
    public void testCreateBatchSettlementSetsCurrentDate() {
        // Setup
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier Batch");
        supplier.setSupplierNo("SUP-B-" + System.currentTimeMillis());
        supplier.setSettlementType(Supplier.SettlementType.PERIOD);
        supplier.setSettlementPeriod(30);
        supplier = supplierRepository.save(supplier);

        LocalDateTime beforeCreation = LocalDateTime.now();

        // Execute
        SettlementOrder so = settlementService.createBatchSettlement(
            supplier.getId(), 
            "Purchase", 
            new BigDecimal("500.00"), 
            "tester", 
            null, 
            null
        );

        LocalDateTime afterCreation = LocalDateTime.now();

        // Verify
        assertNotNull(so.getCreatedAt(), "CreatedAt should not be null");
        assertTrue(so.getCreatedAt().isAfter(beforeCreation.minusSeconds(1)));
        assertTrue(so.getCreatedAt().isBefore(afterCreation.plusSeconds(1)));
        
        System.out.println("Batch Settlement Created At: " + so.getCreatedAt());
    }
}
