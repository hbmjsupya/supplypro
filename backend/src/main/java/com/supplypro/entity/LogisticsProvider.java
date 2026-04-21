package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "logistics_providers")
public class LogisticsProvider {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    @Column(name = "short_name")
    private String shortName;
    
    @Column(unique = true)
    private String code;
    
    private String website;
    
    @Column(name = "service_scope", columnDefinition = "TEXT")
    private String serviceScope;
    
    @Column(name = "business_type")
    private String businessType;
    
    private String contactPerson;
    private String contactPhone;
    private String status;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @Column(name = "settlement_type")
    @Enumerated(EnumType.STRING)
    private SettlementType settlementType;

    @Column(name = "settlement_period")
    private Integer settlementPeriod;

    @Column(name = "prepayment_balance")
    private java.math.BigDecimal prepaymentBalance;

    @Column(name = "prepayment_warning")
    private java.math.BigDecimal prepaymentWarning;

    @OneToMany(mappedBy = "logisticsProvider", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<LogisticsProviderAccount> accounts = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "logisticsProvider", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<LogisticsProviderFile> files = new java.util.ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchaser_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User purchaser;

    public enum SettlementType {
        CASH, PREPAYMENT, PERIOD, FISHERMAN
    }
}
