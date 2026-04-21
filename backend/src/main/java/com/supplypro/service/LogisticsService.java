package com.supplypro.service;

import com.supplypro.entity.LogisticsTrack;
import java.util.List;
import java.util.Map;

public interface LogisticsService {
    /**
     * Get logistics tracks for a business number (PO, Inbound, etc.)
     */
    List<LogisticsTrack> getTracks(String bizNo);

    /**
     * Add a new logistics track event
     */
    LogisticsTrack addTrack(String bizNo, String status, String location, String description, String operator);

    /**
     * Update logistics info (Company, Tracking No, Status) for a business entity (PO/Inbound)
     * This syncs the main entity fields and adds a track.
     */
    void updateLogisticsInfo(String bizNo, String company, String trackingNo, String status, String location, String description);
}
