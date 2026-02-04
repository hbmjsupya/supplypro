package com.supplypro.dto;

import com.supplypro.entity.Bank;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Data
public class BankDto {
    private Long id;

    @NotBlank(message = "Bank Code is required")
    private String bankCode;

    @NotBlank(message = "Bank Name is required")
    private String name;

    private String shortName;
    private Bank.BankType type;
    private Bank.BankLevel level;
    private String province;
    private String city;
    private String district;
    private String address;
    private String phone;
    private String swiftCode;
    private Boolean status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
