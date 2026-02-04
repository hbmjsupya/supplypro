package com.supplypro.controller;

import com.supplypro.entity.Sku;
import com.supplypro.repository.SkuRepository;
import com.supplypro.service.ProductSyncProducer;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products/import")
@CrossOrigin(origins = "*")
public class ProductImportController {

    @Autowired
    private SkuRepository skuRepository;

    @Autowired
    private ProductSyncProducer productSyncProducer;

    @PostMapping("/cost-price")
    @Transactional
    public ResponseEntity<Map<String, Object>> importCostPrice(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int successCount = 0;

        CSVFormat csvFormat = CSVFormat.Builder.create()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .build();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser csvParser = new CSVParser(reader, csvFormat)) {

            for (CSVRecord record : csvParser) {
                String specId = record.isMapped("规格编码") ? record.get("规格编码") : (record.isMapped("specId") ? record.get("specId") : null);
                String costPriceStr = record.isMapped("默认成本价") ? record.get("默认成本价") : (record.isMapped("costPrice") ? record.get("costPrice") : null);

                if (specId == null || specId.isEmpty()) {
                    errors.add("Row " + record.getRecordNumber() + ": Missing Spec ID");
                    continue;
                }

                if (costPriceStr == null || costPriceStr.isEmpty()) {
                    continue; // Skip if no price update
                }

                // Remove currency symbol if present
                costPriceStr = costPriceStr.replace("¥", "").replace(",", "").trim();

                try {
                    BigDecimal costPrice = new BigDecimal(costPriceStr);
                    if (costPrice.compareTo(BigDecimal.ZERO) < 0 || costPrice.compareTo(new BigDecimal("9999999.99")) > 0) {
                        errors.add("Row " + record.getRecordNumber() + " (Spec " + specId + "): Price out of range (0-9999999.99)");
                        continue;
                    }
                    // Validate 2 decimal places
                    if (costPrice.scale() > 2) {
                        errors.add("Row " + record.getRecordNumber() + " (Spec " + specId + "): Price has more than 2 decimal places");
                        continue;
                    }

                    Sku sku = skuRepository.findBySkuCode(specId);
                    if (sku != null) {
                        sku.setCostPrice(costPrice);
                        skuRepository.save(sku);
                        // Trigger ES sync for the product
                        productSyncProducer.sendSyncMessage(sku.getProduct().getId());
                        successCount++;
                    } else {
                        errors.add("Row " + record.getRecordNumber() + ": SKU not found " + specId);
                    }
                } catch (NumberFormatException e) {
                    errors.add("Row " + record.getRecordNumber() + " (Spec " + specId + "): Invalid price format " + costPriceStr);
                }
            }

            response.put("code", 200);
            if (errors.isEmpty()) {
                response.put("message", "Import successful. Updated " + successCount + " records.");
            } else {
                response.put("message", "Import completed with errors. Success: " + successCount);
                response.put("errors", errors);
            }
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("code", 400, "message", "Failed to parse CSV: " + e.getMessage()));
        }
    }
}
