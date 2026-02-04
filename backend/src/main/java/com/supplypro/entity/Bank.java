package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "banks", indexes = {
    @Index(name = "idx_bank_code", columnList = "bank_code", unique = true),
    @Index(name = "idx_bank_name", columnList = "name"),
    @Index(name = "idx_bank_status", columnList = "status")
})
public class Bank {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_code", length = 20, nullable = false, unique = true)
    private String bankCode; // 12-digit CNAPS code usually

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "short_name", length = 50)
    private String shortName;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BankType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BankLevel level;

    @Column(length = 50)
    private String province;

    @Column(length = 50)
    private String city;

    @Column(length = 50)
    private String district;

    @Column(length = 200)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(name = "swift_code", length = 20)
    private String swiftCode;

    @Column(nullable = false)
    private Boolean status = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum BankType {
        STATE_OWNED, // 国有大行
        JOINT_STOCK, // 股份制银行
        CITY_COMMERCIAL, // 城商行
        RURAL_COMMERCIAL, // 农商行
        FOREIGN, // 外资银行
        OTHER // 其他
    }

    public enum BankLevel {
        HEAD_OFFICE, // 总行
        BRANCH, // 分行
        SUB_BRANCH // 支行
    }
}
