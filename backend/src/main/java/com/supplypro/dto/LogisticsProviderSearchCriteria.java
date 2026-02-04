package com.supplypro.dto;

import com.supplypro.entity.LogisticsProvider;
import lombok.Data;

@Data
public class LogisticsProviderSearchCriteria {
    private String name;
    private String contactInfo; // Name or Phone
    private LogisticsProvider.SettlementType settlementType;
    private Integer settlementPeriod; // Converted from Frontend Enum/String if needed, or pass directly
    private Long purchaserId;
}
