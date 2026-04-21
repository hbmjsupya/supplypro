package com.supplypro.service;

import com.supplypro.dto.BatchDistributeRequest;
import com.supplypro.entity.Warehouse;
import java.util.List;
import java.util.Map;

public interface WarehouseService {
    /**
     * Batch distribute products to warehouses with initial stock.
     * Automatically generates Inbound Receipts.
     * 
     * @param request The distribution request containing warehouses and products
     * @return Statistics of the operation
     */
    Map<String, Object> batchDistributeProducts(BatchDistributeRequest request);

    String generateNextCode();

    Warehouse createWarehouse(Warehouse warehouse, List<Long> managerIds);

    Warehouse updateWarehouse(Long id, Warehouse warehouse, List<Long> managerIds);

    void updateStatus(Long id, Warehouse.Status status);

    void deleteWarehouse(Long id);
}
