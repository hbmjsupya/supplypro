package com.supplypro.repository;

import com.supplypro.entity.SalesProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalesProjectRepository extends JpaRepository<SalesProject, Long> {
    List<SalesProject> findByIsEnabledTrue();
    SalesProject findByProjectId(String projectId);
}
