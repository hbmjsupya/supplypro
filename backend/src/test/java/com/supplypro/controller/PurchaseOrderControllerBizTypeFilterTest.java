package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderSnapshot;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.PurchaseOrderSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "admin", roles = {"ADMIN"})
public class PurchaseOrderControllerBizTypeFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseOrderSnapshotRepository purchaseOrderSnapshotRepository;

    @Autowired
    private com.supplypro.repository.SupplierRepository supplierRepository;

    private Long supplierId;

    @Autowired
    private com.supplypro.repository.WarehouseRepository warehouseRepository;

    private Long warehouseId;

    @BeforeEach
    public void setup() {
        purchaseOrderRepository.deleteAll();
        purchaseOrderSnapshotRepository.deleteAll();

        com.supplypro.entity.Supplier supplier = new com.supplypro.entity.Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-001");
        supplier.setStatus(com.supplypro.entity.Supplier.Status.ACTIVE);
        supplier.setSettlementType(com.supplypro.entity.Supplier.SettlementType.PREPAYMENT);
        supplier = supplierRepository.saveAndFlush(supplier);
        supplierId = supplier.getId();

        com.supplypro.entity.Warehouse warehouse = new com.supplypro.entity.Warehouse();
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-001");
        warehouse = warehouseRepository.saveAndFlush(warehouse);
        warehouseId = warehouse.getId();

        // 1. Legacy Inbound
        PurchaseOrder po1 = createPo("PO-101");
        createSnapshot(po1, "商品入库");

        // 2. New Inbound
        PurchaseOrder po2 = createPo("PO-102");
        createSnapshot(po2, "INBOUND");

        // 3. Legacy Platform
        PurchaseOrder po3 = createPo("PO-103");
        createSnapshot(po3, "OrderPurchase");

        // 4. New Platform
        PurchaseOrder po4 = createPo("PO-104");
        createSnapshot(po4, "PLATFORM");

        // 5. Legacy Replenishment
        PurchaseOrder po5 = createPo("PO-105");
        createSnapshot(po5, "ReplenishPurchase");

        // 6. New Replenishment
        PurchaseOrder po6 = createPo("PO-106");
        createSnapshot(po6, "REPLENISHMENT");
    }

    private PurchaseOrder createPo(String orderNo) {
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo(orderNo);
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setTotalAmount(BigDecimal.TEN);
        po.setType(PurchaseOrder.Type.STANDARD);
        po.setSupplierId(supplierId);
        po.setWarehouseId(warehouseId);
        return purchaseOrderRepository.saveAndFlush(po);
    }

    private void createSnapshot(PurchaseOrder po, String bizTypeStr) {
        PurchaseOrderSnapshot snapshot = new PurchaseOrderSnapshot();
        snapshot.setPurchaseOrderId(po.getId());
        snapshot.setOrderNo(po.getOrderNo());
        snapshot.setBizType(bizTypeStr);
        snapshot.setIsLatest(true);
        snapshot.setCreatedAt(java.time.LocalDateTime.now());
        snapshot.setCreatedBy("admin");
        snapshot.setSnapshotData("{}");
        snapshot.setSnapshotHash("dummy-hash");
        snapshot.setVersion(1);
        snapshot = purchaseOrderSnapshotRepository.saveAndFlush(snapshot);
        po.setCurrentSnapshot(snapshot);
        purchaseOrderRepository.saveAndFlush(po);
    }

    @Test
    public void testFilterInbound() throws Exception {
        mockMvc.perform(get("/api/purchase-orders")
                .param("bizType", "INBOUND")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(2)));
    }

    @Test
    public void testFilterPlatform() throws Exception {
        mockMvc.perform(get("/api/purchase-orders")
                .param("bizType", "PLATFORM")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(2)));
    }

    @Test
    public void testFilterReplenishment() throws Exception {
        mockMvc.perform(get("/api/purchase-orders")
                .param("bizType", "REPLENISHMENT")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records", hasSize(2)));
    }
}
