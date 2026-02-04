package com.supplypro.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/system/maintenance")
public class SystemMaintenanceController {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @PostMapping("/clear-cache")
    public ResponseEntity<Map<String, Object>> clearCache() {
        Set<String> keys = redisTemplate.keys("category:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Cache cleared: " + (keys != null ? keys.size() : 0) + " keys");
        return ResponseEntity.ok(response);
    }
}
