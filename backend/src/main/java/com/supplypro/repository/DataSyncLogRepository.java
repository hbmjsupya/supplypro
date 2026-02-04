package com.supplypro.repository;

import com.supplypro.entity.DataSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DataSyncLogRepository extends JpaRepository<DataSyncLog, Long> {
}
