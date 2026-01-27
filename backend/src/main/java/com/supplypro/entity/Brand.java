package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.hibernate.annotations.Formula;
import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "brands")
public class Brand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "trademark_no")
    private String trademarkNo;

    private String icon;

    @Enumerated(EnumType.STRING)
    private Status status = Status.ENABLED;

    @Formula("(select count(*) from products p where p.brand = name)")
    private Integer productCount;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "brand_supplier",
        joinColumns = @JoinColumn(name = "brand_id"),
        inverseJoinColumns = @JoinColumn(name = "supplier_id")
    )
    @JsonIgnoreProperties("brands")
    private Set<Supplier> suppliers = new HashSet<>();

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        ENABLED, DISABLED
    }
}
