package com.supplypro.repository;

import com.supplypro.entity.StockFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface StockFlowRepository extends JpaRepository<StockFlow, Long>, JpaSpecificationExecutor<StockFlow> {
}
