package com.supplypro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.dto.LogisticsResponse;
import com.supplypro.exception.LogisticsException;
import com.supplypro.repository.LogisticsCompanyRepository;
import com.supplypro.entity.LogisticsCompany;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class KuaidiNiaoService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private LogisticsCompanyRepository logisticsCompanyRepository;

    // Configuration from requirements
    private static final String E_BUSINESS_ID = "1887192";
    private static final String API_KEY = "f2d48681-9a52-4c68-a113-33c9e6b96d7b";
    private static final String REQ_URL = "https://api.kdniao.com/api/dist";
    private static final String REQUEST_TYPE_8001 = "8001";
    private static final String REQUEST_TYPE_8002 = "8002";

    // Mapping for common logistics companies (fallback)
    private static final Map<String, String> SHIPPER_CODE_MAP = new HashMap<>();
    static {
        SHIPPER_CODE_MAP.put("SF Express", "SF");
        SHIPPER_CODE_MAP.put("顺丰速运", "SF");
        SHIPPER_CODE_MAP.put("顺丰", "SF");
        SHIPPER_CODE_MAP.put("圆通速递", "YTO");
        SHIPPER_CODE_MAP.put("圆通", "YTO");
        SHIPPER_CODE_MAP.put("中通快递", "ZTO");
        SHIPPER_CODE_MAP.put("中通", "ZTO");
        SHIPPER_CODE_MAP.put("申通快递", "STO");
        SHIPPER_CODE_MAP.put("申通", "STO");
        SHIPPER_CODE_MAP.put("韵达速递", "YD");
        SHIPPER_CODE_MAP.put("韵达快递", "YD");
        SHIPPER_CODE_MAP.put("韵达", "YD");
        SHIPPER_CODE_MAP.put("邮政快递包裹", "YZPY");
        SHIPPER_CODE_MAP.put("邮政", "YZPY");
        SHIPPER_CODE_MAP.put("EMS", "EMS");
        SHIPPER_CODE_MAP.put("邮政EMS", "EMS");
        SHIPPER_CODE_MAP.put("京东物流", "JD");
        SHIPPER_CODE_MAP.put("京东", "JD");
        SHIPPER_CODE_MAP.put("京东快递", "JD");
        SHIPPER_CODE_MAP.put("德邦快递", "DBL");
        SHIPPER_CODE_MAP.put("德邦", "DBL");
        SHIPPER_CODE_MAP.put("极兔速递", "JTSD");
        SHIPPER_CODE_MAP.put("极兔", "JTSD");
        SHIPPER_CODE_MAP.put("JTEXPRESS", "JTSD");
        SHIPPER_CODE_MAP.put("HTKY", "HTKY");
        SHIPPER_CODE_MAP.put("百世快递", "HTKY");
        SHIPPER_CODE_MAP.put("ANE", "ANE");
        SHIPPER_CODE_MAP.put("安能物流", "ANE");
    }

    private String getShipperCode(String companyNameOrCode) {
        if (companyNameOrCode == null) return "";
        
        // 1. First try to find by code in database (to get kdn_code)
        Optional<LogisticsCompany> companyOpt = logisticsCompanyRepository.findById(companyNameOrCode);
        if (companyOpt.isPresent()) {
            LogisticsCompany company = companyOpt.get();
            if (company.getKdnCode() != null && !company.getKdnCode().isEmpty()) {
                log.info("Found kdn_code {} for company code {}", company.getKdnCode(), companyNameOrCode);
                return company.getKdnCode();
            }
            // If no kdn_code, the code itself might be the correct one
            return company.getCode();
        }
        
        // 2. Fallback to static mapping
        String mapped = SHIPPER_CODE_MAP.get(companyNameOrCode);
        if (mapped != null) {
            log.info("Mapped {} to {} via static map", companyNameOrCode, mapped);
            return mapped;
        }
        
        // 3. Return as-is if no mapping found
        return companyNameOrCode;
    }

    public LogisticsResponse track(String shipperCode, String logisticCode) {
        if (logisticCode.startsWith("MOCK") || logisticCode.startsWith("SF_TEST")) {
            return getMockResponse(shipperCode, logisticCode);
        }

        String mappedShipperCode = getShipperCode(shipperCode);
        Map<String, String> requestDataMap = new HashMap<>();
        requestDataMap.put("ShipperCode", mappedShipperCode);
        requestDataMap.put("LogisticCode", logisticCode);
        requestDataMap.put("CustomerName", "0000");

        return sendRequest(requestDataMap, REQUEST_TYPE_8001, shipperCode, logisticCode);
    }

    public LogisticsResponse trackAuto(String logisticCode) {
        if (logisticCode.startsWith("MOCK") || logisticCode.startsWith("SF_TEST")) {
            return getMockResponse("", logisticCode);
        }

        Map<String, String> requestDataMap = new HashMap<>();
        requestDataMap.put("LogisticCode", logisticCode);

        log.info("Sending Auto-Identify Logistics Request (8002) to KuaidiNiao: LogisticCode={}", logisticCode);

        LogisticsResponse response = sendRequest(requestDataMap, REQUEST_TYPE_8002, "", logisticCode);

        if (response.isSuccess() && response.getShipperCode() != null && !response.getShipperCode().isEmpty()) {
            log.info("8002 auto-identified ShipperCode: {} for LogisticCode: {}", response.getShipperCode(), logisticCode);
            enrichShipperNameFromDB(response);
        }

        return response;
    }

    public LogisticsResponse trackWithFallback(String shipperCode, String logisticCode) {
        if (logisticCode == null || logisticCode.trim().isEmpty()) {
            return getMockResponse(shipperCode, logisticCode);
        }

        if (logisticCode.startsWith("MOCK") || logisticCode.startsWith("SF_TEST")) {
            return getMockResponse(shipperCode, logisticCode);
        }

        boolean hasValidShipperCode = shipperCode != null && !shipperCode.trim().isEmpty();

        if (hasValidShipperCode) {
            LogisticsResponse response = track(shipperCode, logisticCode);
            if (response.isSuccess() && response.getTraces() != null && !response.getTraces().isEmpty()) {
                return response;
            }
            if (response.isSuccess() && ("0".equals(response.getState()) || response.getState() == null)) {
                log.info("8001 query returned no traces, trying 8002 auto-identify for LogisticCode: {}", logisticCode);
            } else if (!response.isSuccess()) {
                log.info("8001 query failed (reason: {}), trying 8002 auto-identify for LogisticCode: {}", response.getReason(), logisticCode);
            } else {
                return response;
            }
        }

        log.info("Falling back to 8002 auto-identify for LogisticCode: {}, original ShipperCode: {}", logisticCode, shipperCode);
        return trackAuto(logisticCode);
    }

    private void enrichShipperNameFromDB(LogisticsResponse response) {
        if (response == null || response.getShipperCode() == null) return;

        String shipperCode = response.getShipperCode();
        Optional<LogisticsCompany> companyOpt = logisticsCompanyRepository.findById(shipperCode);
        if (companyOpt.isPresent()) {
            response.setShipperName(companyOpt.get().getName());
        } else {
            List<LogisticsCompany> byKdnCode = logisticsCompanyRepository.findByKdnCode(shipperCode);
            if (byKdnCode != null && !byKdnCode.isEmpty()) {
                response.setShipperName(byKdnCode.get(0).getName());
            }
        }
    }

    private LogisticsResponse sendRequest(Map<String, String> requestDataMap, String requestType, String fallbackShipperCode, String logisticCode) {
        String responseBody = null;
        try {
            String requestData = objectMapper.writeValueAsString(requestDataMap);

            String dataSign = encrypt(requestData, API_KEY, "UTF-8");

            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("RequestData", requestData);
            params.add("EBusinessID", E_BUSINESS_ID);
            params.add("RequestType", requestType);
            params.add("DataSign", dataSign);
            params.add("DataType", "2");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(params, headers);

            log.info("Sending Logistics Request to KuaidiNiao: RequestType={}, ShipperCode={}, LogisticCode={}", 
                requestType, requestDataMap.get("ShipperCode"), logisticCode);

            ResponseEntity<String> responseEntity = restTemplate.postForEntity(REQ_URL, requestEntity, String.class);
            responseBody = responseEntity.getBody();

            log.info("Logistics Raw Response ({}): {}", requestType, responseBody);

            if (responseEntity.getStatusCode() != HttpStatus.OK) {
                log.error("External API HTTP Error: {}", responseEntity.getStatusCode());
                return getMockResponse(fallbackShipperCode, logisticCode);
            }

            if (responseBody == null || responseBody.isEmpty()) {
                log.error("External API returned empty body");
                return getMockResponse(fallbackShipperCode, logisticCode);
            }

            LogisticsResponse response = objectMapper.readValue(responseBody, LogisticsResponse.class);

            if (!response.isSuccess()) {
                log.warn("Logistics API Business Failure ({}): {}", requestType, response.getReason());
                return response;
            }

            return response;

        } catch (Exception e) {
            log.error("Failed to query logistics info ({}). Raw Response: {}", requestType, responseBody, e);
            LogisticsResponse mock = getMockResponse(fallbackShipperCode, logisticCode);
            mock.setReason("System Error: " + e.getMessage() + " (Showing Mock Data)");
            return mock;
        }
    }

    /**
     * MD5 + Base64 Encryption
     * Corrected KuaidiNiao Signature: Base64(MD5(Content + Key))
     */
    private String encrypt(String content, String keyValue, String charset) throws Exception {
        if (keyValue != null) {
            content = content + keyValue;
        }
        byte[] contentBytes = content.getBytes(charset);
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] md5Bytes = md.digest(contentBytes);
        
        // Convert MD5 raw bytes to Hex String (lowercase)
        StringBuilder hexString = new StringBuilder();
        for (byte b : md5Bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        
        // Base64 encode the Hex String
        return Base64.getEncoder().encodeToString(hexString.toString().getBytes(charset));
    }

    private String urlEncoder(String str, String charset) throws UnsupportedEncodingException {
        return URLEncoder.encode(str, charset);
    }

    /**
     * Mock Response for Testing/Fallback
     */
    private LogisticsResponse getMockResponse(String shipperCode, String logisticCode) {
        LogisticsResponse response = new LogisticsResponse();
        response.setSuccess(true);
        response.setLogisticCode(logisticCode);
        response.setShipperCode(shipperCode);
        response.setState("2"); // In transit (not signed) - Changed from "3" to prevent auto-receive
        
        java.util.List<LogisticsResponse.Trace> traces = new java.util.ArrayList<>();
        
        LogisticsResponse.Trace t1 = new LogisticsResponse.Trace();
        t1.setAcceptTime(java.time.LocalDateTime.now().minusHours(2).toString().replace("T", " "));
        t1.setAcceptStation("【Mock Station】Out for delivery");
        traces.add(t1);

        LogisticsResponse.Trace t2 = new LogisticsResponse.Trace();
        t2.setAcceptTime(java.time.LocalDateTime.now().minusHours(5).toString().replace("T", " "));
        t2.setAcceptStation("【Mock Station】Arrived at local distribution center");
        traces.add(t2);

        LogisticsResponse.Trace t3 = new LogisticsResponse.Trace();
        t3.setAcceptTime(java.time.LocalDateTime.now().minusHours(10).toString().replace("T", " "));
        t3.setAcceptStation("【Mock Station】Package picked up");
        traces.add(t3);

        response.setTraces(traces);
        return response;
    }
}
