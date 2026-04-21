package com.supplypro.event;

import com.supplypro.entity.PurchaseOrder;
import org.springframework.context.ApplicationEvent;

public class PurchaseOrderInboundEvent extends ApplicationEvent {
    
    private final PurchaseOrder purchaseOrder;

    public PurchaseOrderInboundEvent(Object source, PurchaseOrder purchaseOrder) {
        super(source);
        this.purchaseOrder = purchaseOrder;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }
}
