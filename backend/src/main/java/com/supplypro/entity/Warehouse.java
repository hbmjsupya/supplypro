package com.supplypro.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "warehouses")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Warehouse {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String code;

    private String region;
    private String province;
    private String city;
    private String district;
    
    @Column(name = "province_code")
    private String provinceCode;
    
    @Column(name = "city_code")
    private String cityCode;
    
    @Column(name = "district_code")
    private String districtCode;
    
    private String address;
    
    @Deprecated
    private String manager; // Legacy field, replaced by managers relation
    
    @Deprecated
    private String admins; // Legacy field
    
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "warehouse_managers",
        joinColumns = @JoinColumn(name = "warehouse_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private java.util.Set<User> managers = new java.util.HashSet<>();

    @Enumerated(EnumType.STRING)
    private Status status = Status.ACTIVE; // Default to ACTIVE

    @Transient
    private java.util.List<Long> managerIds;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        ACTIVE, INACTIVE, PENDING
    }
}
