package com.supplypro.service.impl;

import com.supplypro.entity.ProjectCategory;
import com.supplypro.repository.ProjectCategoryRepository;
import com.supplypro.service.ProjectCategoryService;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class ProjectCategoryServiceImpl implements ProjectCategoryService {

    @Autowired
    private ProjectCategoryRepository projectCategoryRepository;

    @Override
    public List<ProjectCategory> getProjectCategories(String salesProjectId) {
        return projectCategoryRepository.findBySalesProjectId(salesProjectId);
    }

    @Override
    public List<ProjectCategory> getLeafCategories(String salesProjectId) {
        return projectCategoryRepository.findBySalesProjectIdAndIsLeafTrue(salesProjectId);
    }

    @Override
    public List<Map<String, Object>> uploadAndExtract(MultipartFile file) {
        List<Map<String, Object>> result = new ArrayList<>();
        String fileName = file.getOriginalFilename();

        try (InputStream is = file.getInputStream()) {
            Workbook workbook;
            if (fileName != null && fileName.endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(is);
            } else if (fileName != null && fileName.endsWith(".xls")) {
                workbook = new HSSFWorkbook(is);
            } else {
                workbook = new XSSFWorkbook(is);
            }

            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                String sheetName = sheet.getSheetName();

                for (int j = 0; j <= sheet.getLastRowNum(); j++) {
                    Row row = sheet.getRow(j);
                    if (row == null) {
                        continue;
                    }

                    List<String> rowData = new ArrayList<>();
                    for (int k = 0; k < row.getLastCellNum(); k++) {
                        Cell cell = row.getCell(k);
                        rowData.add(getCellStringValue(cell));
                    }

                    Map<String, Object> rowMap = new HashMap<>();
                    rowMap.put("sheetName", sheetName);
                    rowMap.put("rowIndex", j);
                    rowMap.put("rowData", rowData);
                    result.add(rowMap);
                }
            }

            workbook.close();
        } catch (IOException e) {
            log.error("Failed to read Excel file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to read Excel file: " + e.getMessage());
        }

        return result;
    }

    @Override
    @Transactional
    public List<ProjectCategory> saveParsedCategories(String salesProjectId, List<Map<String, Object>> parsedData) {
        List<ProjectCategory> categories = new ArrayList<>();

        for (Map<String, Object> item : parsedData) {
            ProjectCategory category = new ProjectCategory();
            category.setProjectCategoryId(UUID.randomUUID().toString());
            category.setSalesProjectId(salesProjectId);
            category.setName((String) item.get("name"));
            category.setLevel(item.get("level") != null ? ((Number) item.get("level")).intValue() : 1);
            category.setParentId(item.get("parentId") != null ? String.valueOf(item.get("parentId")) : null);
            category.setFullPath((String) item.get("fullPath"));
            category.setIsLeaf(item.get("isLeaf") != null && Boolean.TRUE.equals(item.get("isLeaf")));
            category.setCreatedAt(LocalDateTime.now());
            category.setUpdatedAt(LocalDateTime.now());
            categories.add(category);
        }

        return projectCategoryRepository.saveAll(categories);
    }

    @Override
    @Transactional
    public void deleteBySalesProjectId(String salesProjectId) {
        projectCategoryRepository.deleteBySalesProjectId(salesProjectId);
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) {
            return "";
        }
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                }
                double numVal = cell.getNumericCellValue();
                if (numVal == Math.floor(numVal) && !Double.isInfinite(numVal)) {
                    return String.valueOf((long) numVal);
                }
                return String.valueOf(numVal);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return "";
        }
    }
}
