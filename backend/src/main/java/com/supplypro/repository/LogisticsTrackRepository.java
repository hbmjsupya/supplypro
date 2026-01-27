package com.supplypro.repository;

import com.supplypro.entity.LogisticsTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogisticsTrackRepository extends JpaRepository<LogisticsTrack, Long> {
    List<LogisticsTrack> findByBizNoOrderByEventTimeDesc(String bizNo);
}
