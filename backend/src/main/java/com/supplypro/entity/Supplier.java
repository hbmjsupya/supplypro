package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "suppliers")
public class Supplier {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_no", unique = true, nullable = false)
    private String supplierNo;

    @Column(nullable = false)
    private String name;

    @Column(name = "contact_person")
    private String contactPerson;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "email")
    private String email;

    @Column(name = "address")
    private String address;

    @Column(name = "settlement_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private SettlementType settlementType;

    @Column(name = "settlement_period")
    private Integer settlementPeriod;

    @Column(name = "prepayment_balance")
    private BigDecimal prepaymentBalance;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum SettlementType {
        PREPAYMENT, CASH, PERIOD
    }

    public enum Status {
        ACTIVE, INACTIVE
    }
}
