package com.supplypro.dto;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class DeliveryOrderImportResult {
    private int totalCount;
    private int successCount;
    private int failCount;
    private List<DeliveryOrderImportDTO> records = new ArrayList<>();
    
    public void addRecord(DeliveryOrderImportDTO record) {
        this.records.add(record);
        this.totalCount++;
        if (record.isSuccess()) {
            this.successCount++;
        } else {
            this.failCount++;
        }
    }
}
