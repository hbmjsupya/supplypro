package com.supplypro;

import com.supplypro.controller.LogisticsProviderController;
import com.supplypro.dto.LogisticsProviderSearchCriteria;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.User;
import com.supplypro.service.LogisticsProviderAccountService;
import com.supplypro.service.LogisticsProviderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LogisticsProviderController.class, excludeAutoConfiguration = SecurityAutoConfiguration.class)
public class LogisticsProviderPurchaserTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LogisticsProviderService logisticsProviderService;

    @MockBean
    private LogisticsProviderAccountService logisticsProviderAccountService;

    @Test
    public void testGetAllReturnsPurchaserInfo() throws Exception {
        // Prepare mock data
        User purchaser = new User();
        purchaser.setId(100L);
        purchaser.setUsername("Test Purchaser");

        LogisticsProvider provider = new LogisticsProvider();
        provider.setId(1L);
        provider.setName("Test Provider");
        provider.setPurchaser(purchaser);

        Page<LogisticsProvider> page = new PageImpl<>(Collections.singletonList(provider));

        when(logisticsProviderService.findAll(anyInt(), anyInt(), any(LogisticsProviderSearchCriteria.class)))
                .thenReturn(page);

        // Execute & Verify
        mockMvc.perform(get("/api/logistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].purchaserId").value(100))
                .andExpect(jsonPath("$.data.records[0].purchaserName").value("Test Purchaser"))
                .andExpect(jsonPath("$.data.records[0].procurementOwner").value("Test Purchaser"));
    }

    @Test
    public void testGetByIdReturnsPurchaserInfo() throws Exception {
        // Prepare mock data
        User purchaser = new User();
        purchaser.setId(100L);
        purchaser.setUsername("Test Purchaser");

        LogisticsProvider provider = new LogisticsProvider();
        provider.setId(1L);
        provider.setName("Test Provider");
        provider.setPurchaser(purchaser);

        when(logisticsProviderService.getById(1L)).thenReturn(provider);

        // Execute & Verify
        mockMvc.perform(get("/api/logistics/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.purchaserId").value(100))
                .andExpect(jsonPath("$.data.purchaserName").value("Test Purchaser"));
    }
}
