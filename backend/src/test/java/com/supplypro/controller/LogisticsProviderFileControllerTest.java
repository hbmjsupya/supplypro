package com.supplypro.controller;

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

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LogisticsProviderFileController.class, excludeAutoConfiguration = SecurityAutoConfiguration.class)
public class LogisticsProviderFileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LogisticsProviderFileService logisticsProviderFileService;

    @Test
    public void testUploadTempFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                "Hello, World!".getBytes()
        );

        LogisticsProviderFileDTO mockDto = new LogisticsProviderFileDTO();
        mockDto.setUrl("http://localhost/temp/test.pdf");
        mockDto.setOriginalFileName("test.pdf");

        given(logisticsProviderFileService.uploadTempFile(eq("QUALIFICATION"), any(), any()))
                .willReturn(mockDto);

        mockMvc.perform(multipart("/api/logistics-files/temp/upload")
                        .file(file)
                        .param("category", "QUALIFICATION")
                        .param("description", "Test file"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("http://localhost/temp/test.pdf"));
    }

    @Test
    public void testGetFiles() throws Exception {
        LogisticsProviderFileDTO file1 = new LogisticsProviderFileDTO();
        file1.setId(1L);
        file1.setOriginalFileName("contract.pdf");
        file1.setCategory("CONTRACT");

        List<LogisticsProviderFileDTO> files = Arrays.asList(file1);

        given(logisticsProviderFileService.getFiles(1L, "CONTRACT"))
                .willReturn(files);

        mockMvc.perform(get("/api/logistics-files/1")
                        .param("category", "CONTRACT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].originalFileName").value("contract.pdf"));
    }
}
