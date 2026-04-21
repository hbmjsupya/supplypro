package com.supplypro.repository;

import com.supplypro.entity.StockFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface StockFlowRepository extends JpaRepository<StockFlow, Long>, JpaSpecificationExecutor<StockFlow> {
    
    void deleteByProductId(Long productId);
    
    void deleteByWarehouseId(Long warehouseId);
    
    java.util.List<StockFlow> findByWarehouseId(Long warehouseId);
    
    java.util.List<StockFlow> findByFlowType(StockFlow.FlowType flowType);
    
    java.util.List<StockFlow> findByReferenceNo(String referenceNo);
    
    java.util.List<StockFlow> findByProductIdOrderByCreatedAtDesc(Long productId);
}
