package com.supplypro.service;

import com.supplypro.entity.CategoryMapping;

import java.util.List;

public interface CategoryMappingService {
    List<CategoryMapping> getMappings(String salesProjectId);

    List<CategoryMapping> autoMap(String salesProjectId, boolean useAi);

    CategoryMapping createManualMapping(CategoryMapping mapping);

    CategoryMapping updateMapping(Long id, CategoryMapping mapping);

    void deleteMapping(Long id);

    void batchSave(String salesProjectId, List<CategoryMapping> mappings);

    List<CategoryMapping> reCompare(String salesProjectId, boolean useAi);
}
