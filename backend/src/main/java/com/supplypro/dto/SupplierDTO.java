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

    @NotBlank(message = "Supplier No is required")
    private String supplierNo;

    @NotBlank(message = "Name is required")
    private String name;

    private String contactPerson;
    private String contactPhone;
    private String email;
    private String address;

    @NotNull(message = "Settlement Type is required")
    private Supplier.SettlementType settlementType;

    private Integer settlementPeriod;
    private BigDecimal prepaymentBalance;
    private Supplier.Status status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
