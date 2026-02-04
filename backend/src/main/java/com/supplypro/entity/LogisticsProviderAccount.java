package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "logistics_provider_accounts")
public class LogisticsProviderAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logistics_provider_id", nullable = false)
    @JsonIgnore
    private LogisticsProvider logisticsProvider;

    @Enumerated(EnumType.STRING)
    private Type type;

    private String name;
    private String bank;
    private String account;

    @Column(name = "bank_id")
    private Long bankId;

    @Column(name = "is_default")
    @JsonProperty("isDefault")
    private boolean isDefault;

    private boolean status = true;

    public enum Type {
        COMPANY, PERSONAL
    }
}
