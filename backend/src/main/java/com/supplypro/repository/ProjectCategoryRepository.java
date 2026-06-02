package com.supplypro.repository;

import com.supplypro.entity.ProjectCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectCategoryRepository extends JpaRepository<ProjectCategory, Long> {
    List<ProjectCategory> findBySalesProjectId(String salesProjectId);
    List<ProjectCategory> findBySalesProjectIdAndParentId(String salesProjectId, String parentId);
    List<ProjectCategory> findBySalesProjectIdAndIsLeafTrue(String salesProjectId);
    List<ProjectCategory> findBySalesProjectIdAndLevel(String salesProjectId, Integer level);
    ProjectCategory findByProjectCategoryId(String projectCategoryId);
    void deleteBySalesProjectId(String salesProjectId);
}
