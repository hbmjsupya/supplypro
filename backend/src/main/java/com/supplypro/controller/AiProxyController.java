package com.supplypro.controller;

import com.supplypro.service.AiProxyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.HttpServerErrorException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiProxyController {

    @Autowired
    private AiProxyService aiProxyService;

    @PostMapping("/proxy")
    public ResponseEntity<Map<String, Object>> proxyChat(@RequestBody Map<String, Object> request) {
        log.info("AI Proxy request received, providerKey={}", request.get("providerKey"));
        try {
            Map<String, Object> result = aiProxyService.proxyChat(request);
            return ResponseEntity.ok(mapResponse(200, "Success", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(mapResponse(400, e.getMessage(), null));
        } catch (HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            log.error("AI API returned client error ({}): {}", e.getStatusCode(), responseBody);
            String detail = extractAiErrorMessage(responseBody);
            return ResponseEntity.status(e.getStatusCode())
                    .body(mapResponse(e.getStatusCode().value(), "AI服务返回错误: " + detail, null));
        } catch (HttpServerErrorException e) {
            log.error("AI API returned server error: {}", e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode())
                    .body(mapResponse(e.getStatusCode().value(), "AI服务内部错误，请稍后重试", null));
        } catch (ResourceAccessException e) {
            log.error("AI API connection/timeout error", e);
            return ResponseEntity.internalServerError()
                    .body(mapResponse(500, "AI服务连接超时，请检查网络或API地址是否正确", null));
        } catch (Exception e) {
            log.error("AI Proxy error", e);
            return ResponseEntity.internalServerError()
                    .body(mapResponse(500, "AI调用失败: " + e.getMessage(), null));
        }
    }

    /**
     * Build a standard API response map. Uses HashMap because Map.of() does not allow null values.
     */
    private Map<String, Object> mapResponse(int code, String message, Object data) {
        Map<String, Object> map = new HashMap<>();
        map.put("code", code);
        map.put("message", message);
        map.put("data", data);
        return map;
    }

    private String extractAiErrorMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "远程AI服务返回了错误，请检查API Key和Base URL是否正确";
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> errorBody = mapper.readValue(responseBody, Map.class);
            if (errorBody.containsKey("error")) {
                Object error = errorBody.get("error");
                if (error instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> errorMap = (Map<String, Object>) error;
                    Object msg = errorMap.get("message");
                    return msg != null ? String.valueOf(msg) : String.valueOf(error);
                }
                return String.valueOf(error);
            }
        } catch (Exception ignored) {
        }
        return responseBody.length() > 200 ? responseBody.substring(0, 200) : responseBody;
    }
}
