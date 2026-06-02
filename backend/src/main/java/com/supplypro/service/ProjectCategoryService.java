package com.supplypro.service;

import com.supplypro.entity.ProjectCategory;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface ProjectCategoryService {
    List<ProjectCategory> getProjectCategories(String salesProjectId);

    List<ProjectCategory> getLeafCategories(String salesProjectId);

    List<Map<String, Object>> uploadAndExtract(MultipartFile file);

    List<ProjectCategory> saveParsedCategories(String salesProjectId, List<Map<String, Object>> parsedData);

    void deleteBySalesProjectId(String salesProjectId);
}
