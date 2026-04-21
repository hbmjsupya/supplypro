package com.supplypro.dto;

import com.supplypro.entity.LogisticsProvider;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class LogisticsProviderDTO {
    private Long id;
    private String name;
    private String shortName;
    private String code;
    private String website;
    private String serviceScope;
    private String businessType;
    private String contactPerson;
    private String contactPhone;
    private String status;
    private LogisticsProvider.SettlementType settlementType;
    private Integer settlementPeriod;
    private BigDecimal prepaymentBalance;
    private BigDecimal prepaymentWarning;
    
    private Long purchaserId;
    private String purchaserName;
    // private String procurementOwner; // Removed unused field

    @io.swagger.v3.oas.annotations.media.Schema(description = "采购负责人姓名 (Synonym for purchaserName)", accessMode = io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY)
    public String getProcurementOwner() {
        return purchaserName != null ? purchaserName : "";
    }

    public void setProcurementOwner(String procurementOwner) {
        // Ignored or used to set purchaserName if needed, but primarily read-only alias
    }
    
    private List<LogisticsProviderFileDTO> newFiles;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
