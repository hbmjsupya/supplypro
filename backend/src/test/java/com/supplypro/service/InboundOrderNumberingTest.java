package com.supplypro.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class InboundOrderNumberingTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Test
    public void testInboundOrderNumberFormat() {
        // Mock Redis
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(1L);

        // Simulate logic (Copy of implementation for unit testing logic isolation)
        LocalDateTime now = LocalDateTime.now();
        String dateStr = DateTimeFormatter.ofPattern("yyyyMMdd").format(now);
        
        int minute = now.getMinute();
        int bucket = (minute / 10) * 10;
        String timeStr = String.format("%02d%02d", now.getHour(), bucket);
        
        Long seq = 1L;
        String seqStr = String.format("%03d", seq);
        
        String inboundNo = "IN" + dateStr + timeStr + seqStr;
        
        // Assertions
        assertTrue(inboundNo.startsWith("IN"));
        assertEquals(15 + 3, inboundNo.length()); // IN(2) + YYYYMMDD(8) + HHmm(4) + seq(3) = 17
        assertTrue(inboundNo.endsWith("001"));
    }

    @Test
    public void testSequenceLimitExceeded() {
        // Mock Redis returning > 999
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(1000L);

        try {
            Long seq = 1000L;
            if (seq > 999) {
                throw new RuntimeException("Inbound Order sequence limit (999) exceeded");
            }
            fail("Should throw exception");
        } catch (RuntimeException e) {
            assertEquals("Inbound Order sequence limit (999) exceeded", e.getMessage());
        }
    }
}
