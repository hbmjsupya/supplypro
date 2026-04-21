package com.supplypro.service;

import com.supplypro.dto.DeliveryOrderImportDTO;
import com.supplypro.dto.DeliveryOrderImportResult;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface DeliveryOrderImportService {
    
    DeliveryOrderImportResult importDeliveryOrders(MultipartFile file) throws IOException;
    
    byte[] generateResultExcel(DeliveryOrderImportResult result) throws IOException;
}
