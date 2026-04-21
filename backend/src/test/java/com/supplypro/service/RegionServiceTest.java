package com.supplypro.service;

import com.supplypro.entity.Region;
import com.supplypro.repository.RegionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

public class RegionServiceTest {

    @Mock
    private RegionRepository regionRepository;

    @InjectMocks
    private RegionService regionService;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testGetNameByCode_Success() {
        Region region = new Region();
        region.setCode("110000");
        region.setName("Beijing");
        when(regionRepository.findByCode("110000")).thenReturn(Optional.of(region));

        String result = regionService.getNameByCode("110000");
        assertEquals("Beijing", result);
    }

    @Test
    public void testGetNameByCode_NotFound() {
        when(regionRepository.findByCode("999999")).thenReturn(Optional.empty());

        String result = regionService.getNameByCode("999999");
        assertEquals("999999", result); // Fallback to code
    }

    @Test
    public void testGetNameByCode_NotNumeric() {
        String result = regionService.getNameByCode("Shanghai");
        assertEquals("Shanghai", result); // Already a name
    }

    @Test
    public void testGetNameByCode_NullOrEmpty() {
        assertEquals(null, regionService.getNameByCode(null));
        assertEquals("", regionService.getNameByCode(""));
    }
}
