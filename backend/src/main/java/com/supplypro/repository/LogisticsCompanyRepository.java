package com.supplypro.repository;

import com.supplypro.entity.LogisticsCompany;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LogisticsCompanyRepository extends JpaRepository<LogisticsCompany, String> {
    
    List<LogisticsCompany> findByIsDomestic(Boolean isDomestic);
    
    List<LogisticsCompany> findByIsActiveTrue();
    
    @Query("SELECT lc FROM LogisticsCompany lc WHERE lc.isActive = true OR lc.isActive IS NULL ORDER BY lc.sortOrder ASC")
    List<LogisticsCompany> findAllActive();
    
    @Query("SELECT lc FROM LogisticsCompany lc WHERE " +
           "(LOWER(lc.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(lc.shortName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(lc.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(lc.kdnCode) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<LogisticsCompany> findByKeyword(@Param("keyword") String keyword);
    
    @Query("SELECT lc FROM LogisticsCompany lc WHERE lc.isDomestic = :isDomestic AND (lc.isActive = true OR lc.isActive IS NULL) ORDER BY lc.sortOrder ASC")
    List<LogisticsCompany> findActiveByIsDomestic(@Param("isDomestic") Boolean isDomestic);
    
    List<LogisticsCompany> findByKdnCode(String kdnCode);
    
    Optional<LogisticsCompany> findByName(String name);
    
    Optional<LogisticsCompany> findByShortName(String shortName);
    
    Optional<LogisticsCompany> findByCode(String code);
}
