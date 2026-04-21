package com.supplypro.service;

import com.supplypro.dto.BatchDistributeRequest;
import com.supplypro.entity.*;
import com.supplypro.repository.*;
import com.supplypro.service.impl.WarehouseServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class StockFlowSpecNameTest {

    @Autowired
    private WarehouseServiceImpl warehouseService;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SkuRepository skuRepository;

    @Autowired
    private StockFlowRepository stockFlowRepository;

    private Warehouse warehouse1;
    private Warehouse warehouse2;
    private Product product;
    private Sku sku;

    @BeforeEach
    public void setup() {
        warehouse1 = new Warehouse();
        warehouse1.setName("Test Warehouse 1");
        warehouse1.setCode("TW001");
        warehouseRepository.save(warehouse1);

        warehouse2 = new Warehouse();
        warehouse2.setName("Test Warehouse 2");
        warehouse2.setCode("TW002");
        warehouseRepository.save(warehouse2);

        product = new Product();
        product.setName("Test Product");
        product.setSkuCode("TP001");
        product.setStatus(Product.Status.ON_SHELF);
        productRepository.save(product);

        sku = new Sku();
        sku.setProduct(product);
        sku.setSpecification("Test Spec");
        sku.setSkuCode("SKU001");
        skuRepository.save(sku);

        product.setSkus(Arrays.asList(sku));
        productRepository.save(product);
    }

    @Test
    public void testBatchDistributeCreatesStockFlowWithCorrectSpecName() {
        BatchDistributeRequest request = new BatchDistributeRequest();
        request.setWarehouseIds(Arrays.asList(warehouse1.getId(), warehouse2.getId()));
        
        BatchDistributeRequest.DistributeItem item = new BatchDistributeRequest.DistributeItem();
        item.setProductId(product.getId());
        item.setQuantity(10);
        item.setUnitCost(new BigDecimal("100.00"));
        
        request.setItems(Arrays.asList(item));

        System.out.println("Before batchDistribute - Product: " + product.getId() + ", SKU: " + sku.getSkuCode() + ", Spec: " + sku.getSpecification());
        warehouseService.batchDistributeProducts(request);
        System.out.println("After batchDistribute - Stock flows created: " + stockFlowRepository.findAll().size());

        List<StockFlow> flows = stockFlowRepository.findAll();
        assertFalse(flows.isEmpty(), "Stock flows should be created");

        for (StockFlow flow : flows) {
            if (flow.getProduct().getId().equals(product.getId())) {
                assertNotNull(flow.getSpecName(), "SpecName should not be null");
                assertEquals("Test Spec", flow.getSpecName(), "SpecName should match the SKU specification");
            }
        }
    }
}
