package com.supplypro;

import com.supplypro.dto.LogisticsProviderDTO;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class LogisticsProviderTest {

    @Test
    public void testDtoProcurementOwner() {
        LogisticsProviderDTO dto = new LogisticsProviderDTO();
        dto.setPurchaserName("John Doe");
        assertEquals("John Doe", dto.getProcurementOwner(), "ProcurementOwner should match PurchaserName");
        
        dto.setPurchaserName(null);
        assertEquals("", dto.getProcurementOwner(), "ProcurementOwner should be empty string if PurchaserName is null");
    }
}
