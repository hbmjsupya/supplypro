package com.supplypro.controller;

import com.supplypro.entity.Warehouse;
import com.supplypro.repository.WarehouseRepository;
import com.supplypro.service.WarehouseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class WarehouseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WarehouseRepository warehouseRepository;
    
    @MockBean
    private WarehouseService warehouseService;

    @Test
    @WithMockUser
    @SuppressWarnings("unchecked")
    public void testGetWarehouses() throws Exception {
        Warehouse activeWarehouse = new Warehouse();
        activeWarehouse.setId(1L);
        activeWarehouse.setStatus(Warehouse.Status.ACTIVE);
        activeWarehouse.setName("Active WH");

        // Mock repository response
        when(warehouseRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.singletonList(activeWarehouse)));

        // Perform GET request with status filter
        mockMvc.perform(get("/api/warehouses")
                .param("statuses", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].status").value("ACTIVE"));
        
        // Verify that repository was called
        verify(warehouseRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
