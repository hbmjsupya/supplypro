package com.supplypro.util;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrder.ShippingStatus;
import com.supplypro.entity.PurchaseOrder.Status;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public final class PurchaseOrderShippingValidator {

    private PurchaseOrderShippingValidator() {}

    public static boolean canFirstShip(PurchaseOrder order) {
        if (order == null) {
            log.warn("Cannot perform first ship: order is null");
            return false;
        }
        
        ShippingStatus shippingStatus = order.getShippingStatus();
        boolean canShip = shippingStatus == ShippingStatus.PENDING || 
                          shippingStatus == ShippingStatus.TO_SHIP;
        
        log.debug("First ship check for order {}: shippingStatus={}, canShip={}", 
                  order.getOrderNo(), shippingStatus, canShip);
        
        return canShip;
    }

    public static boolean canModifyLogistics(PurchaseOrder order) {
        if (order == null) {
            log.warn("Cannot modify logistics: order is null");
            return false;
        }
        
        ShippingStatus shippingStatus = order.getShippingStatus();
        boolean canModify = shippingStatus == ShippingStatus.SHIPPED || 
                           shippingStatus == ShippingStatus.RECEIVED;
        
        log.debug("Modify logistics check for order {}: shippingStatus={}, canModify={}", 
                  order.getOrderNo(), shippingStatus, canModify);
        
        return canModify;
    }

    public static void validateFirstShip(PurchaseOrder order) {
        if (order == null) {
            throw new RuntimeException("采购单不存在");
        }
        
        if (!canFirstShip(order)) {
            String currentStatus = order.getShippingStatus() != null ? 
                                   order.getShippingStatus().name() : "NULL";
            throw new RuntimeException(
                String.format("首次发货失败：当前发货状态为[%s]，仅允许[待处理/待发货]状态执行首次发货", currentStatus));
        }
        
        log.info("First ship validation passed for order {}", order.getOrderNo());
    }

    public static void validateModifyLogistics(PurchaseOrder order) {
        if (order == null) {
            throw new RuntimeException("采购单不存在");
        }
        
        if (!canModifyLogistics(order)) {
            String currentStatus = order.getShippingStatus() != null ? 
                                   order.getShippingStatus().name() : "NULL";
            throw new RuntimeException(
                String.format("修改物流失败：当前发货状态为[%s]，仅允许[已发货/已收货]状态修改物流信息", currentStatus));
        }
        
        log.info("Modify logistics validation passed for order {}", order.getOrderNo());
    }

    public static ShippingOperationType determineOperationType(PurchaseOrder order) {
        if (order == null) {
            return ShippingOperationType.NONE;
        }
        
        ShippingStatus status = order.getShippingStatus();
        
        if (status == ShippingStatus.PENDING || status == ShippingStatus.TO_SHIP) {
            return ShippingOperationType.FIRST_SHIP;
        } else if (status == ShippingStatus.SHIPPED || status == ShippingStatus.RECEIVED) {
            return ShippingOperationType.MODIFY_LOGISTICS;
        }
        
        return ShippingOperationType.NONE;
    }

    public static String getOperationDescription(ShippingOperationType type) {
        switch (type) {
            case FIRST_SHIP:
                return "首次发货";
            case MODIFY_LOGISTICS:
                return "修改物流";
            default:
                return "未知操作";
        }
    }

    public enum ShippingOperationType {
        FIRST_SHIP,
        MODIFY_LOGISTICS,
        NONE
    }
}
