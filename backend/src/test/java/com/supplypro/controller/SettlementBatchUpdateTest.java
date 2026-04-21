package com.supplypro.controller;

import com.supplypro.entity.SettlementOrder;
import com.supplypro.repository.SettlementOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SettlementBatchUpdateTest {

    @InjectMocks
    private SettlementOrderController settlementOrderController;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @Test
    void testUpdatePendingStatus_WithIntegerIds_ShouldPassNow() {
        // This test used to reproduce the ClassCastException, now checks if fixed
        Map<String, Object> payload = new HashMap<>();
        payload.put("ids", Arrays.asList(1, 2)); 
        payload.put("status", "SETTLED");

        lenient().when(settlementOrderRepository.findAllById(anyList())).thenReturn(List.of());

        // Act
        ResponseEntity<Map<String, Object>> response = settlementOrderController.updatePendingStatus(payload);

        // Assert
        assertEquals(200, response.getBody().get("code"));
    }

    @Test
    void testUpdatePendingStatus_WithStringIds_ShouldPass() {
        // Payload with String IDs
        Map<String, Object> payload = new HashMap<>();
        payload.put("ids", Arrays.asList("1", "2"));
        payload.put("status", "SETTLED");

        when(settlementOrderRepository.findAllById(anyList())).thenReturn(List.of());

        // Act
        ResponseEntity<Map<String, Object>> response = settlementOrderController.updatePendingStatus(payload);

        // Assert
        assertEquals(200, response.getBody().get("code"));
    }
}
