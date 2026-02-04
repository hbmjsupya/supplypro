package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "supplier_accounts")
public class SupplierAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    @JsonIgnore
    private Supplier supplier;

    @Enumerated(EnumType.STRING)
    private Type type;

    private String name;
    private String bank;
    @Column(length = 50)
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
