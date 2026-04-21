package com.supplypro.service;

import java.util.List;

public interface DeliveryOrderExportService {
    
    byte[] exportDeliveryOrders(List<Long> purchaseOrderIds, String exportedBy) throws Exception;
    
    String getExportFileName();
    
    List<Long> getExportedPurchaseOrderIds();
}
