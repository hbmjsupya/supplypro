package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "regions")
public class Region {
    @Id
    @Column(length = 20)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "parent_code", length = 20)
    private String parentCode;
    
    @Column(nullable = false)
    private Integer level; // 1: Province, 2: City, 3: District
}
