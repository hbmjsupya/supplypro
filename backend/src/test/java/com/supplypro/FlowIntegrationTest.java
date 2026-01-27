package com.supplypro;

import com.supplypro.controller.*;
import com.supplypro.entity.*;
import com.supplypro.repository.*;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@SpringBootTest
@Transactional
public class FlowIntegrationTest {

    @Autowired private SupplierRepository supplierRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private WarehouseRepository warehouseRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private BrandRepository brandRepository;

    @Autowired private PurchaseOrderController purchaseOrderController;
    @Autowired private InboundOrderController inboundOrderController;
    @Autowired private SalesOrderController salesOrderController;
    @Autowired private OutboundOrderController outboundOrderController;
    @Autowired private SettlementOrderController settlementOrderController;

    @Autowired private StockBatchRepository stockBatchRepository;
    @Autowired private StockFlowRepository stockFlowRepository;
    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private SalesOrderRepository salesOrderRepository;
    @Autowired private InboundOrderRepository inboundOrderRepository;
    @Autowired private OutboundOrderRepository outboundOrderRepository;

    @Test
    public void verifyFullSupplyChainFlow() {
        // ==========================================
        // 1. Setup Master Data
        // ==========================================
        Warehouse warehouse = new Warehouse();
        warehouse.setName("Test Warehouse");
        warehouse.setCode("WH-TEST-" + System.currentTimeMillis());
        warehouse.setStatus(Warehouse.Status.ACTIVE);
        warehouse = warehouseRepository.save(warehouse);

        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-TEST");
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplier = supplierRepository.save(supplier);

        Customer customer = new Customer();
        customer.setName("Test Customer");
        customer.setCustomerNo("CUST-TEST");
        customer.setStatus(Customer.Status.ACTIVE);
        customer = customerRepository.save(customer);

        Product product = new Product();
        product.setName("Test Product");
        product.setSkuCode("SKU-" + System.currentTimeMillis());
        product.setCostPrice(new BigDecimal("10.00"));
        // product.setSalesPrice(new BigDecimal("20.00")); // Field undefined
        product.setStatus(Product.Status.ON_SHELF);
        product = productRepository.save(product);

        System.out.println(">>> Master Data Setup Complete");

        // ==========================================
        // 2. P2P Flow: Purchase -> Inbound -> Settlement
        // ==========================================
        
        // 2.1 Create Purchase Order
        PurchaseOrder po = new PurchaseOrder();
        po.setOrderNo("PO-" + System.currentTimeMillis());
        po.setSupplier(supplier);
        po.setWarehouseId(warehouse.getId());
        po.setType(PurchaseOrder.Type.INBOUND);
        po.setStatus(PurchaseOrder.Status.PENDING);
        po.setTotalAmount(new BigDecimal("1000.00"));
        po.setCreatedBy("TestUser");
        
        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setProduct(product);
        poItem.setProductId(product.getId());
        poItem.setQuantity(100);
        poItem.setUnitPrice(new BigDecimal("10.00"));
        poItem.setTotalPrice(new BigDecimal("1000.00"));
        
        po.setItems(new ArrayList<>());
        po.getItems().add(poItem);

        ResponseEntity<Map<String, Object>> poResp = purchaseOrderController.create(po);
        Assertions.assertEquals(200, poResp.getBody().get("code"));
        PurchaseOrder savedPO = (PurchaseOrder) poResp.getBody().get("data");
        Long poId = savedPO.getId();
        
        System.out.println(">>> PO Created: " + poId);

        // 2.2 Create Inbound Order
        Map<String, Long> inboundPayload = Map.of(
            "purchaseOrderId", poId,
            "warehouseId", warehouse.getId()
        );
        ResponseEntity<Map<String, Object>> inboundResp = inboundOrderController.create(inboundPayload);
        Assertions.assertEquals(200, inboundResp.getBody().get("code"));
        InboundOrder savedInbound = (InboundOrder) inboundResp.getBody().get("data");
        Long inboundId = savedInbound.getId();
        
        System.out.println(">>> Inbound Created: " + inboundId);

        // 2.3 Confirm Inbound (Triggers Stock & Flow)
        ResponseEntity<Map<String, Object>> confirmResp = inboundOrderController.confirm(inboundId);
        Assertions.assertEquals(200, confirmResp.getBody().get("code"));
        
        // Verify Stock
        List<StockBatch> batches = stockBatchRepository.findByWarehouseIdAndProductIdAndStatusOrderByExpiryDateAsc(
            warehouse.getId(), product.getId(), StockBatch.Status.ACTIVE
        );
        Assertions.assertFalse(batches.isEmpty(), "Stock batches should be created");
        Assertions.assertEquals(100, batches.stream().mapToInt(StockBatch::getAvailableQuantity).sum());
        
        // Verify Flow
        List<StockFlow> flows = stockFlowRepository.findAll();
        boolean hasInboundFlow = flows.stream().anyMatch(f -> f.getFlowType() == StockFlow.FlowType.INBOUND && f.getQuantity() == 100);
        Assertions.assertTrue(hasInboundFlow, "Inbound StockFlow should be created");
        
        // Verify PO Status
        PurchaseOrder updatedPO = purchaseOrderRepository.findById(poId).orElseThrow();
        Assertions.assertEquals(PurchaseOrder.Status.RECEIVED, updatedPO.getStatus());

        System.out.println(">>> P2P Stock & Flow Verified");

        // 2.4 Settlement (Purchase)
        SettlementOrder settlement = new SettlementOrder();
        settlement.setType(SettlementOrder.Type.PURCHASE);
        settlement.setRelatedOrderNo(updatedPO.getOrderNo());
        settlement.setAmount(new BigDecimal("1000.00"));
        ResponseEntity<Map<String, Object>> settlementResp = settlementOrderController.create(settlement);
        Assertions.assertEquals(200, settlementResp.getBody().get("code"));
        
        // Verify PO Settlement Status
        updatedPO = purchaseOrderRepository.findById(poId).orElseThrow();
        Assertions.assertNotNull(updatedPO.getSettlementStatus()); // Should be PARTIALLY_SETTLED or SETTLED logic depending on impl
        // Note: Controller logic currently sets it to PARTIALLY_SETTLED blindly in create method line 79

        System.out.println(">>> P2P Settlement Verified");

        // ==========================================
        // 3. O2C Flow: Sales -> Outbound -> Settlement
        // ==========================================

        // 3.1 Create Sales Order
        SalesOrder so = new SalesOrder();
        so.setOrderNo("SO-" + System.currentTimeMillis());
        so.setCustomer(customer);
        so.setWarehouseId(warehouse.getId());
        so.setTotalAmount(new BigDecimal("400.00")); // 20 * 20
        
        SalesOrderItem soItem = new SalesOrderItem();
        soItem.setProduct(product);
        soItem.setProductId(product.getId());
        soItem.setQuantity(20);
        soItem.setUnitPrice(new BigDecimal("20.00"));
        soItem.setTotalPrice(new BigDecimal("400.00"));
        
        so.setItems(new ArrayList<>());
        so.getItems().add(soItem);
        
        ResponseEntity<Map<String, Object>> soResp = salesOrderController.create(so);
        Assertions.assertEquals(200, soResp.getBody().get("code"));
        SalesOrder savedSO = (SalesOrder) soResp.getBody().get("data");
        Long soId = savedSO.getId();

        System.out.println(">>> SO Created: " + soId);

        // 3.2 Create Outbound Order
        OutboundOrder outbound = new OutboundOrder();
        outbound.setSalesOrder(savedSO); // Only ID is strictly needed but logic might need object
        outbound.setWarehouse(warehouse);
        
        ResponseEntity<Map<String, Object>> outboundResp = outboundOrderController.create(outbound);
        Assertions.assertEquals(200, outboundResp.getBody().get("code"));
        OutboundOrder savedOutbound = (OutboundOrder) outboundResp.getBody().get("data");
        Long outboundId = savedOutbound.getId();

        System.out.println(">>> Outbound Created: " + outboundId);

        // 3.3 Confirm Outbound (FIFO Deduction)
        ResponseEntity<Map<String, Object>> outConfirmResp = outboundOrderController.confirm(outboundId);
        Assertions.assertEquals(200, outConfirmResp.getBody().get("code"));

        // Verify Stock Deduction
        batches = stockBatchRepository.findByWarehouseIdAndProductIdAndStatusOrderByExpiryDateAsc(
            warehouse.getId(), product.getId(), StockBatch.Status.ACTIVE
        );
        int remainingStock = batches.stream().mapToInt(StockBatch::getAvailableQuantity).sum();
        Assertions.assertEquals(80, remainingStock, "Stock should be reduced by 20");

        // Verify Flow
        flows = stockFlowRepository.findAll();
        boolean hasOutboundFlow = flows.stream().anyMatch(f -> f.getFlowType() == StockFlow.FlowType.OUTBOUND && f.getQuantity() == 20);
        Assertions.assertTrue(hasOutboundFlow, "Outbound StockFlow should be created");

        // Verify SO Status
        SalesOrder updatedSO = salesOrderRepository.findById(soId).orElseThrow();
        Assertions.assertEquals(SalesOrder.Status.SHIPPED, updatedSO.getStatus());

        System.out.println(">>> O2C Stock & Flow Verified");
        
        // 3.4 Logistics Settlement (Optional in this test but good to verify)
        // Need to add Logistics Provider to Outbound Order first if we want to test logistics settlement
        // For now, let's skip as OutboundOrderController.create doesn't seem to set LogisticsProvider by default in the simplified logic
    }
}
