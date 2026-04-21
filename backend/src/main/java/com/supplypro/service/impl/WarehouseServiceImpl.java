package com.supplypro.service.impl;

import com.supplypro.dto.BatchDistributeRequest;
import com.supplypro.entity.*;
import com.supplypro.repository.*;
import com.supplypro.service.WarehouseService;
import com.supplypro.service.BatchNoGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.concurrent.atomic.AtomicInteger;
import javax.annotation.PostConstruct;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final StockBatchRepository stockBatchRepository;
    private final BatchNoGeneratorService batchNoGeneratorService;
    private final InboundOrderRepository inboundOrderRepository;
    private final OutboundOrderRepository outboundOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final StockFlowRepository stockFlowRepository;
    private final UserRepository userRepository;
    
    private final AtomicInteger sequence = new AtomicInteger(0);

    @PostConstruct
    public void init() {
        warehouseRepository.findTopByOrderByCodeDesc().ifPresent(w -> {
             String code = w.getCode();
             if (code != null && code.startsWith("WH")) {
                 try {
                     sequence.set(Integer.parseInt(code.substring(2)));
                 } catch (NumberFormatException e) {
                     // ignore
                 }
             }
        });
    }

    @Override
    public String generateNextCode() {
        return String.format("WH%05d", sequence.get() + 1);
    }

    @Override
    @Transactional
    public Warehouse createWarehouse(Warehouse warehouse, List<Long> managerIds) {
        // 1. Generate Code
        synchronized(this) { 
             int nextSeq = sequence.incrementAndGet();
             String nextCode = String.format("WH%05d", nextSeq);
             
             // Double check collision (in case of direct DB inserts or restart desync)
             while(warehouseRepository.existsByCode(nextCode)) {
                 nextSeq = sequence.incrementAndGet();
                 nextCode = String.format("WH%05d", nextSeq);
             }
             warehouse.setCode(nextCode);
        }
        
        // 2. Set Status Default
        if (warehouse.getStatus() == null) {
            warehouse.setStatus(Warehouse.Status.ACTIVE);
        }
        
        // 3. Bind Managers
        if (managerIds != null && !managerIds.isEmpty()) {
            Set<User> managers = new HashSet<>(userRepository.findAllById(managerIds));
            warehouse.setManagers(managers);
            // Legacy field sync - removed
        }
        
        return warehouseRepository.save(warehouse);
    }
    
    @Override
    @Transactional
    public Warehouse updateWarehouse(Long id, Warehouse warehouse, List<Long> managerIds) {
        return warehouseRepository.findById(id).map(existing -> {
            existing.setName(warehouse.getName());
            // Code is immutable
            existing.setProvince(warehouse.getProvince());
            existing.setCity(warehouse.getCity());
            existing.setDistrict(warehouse.getDistrict());
            existing.setProvinceCode(warehouse.getProvinceCode());
            existing.setCityCode(warehouse.getCityCode());
            existing.setDistrictCode(warehouse.getDistrictCode());
            existing.setAddress(warehouse.getAddress());
            existing.setStatus(warehouse.getStatus());
            
            if (managerIds != null) {
                Set<User> managers = new HashSet<>(userRepository.findAllById(managerIds));
                existing.setManagers(managers);
                // Legacy sync - removed
            }
            
            return warehouseRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Warehouse not found"));
    }

    @Override
    @Transactional
    public void updateStatus(Long id, Warehouse.Status status) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));
        warehouse.setStatus(status);
        warehouseRepository.save(warehouse);
    }

    @Override
    @Transactional
    public void deleteWarehouse(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        // 1. Delete Stock Batches (Inventory)
        stockBatchRepository.deleteByWarehouseId(id);

        // 2. Delete Stock Flows (History)
        stockFlowRepository.deleteByWarehouseId(id);

        // 3. Delete Inbound Orders
        inboundOrderRepository.deleteByWarehouseId(id);

        // 4. Delete Outbound Orders
        outboundOrderRepository.deleteByWarehouseId(id);

        // 5. Unlink/Delete Purchase Orders
        // Option A: Set warehouseId to null (if allowed)
        // Option B: Delete POs (if they are just draft/test)
        // Given user request "Disabled warehouse delete foreign key constraint", likely they want to remove impediments.
        // But POs might be important.
        // Let's assume for now we delete them if they are associated with this warehouse explicitly.
        // Or better: check if they are "PENDING". If "COMPLETED", we might have an issue.
        // However, the user asked for "Cascade Delete". So we delete.
        purchaseOrderRepository.deleteByWarehouseId(id);

        // 6. Delete Warehouse
        warehouseRepository.delete(warehouse);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> batchDistributeProducts(BatchDistributeRequest request) {
        int successProducts = 0;
        int skippedProducts = 0;
        int createdOrders = 0;

        if (request.getWarehouseIds() == null || request.getWarehouseIds().isEmpty()) {
            throw new IllegalArgumentException("Warehouse IDs are required");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Items are required");
        }

        List<Warehouse> warehouses = warehouseRepository.findAllById(request.getWarehouseIds());
        if (warehouses.isEmpty()) {
            throw new RuntimeException("No valid warehouses found");
        }

        // Pre-fetch products
        Set<Long> productIds = request.getItems().stream()
                .map(BatchDistributeRequest.DistributeItem::getProductId)
                .collect(Collectors.toSet());
        List<Product> products = productRepository.findAllById(productIds);
        Map<Long, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        for (Warehouse warehouse : warehouses) {
            boolean hasItems = false;
            InboundOrder inboundOrder = new InboundOrder();
            // Generate a simpler unique ID to avoid collisions in fast loops
            String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
            inboundOrder.setInboundNo("IN-" + System.currentTimeMillis() + "-" + uniqueSuffix);
            inboundOrder.setWarehouse(warehouse);
            inboundOrder.setStatus(InboundOrder.Status.RECEIVED);
            inboundOrder.setInboundDate(LocalDateTime.now());
            inboundOrder.setConfirmedBy("SYSTEM");
            
            List<InboundOrderItem> orderItems = new ArrayList<>();
            
            for (BatchDistributeRequest.DistributeItem item : request.getItems()) {
                Product product = productMap.get(item.getProductId());
                if (product == null) {
                    log.warn("Product ID {} not found", item.getProductId());
                    continue;
                }

                // 1. Check Status
                if (product.getStatus() != Product.Status.ON_SHELF) {
                     log.warn("Skipping product {} ({}) as status is {}", product.getId(), product.getName(), product.getStatus());
                     skippedProducts++;
                     continue;
                }

                // 2. Check Duplicate (Constraint: Prevent adding same product to same warehouse if already exists)
                if (stockBatchRepository.existsByProductIdAndWarehouseId(product.getId(), warehouse.getId())) {
                    log.info("Skipping product {} for warehouse {} as stock already exists", product.getId(), warehouse.getName());
                    skippedProducts++;
                    continue;
                }

                // 3. Determine Cost
                BigDecimal cost = item.getUnitCost();
                if (cost == null || cost.compareTo(BigDecimal.ZERO) == 0) {
                    if (product.getSkus() != null && !product.getSkus().isEmpty()) {
                        cost = product.getSkus().get(0).getCostPrice();
                    }
                    if (cost == null) cost = BigDecimal.ZERO;
                }

                // 4. Create Order Item
                InboundOrderItem orderItem = new InboundOrderItem();
                orderItem.setInboundOrder(inboundOrder);
                orderItem.setProduct(product);
                orderItem.setQuantity(item.getQuantity());
                orderItem.setUnitCost(cost);
                orderItem.setTotalCost(cost.multiply(BigDecimal.valueOf(item.getQuantity())));
                orderItems.add(orderItem);

                // 5. Create Stock Batch
                StockBatch batch = new StockBatch();
                batch.setBatchNo(batchNoGeneratorService.generateBatchNo(product, null));
                batch.setProduct(product);
                batch.setWarehouse(warehouse);
                batch.setQuantity(item.getQuantity());
                batch.setAvailableQuantity(item.getQuantity());
                batch.setUnitCost(cost);
                batch.setTotalCost(orderItem.getTotalCost());
                batch.setProductionDate(LocalDate.now());
                batch.setExpiryDate(LocalDate.now().plusYears(1));
                batch.setStatus(StockBatch.Status.ACTIVE);
                stockBatchRepository.save(batch);

                // 6. Create Stock Flow
                StockFlow flow = new StockFlow();
                flow.setStockBatch(batch);
                flow.setWarehouse(warehouse);
                flow.setProduct(product);
                flow.setBatchNo(batch.getBatchNo());
                flow.setFlowType(StockFlow.FlowType.INBOUND);
                flow.setQuantity(item.getQuantity());
                flow.setBalanceAfter(item.getQuantity());
                flow.setReferenceNo(inboundOrder.getInboundNo());
                flow.setReason("Initial Distribution");
                flow.setOperator("SYSTEM");
                flow.setSpecName(product.getSkus() != null && !product.getSkus().isEmpty() ? product.getSkus().get(0).getSpecification() : null);
                stockFlowRepository.save(flow);

                successProducts++;
                hasItems = true;
            }

            if (hasItems) {
                inboundOrder.setItems(orderItems);
                inboundOrderRepository.save(inboundOrder);
                createdOrders++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successProducts", successProducts);
        result.put("skippedProducts", skippedProducts);
        result.put("createdOrders", createdOrders);
        result.put("message", String.format("Successfully distributed %d products to %d warehouses. Created %d inbound orders.", successProducts, warehouses.size(), createdOrders));
        
        return result;
    }
}
