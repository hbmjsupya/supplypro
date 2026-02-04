package com.supplypro.dto;

import com.supplypro.entity.Supplier;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SupplierDTO {
    private Long id;

    private String supplierNo;

    @NotBlank(message = "Name is required")
    private String name;

    private String contactPerson;
    private String contactPhone;
    private String email;
    private String address;
    private String provinceCode;
    private String cityCode;
    private String districtCode;
    private String receiverName;
    private String receiverPhone;
    
    private String orgCode;
    private java.util.List<String> qualificationFile;
    private java.util.List<String> contractFile;
    private Long purchaserId;
    private String purchaserName;
    private LocalDateTime coopStartTime;
    private LocalDateTime coopEndTime;
    private java.util.List<String> brandNames;
    private java.util.List<Long> brandIds;

    @NotNull(message = "Settlement Type is required")
    private Supplier.SettlementType settlementType;

    private Integer settlementPeriod;
    private BigDecimal prepaymentBalance;
    private BigDecimal prepaymentWarning;
    private Supplier.Status status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private java.util.List<SupplierFileDTO> newFiles;
}
