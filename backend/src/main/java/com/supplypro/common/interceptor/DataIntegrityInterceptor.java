package com.supplypro.common.interceptor;

import com.supplypro.entity.InboundOrderItem;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.SalesOrderItem;
import com.supplypro.entity.StockBatch;
import com.supplypro.entity.StockFlow;
import org.hibernate.EmptyInterceptor;
import org.hibernate.type.Type;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Component
public class DataIntegrityInterceptor extends EmptyInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(DataIntegrityInterceptor.class);

    @Override
    public boolean onSave(Object entity, Serializable id, Object[] state, String[] propertyNames, Type[] types) {
        if (entity instanceof SalesOrderItem) {
            checkProductId(entity, state, propertyNames, "SalesOrderItem");
        } else if (entity instanceof PurchaseOrderItem) {
            checkProductId(entity, state, propertyNames, "PurchaseOrderItem");
        } else if (entity instanceof InboundOrderItem) {
            checkProductId(entity, state, propertyNames, "InboundOrderItem");
        } else if (entity instanceof StockBatch) {
            checkProductId(entity, state, propertyNames, "StockBatch");
        } else if (entity instanceof StockFlow) {
            checkProductId(entity, state, propertyNames, "StockFlow");
        }
        return super.onSave(entity, id, state, propertyNames, types);
    }

    private void checkProductId(Object entity, Object[] state, String[] propertyNames, String entityName) {
        for (int i = 0; i < propertyNames.length; i++) {
            if ("productId".equals(propertyNames[i])) {
                if (state[i] == null) {
                    logger.error("Data Integrity Violation: productId is null for entity {}", entityName);
                    throw new IllegalArgumentException("Product ID cannot be null for " + entityName);
                }
            }
        }
    }
}
