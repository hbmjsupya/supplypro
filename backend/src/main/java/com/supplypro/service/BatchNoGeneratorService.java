package com.supplypro.service;

import com.supplypro.entity.Product;

public interface BatchNoGeneratorService {
    
    /**
     * Generate a batch number according to the new rule:
     * YYYYMMDD + 3-digit sequence + Supplier Name
     * 
     * @param product The product being added to stock
     * @param supplierName The actual supplier name from the purchase order, or null to fallback to default
     * @return Formatted batch number
     */
    String generateBatchNo(Product product, String supplierName);
}
