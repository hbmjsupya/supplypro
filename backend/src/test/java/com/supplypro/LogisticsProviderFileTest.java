package com.supplypro;

import com.supplypro.controller.LogisticsProviderFileController;
import com.supplypro.dto.LogisticsProviderFileDTO;
import com.supplypro.service.LogisticsProviderFileService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = LogisticsProviderFileController.class, excludeAutoConfiguration = SecurityAutoConfiguration.class)
public class LogisticsProviderFileTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LogisticsProviderFileService logisticsProviderFileService;

    @Test
    public void testTempFileUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", 
                "test-contract.pdf", 
                MediaType.APPLICATION_PDF_VALUE, 
                "Test Content".getBytes()
        );

        LogisticsProviderFileDTO mockDto = new LogisticsProviderFileDTO();
        mockDto.setOriginalFileName("test-contract.pdf");
        mockDto.setCategory("CONTRACT");

        when(logisticsProviderFileService.uploadTempFile(eq("CONTRACT"), any(), any()))
                .thenReturn(mockDto);

        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/logistics-files/temp/upload")
                .file(file)
                .param("category", "CONTRACT")
                .param("description", "Test Description"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFileName").value("test-contract.pdf"))
                .andExpect(jsonPath("$.category").value("CONTRACT"));
    }

    @Test
    public void testGetFilesByCategory() throws Exception {
        when(logisticsProviderFileService.getFiles(eq(1L), eq("CONTRACT")))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logistics-files/{providerId}", 1L)
                .param("category", "CONTRACT"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    public void testDownloadFile() throws Exception {
        com.supplypro.entity.LogisticsProviderFile mockEntity = new com.supplypro.entity.LogisticsProviderFile();
        mockEntity.setStoredFileName("test-stored.pdf");
        mockEntity.setOriginalFileName("test-original.pdf");
        mockEntity.setFileType("application/pdf");

        when(logisticsProviderFileService.getFileEntity(1L)).thenReturn(mockEntity);
        
        org.springframework.core.io.Resource mockResource = new org.springframework.core.io.ByteArrayResource("Test Content".getBytes());
        when(logisticsProviderFileService.loadFileAsResource("test-stored.pdf")).thenReturn(mockResource);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/logistics-files/{fileId}/download", 1L))
                .andExpect(status().isOk())
                .andExpect(header().string(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"test-original.pdf\""))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }
}
