package com.supplypro.event;

import com.supplypro.entity.PurchaseOrder;
import org.springframework.context.ApplicationEvent;

public class PurchaseReceivedEvent extends ApplicationEvent {
    
    private final PurchaseOrder purchaseOrder;

    public PurchaseReceivedEvent(Object source, PurchaseOrder purchaseOrder) {
        super(source);
        this.purchaseOrder = purchaseOrder;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }
}
