package com.supplypro.repository;

import com.supplypro.entity.LogisticsProvider;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

public interface LogisticsProviderRepository extends JpaRepository<LogisticsProvider, Long>, JpaSpecificationExecutor<LogisticsProvider> {
    @Override
    @EntityGraph(attributePaths = {"purchaser"})
    Page<LogisticsProvider> findAll(Specification<LogisticsProvider> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"purchaser"})
    Optional<LogisticsProvider> findById(Long id);

    LogisticsProvider findByCode(String code);
    
    Optional<LogisticsProvider> findByName(String name);
    
    Optional<LogisticsProvider> findByShortName(String shortName);
}
