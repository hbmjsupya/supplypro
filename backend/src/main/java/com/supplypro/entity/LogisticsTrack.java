package com.supplypro.entity;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "logistics_tracks")
public class LogisticsTrack {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "biz_type", length = 20, nullable = false)
    private BizType bizType;

    @Column(name = "biz_no", nullable = false)
    private String bizNo;

    @Column(name = "logistics_provider")
    private String logisticsProvider;

    @Column(name = "tracking_no")
    private String trackingNo;

    private String status;

    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum BizType {
        PURCHASE, INBOUND, OUTBOUND
    }
}
