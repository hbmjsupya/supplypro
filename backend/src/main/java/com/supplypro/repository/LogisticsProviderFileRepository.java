package com.supplypro.repository;

import com.supplypro.entity.LogisticsProviderFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LogisticsProviderFileRepository extends JpaRepository<LogisticsProviderFile, Long> {
    List<LogisticsProviderFile> findByLogisticsProviderIdAndIsDeletedFalseAndIsLatestTrue(Long logisticsProviderId);
    
    List<LogisticsProviderFile> findByLogisticsProviderIdAndCategoryAndIsDeletedFalseAndIsLatestTrue(Long logisticsProviderId, LogisticsProviderFile.FileCategory category);
    
    List<LogisticsProviderFile> findByGroupIdOrderByVersionDesc(String groupId);
}
