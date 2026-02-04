package com.supplypro.controller;

import com.supplypro.entity.Brand;
import com.supplypro.repository.BrandRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.search.ProductSearchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class BrandPermissionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BrandRepository brandRepository;

    @MockBean
    private SupplierRepository supplierRepository;

    @MockBean
    private ProductSearchRepository productSearchRepository;

    @BeforeEach
    void setUp() {
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testGetBrandById_Admin() throws Exception {
        Brand brand = new Brand();
        brand.setId(1L);
        brand.setName("Test Brand");
        
        when(brandRepository.findById(1L)).thenReturn(Optional.of(brand));
        // Admin skips permission check in controller, but we mock it just in case logic changes
        // Actually controller checks role first, so this mock might not be used, which is fine.

        mockMvc.perform(get("/api/brands/1"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    public void testGetBrandById_User_NoPermission() throws Exception {
        Brand brand = new Brand();
        brand.setId(1L);
        brand.setName("Test Brand");

        when(brandRepository.findById(1L)).thenReturn(Optional.of(brand));
        when(brandRepository.hasPermission(anyLong(), anyString())).thenReturn(false);

        mockMvc.perform(get("/api/brands/1"))
                .andExpect(status().isForbidden());
    }
}
