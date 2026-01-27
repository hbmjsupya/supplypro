package com.supplypro.service;

import com.supplypro.entity.LogisticsTrack;
import com.supplypro.repository.LogisticsTrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LogisticsService {
    @Autowired
    private LogisticsTrackRepository trackRepository;

    @Transactional(readOnly = true)
    public List<LogisticsTrack> getTracks(String bizNo) {
        return trackRepository.findByBizNoOrderByEventTimeDesc(bizNo);
    }

    @Transactional
    public void addTrack(String bizNo, LogisticsTrack.BizType bizType, String provider, String trackingNo, String status, String location, String desc, LocalDateTime time) {
        LogisticsTrack track = new LogisticsTrack();
        track.setBizNo(bizNo);
        track.setBizType(bizType);
        track.setLogisticsProvider(provider);
        track.setTrackingNo(trackingNo);
        track.setStatus(status);
        track.setLocation(location);
        track.setDescription(desc);
        track.setEventTime(time != null ? time : LocalDateTime.now());
        trackRepository.save(track);
    }
}
