package com.supplypro.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiProxyService {

    private final RestTemplate aiRestTemplate;
    private final ObjectMapper objectMapper;

    public AiProxyService(@Qualifier("aiRestTemplate") RestTemplate aiRestTemplate, ObjectMapper objectMapper) {
        this.aiRestTemplate = aiRestTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> proxyChat(Map<String, Object> request) {
        String providerKey = (String) request.get("providerKey");
        String apiKey = (String) request.get("apiKey");
        String baseUrl = (String) request.get("baseUrl");
        String model = (String) request.get("model");
        List<Map<String, String>> messages = (List<Map<String, String>>) request.get("messages");
        Double temperature = request.get("temperature") != null ? ((Number) request.get("temperature")).doubleValue() : 0.1;
        Integer maxTokens = request.get("max_tokens") != null ? ((Number) request.get("max_tokens")).intValue() : 4096;

        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalArgumentException("baseUrl is required");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalArgumentException("apiKey is required");
        }
        if (model == null || model.isBlank()) {
            throw new IllegalArgumentException("model is required");
        }

        String cleanBaseUrl = baseUrl.replaceAll("/+$", "");

        switch (providerKey) {
            case "deepseek":
                return callDeepSeek(cleanBaseUrl, apiKey, model, messages, temperature, maxTokens);
            case "tongyi":
                return callOpenAiCompatible(cleanBaseUrl, apiKey, model, messages, temperature, maxTokens, false);
            case "glm":
                return callZhipuAi(cleanBaseUrl, apiKey, model, messages, temperature, maxTokens);
            case "doubao":
                return callDoubao(cleanBaseUrl, apiKey, model, messages, temperature, maxTokens);
            case "ernie":
                return callErnie(cleanBaseUrl, apiKey, model, messages, temperature, maxTokens);
            case "xinghuo":
                return callXinghuo(cleanBaseUrl, apiKey, model, messages, temperature, maxTokens);
            default:
                return callOpenAiCompatible(cleanBaseUrl, apiKey, model, messages, temperature, maxTokens, true);
        }
    }

    private Map<String, Object> callDeepSeek(String baseUrl, String apiKey, String model,
                                               List<Map<String, String>> messages,
                                               Double temperature, Integer maxTokens) {
        String url = baseUrl + "/chat/completions";

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);
        body.put("thinking", Map.of("type", "disabled"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("AI Proxy (DeepSeek): calling {} with model {} (thinking disabled)", url, model);
        ResponseEntity<String> response = aiRestTemplate.postForEntity(url, entity, String.class);

        Map<String, Object> result = parseResponse(response.getBody());
        normalizeReasoningContent(result);
        return result;
    }

    private void normalizeReasoningContent(Map<String, Object> response) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices != null && !choices.isEmpty()) {
            Map<String, Object> choice = choices.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choice.get("message");
            if (message != null) {
                Object content = message.get("content");
                if (content == null || "".equals(String.valueOf(content).trim())) {
                    Object reasoning = message.get("reasoning_content");
                    if (reasoning != null && !"".equals(String.valueOf(reasoning).trim())) {
                        message.put("content", reasoning);
                    }
                }
            }
        }
    }

    private Map<String, Object> callOpenAiCompatible(String baseUrl, String apiKey, String model,
                                                      List<Map<String, String>> messages,
                                                      Double temperature, Integer maxTokens, boolean includeChatCompletions) {
        String url = baseUrl + "/chat/completions";

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("AI Proxy: calling {} with model {}", url, model);
        ResponseEntity<String> response = aiRestTemplate.postForEntity(url, entity, String.class);

        return parseResponse(response.getBody());
    }

    private Map<String, Object> callZhipuAi(String baseUrl, String apiKey, String model,
                                             List<Map<String, String>> messages,
                                             Double temperature, Integer maxTokens) {
        String url = baseUrl + "/chat/completions";

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("AI Proxy (智谱): calling {} with model {}", url, model);
        ResponseEntity<String> response = aiRestTemplate.postForEntity(url, entity, String.class);

        return parseResponse(response.getBody());
    }

    private Map<String, Object> callDoubao(String baseUrl, String apiKey, String model,
                                            List<Map<String, String>> messages,
                                            Double temperature, Integer maxTokens) {
        String url = baseUrl;
        if (!url.endsWith("/chat/completions")) {
            url = baseUrl + "/chat/completions";
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("AI Proxy (豆包): calling {} with model {}", url, model);
        ResponseEntity<String> response = aiRestTemplate.postForEntity(url, entity, String.class);

        return parseResponse(response.getBody());
    }

    private Map<String, Object> callErnie(String baseUrl, String apiKey, String model,
                                           List<Map<String, String>> messages,
                                           Double temperature, Integer maxTokens) {
        String url = baseUrl.replaceAll("/+$", "");
        if (!url.contains("?")) {
            url += "?access_token=" + apiKey;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_output_tokens", maxTokens);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("AI Proxy (文心一言): calling {} with model {}", url, model);
        ResponseEntity<String> response = aiRestTemplate.postForEntity(url, entity, String.class);

        return parseErnieResponse(response.getBody());
    }

    private Map<String, Object> callXinghuo(String baseUrl, String apiKey, String model,
                                             List<Map<String, String>> messages,
                                             Double temperature, Integer maxTokens) {
        String url = baseUrl.replaceAll("/+$", "");

        Map<String, Object> payload = new HashMap<>();
        Map<String, Object> chatHeader = new HashMap<>();
        chatHeader.put("app_id", apiKey);
        payload.put("header", chatHeader);

        Map<String, Object> chatParameter = new HashMap<>();
        Map<String, Object> chat = new HashMap<>();
        chat.put("domain", model);
        chat.put("temperature", temperature);
        chat.put("max_tokens", maxTokens);
        chatParameter.put("chat", chat);
        payload.put("parameter", chatParameter);

        Map<String, Object> chatPayload = new HashMap<>();
        chatPayload.put("text", messages);
        payload.put("payload", Map.of("message", chatPayload));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        log.info("AI Proxy (讯飞星火): calling {} with model {}", url, model);
        ResponseEntity<String> response = aiRestTemplate.postForEntity(url, entity, String.class);

        return parseResponse(response.getBody());
    }

    private Map<String, Object> parseResponse(String responseBody) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(responseBody, Map.class);
            return result;
        } catch (JsonProcessingException e) {
            log.error("Failed to parse AI response: {}", responseBody);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("choices", List.of(Map.of("message", Map.of("content", responseBody))));
            return errorResponse;
        }
    }

    private Map<String, Object> parseErnieResponse(String responseBody) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> raw = objectMapper.readValue(responseBody, Map.class);
            String result = (String) raw.get("result");
            Map<String, Object> converted = new HashMap<>();
            converted.put("choices", List.of(Map.of("message", Map.of("content", result != null ? result : ""))));
            return converted;
        } catch (JsonProcessingException e) {
            log.error("Failed to parse Ernie response: {}", responseBody);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("choices", List.of(Map.of("message", Map.of("content", responseBody))));
            return errorResponse;
        }
    }
}
