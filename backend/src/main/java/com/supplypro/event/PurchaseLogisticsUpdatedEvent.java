package com.supplypro.event;

import com.supplypro.entity.PurchaseOrder;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;

public class PurchaseLogisticsUpdatedEvent extends ApplicationEvent {
    private final PurchaseOrder purchaseOrder;
    private final BigDecimal oldFee;
    private final BigDecimal newFee;
    private final String oldDeliveryMethod;
    private final String newDeliveryMethod;

    public PurchaseLogisticsUpdatedEvent(Object source, PurchaseOrder purchaseOrder, BigDecimal oldFee, BigDecimal newFee, String oldDeliveryMethod, String newDeliveryMethod) {
        super(source);
        this.purchaseOrder = purchaseOrder;
        this.oldFee = oldFee;
        this.newFee = newFee;
        this.oldDeliveryMethod = oldDeliveryMethod;
        this.newDeliveryMethod = newDeliveryMethod;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }

    public BigDecimal getOldFee() {
        return oldFee;
    }

    public BigDecimal getNewFee() {
        return newFee;
    }

    public String getOldDeliveryMethod() {
        return oldDeliveryMethod;
    }

    public String getNewDeliveryMethod() {
        return newDeliveryMethod;
    }
}
