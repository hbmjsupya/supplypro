package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.entity.LogisticsTrack;
import com.supplypro.service.LogisticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logistics")
@CrossOrigin(origins = "*")
public class LogisticsController {

    @Autowired
    private LogisticsService logisticsService;

    @GetMapping("/track/{bizNo}")
    public ApiResponse<List<LogisticsTrack>> getTracks(@PathVariable String bizNo) {
        return ApiResponse.success(logisticsService.getTracks(bizNo));
    }

    @PostMapping("/webhook")
    public ApiResponse<?> webhook(@RequestBody Map<String, Object> payload) {
        // Simplified webhook handler
        String bizNo = (String) payload.get("bizNo");
        String bizTypeStr = (String) payload.get("bizType"); // PURCHASE, INBOUND, OUTBOUND
        String provider = (String) payload.get("provider");
        String trackingNo = (String) payload.get("trackingNo");
        String status = (String) payload.get("status");
        String location = (String) payload.get("location");
        String description = (String) payload.get("description");
        
        LogisticsTrack.BizType bizType = LogisticsTrack.BizType.valueOf(bizTypeStr);
        
        logisticsService.addTrack(bizNo, bizType, provider, trackingNo, status, location, description, LocalDateTime.now());
        
        return ApiResponse.success("Received", null);
    }
}
