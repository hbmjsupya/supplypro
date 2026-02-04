package com.supplypro.dto;

import com.supplypro.entity.Supplier;
import lombok.Data;

@Data
public class SupplierSearchCriteria {
    private String name;
    private Supplier.SettlementType settlementType;
    private String settlementCycle; // Weekly, Monthly, etc. Map to period?
    // User said: "Settlement Cycle filter: Weekly, Monthly, Quarterly".
    // Backend has `settlementPeriod` (Integer days).
    // I should map string to days or range.
    // Or just pass `settlementPeriod` integer if exact match.
    // Let's use `settlementPeriod` (Integer) for exact match, or range if needed.
    // User said "Weekly, Monthly, Quarterly".
    // Weekly = 7, Monthly = 30, Quarterly = 90.
    private Integer settlementPeriod;
    
    private Long purchaserId;
    private String purchaserName;
    private String contactInfo; // Name, phone, email
    private Boolean expiringSoon; // 30 days
    private String status;
}
