package com.supplypro.service;

import com.supplypro.entity.SettlementOrder;
import com.supplypro.repository.SettlementOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SettlementOrderNumberTest {

    @InjectMocks
    private SettlementService settlementService;

    @Mock
    private SettlementOrderRepository settlementOrderRepository;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void testGenerateSettlementNo_FormatAndLength() throws Exception {
        // Arrange
        when(valueOperations.increment(anyString())).thenReturn(1L);
        when(settlementOrderRepository.findBySettlementNo(anyString())).thenReturn(null); // No collision

        // Access private method
        Method method = SettlementService.class.getDeclaredMethod("generateSettlementNo");
        method.setAccessible(true);

        // Act
        String settlementNo = (String) method.invoke(settlementService);

        // Assert
        assertNotNull(settlementNo);
        assertTrue(settlementNo.startsWith("PS"));
        assertEquals(19, settlementNo.length()); // PS (2) + YYYYMMDDHHMMSS (14) + 001 (3) = 19
        
        // Verify Time Format roughly (can't be exact due to execution time)
        String timePart = settlementNo.substring(2, 16);
        assertTrue(timePart.matches("\\d{14}")); // 14 digits
        
        // Verify Sequence
        String seqPart = settlementNo.substring(16);
        assertEquals("001", seqPart);
    }

    @Test
    void testGenerateSettlementNo_SequenceIncrement() throws Exception {
        // Arrange
        when(valueOperations.increment(anyString())).thenReturn(999L);
        when(settlementOrderRepository.findBySettlementNo(anyString())).thenReturn(null);

        Method method = SettlementService.class.getDeclaredMethod("generateSettlementNo");
        method.setAccessible(true);

        // Act
        String settlementNo = (String) method.invoke(settlementService);

        // Assert
        assertTrue(settlementNo.endsWith("999"));
    }
    
    @Test
    void testGenerateSettlementNo_CollisionRetry() throws Exception {
        // Arrange
        // First call returns 1, collision found
        // Second call returns 2, no collision
        when(valueOperations.increment(anyString()))
            .thenReturn(1L)
            .thenReturn(2L);
            
        when(settlementOrderRepository.findBySettlementNo(argThat(s -> s != null && s.endsWith("001"))))
            .thenReturn(new SettlementOrder()); // Exists
            
        when(settlementOrderRepository.findBySettlementNo(argThat(s -> s != null && s.endsWith("002"))))
            .thenReturn(null); // Does not exist

        Method method = SettlementService.class.getDeclaredMethod("generateSettlementNo");
        method.setAccessible(true);

        // Act
        String settlementNo = (String) method.invoke(settlementService);

        // Assert
        assertTrue(settlementNo.endsWith("002"));
        // Verify Redis increment called at least twice
        verify(valueOperations, atLeast(2)).increment(anyString());
    }
}
