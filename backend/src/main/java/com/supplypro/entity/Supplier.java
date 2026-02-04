package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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

    @Column(name = "org_code", length = 18)
    private String orgCode;

    @Column(name = "qualification_file", columnDefinition = "TEXT")
    @Convert(converter = com.supplypro.converter.StringListConverter.class)
    private java.util.List<String> qualificationFile;

    @Column(name = "contract_file", columnDefinition = "TEXT")
    @Convert(converter = com.supplypro.converter.StringListConverter.class)
    private java.util.List<String> contractFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchaser_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User purchaser;

    @Column(name = "coop_start_time")
    private LocalDateTime coopStartTime;

    @Column(name = "coop_end_time")
    private LocalDateTime coopEndTime;

    @Column(name = "province_code")
    private String provinceCode;

    @Column(name = "city_code")
    private String cityCode;

    @Column(name = "district_code")
    private String districtCode;

    @Column(name = "receiver_name")
    private String receiverName;

    @Column(name = "receiver_phone")
    private String receiverPhone;

    @Column(name = "settlement_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private SettlementType settlementType;

    @Column(name = "settlement_period")
    private Integer settlementPeriod;

    @Column(name = "prepayment_balance")
    private BigDecimal prepaymentBalance;

    @Column(name = "prepayment_warning")
    private BigDecimal prepaymentWarning;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private Status status;

    @ManyToMany(mappedBy = "suppliers")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.Set<Brand> brands = new java.util.HashSet<>();

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
