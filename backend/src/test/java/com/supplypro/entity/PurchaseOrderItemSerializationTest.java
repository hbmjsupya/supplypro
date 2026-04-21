package com.supplypro.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class PurchaseOrderItemSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    public void testDeserializationWithCamelCase() throws Exception {
        String json = "{\"productId\": 123, \"quantity\": 10, \"unitPrice\": 100.00, \"totalPrice\": 1000.00}";
        PurchaseOrderItem item = objectMapper.readValue(json, PurchaseOrderItem.class);
        
        assertNotNull(item.getProductId(), "Product ID should not be null when 'productId' is provided");
        assertEquals(123L, item.getProductId());
    }

    @Test
    public void testDeserializationWithSnakeCase() throws Exception {
        String json = "{\"product_id\": 456, \"quantity\": 5, \"unitPrice\": 50.00, \"totalPrice\": 250.00}";
        PurchaseOrderItem item = objectMapper.readValue(json, PurchaseOrderItem.class);
        
        assertNotNull(item.getProductId(), "Product ID should not be null when 'product_id' is provided");
        assertEquals(456L, item.getProductId());
    }
}
