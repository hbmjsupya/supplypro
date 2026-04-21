package com.supplypro.fix;

import com.supplypro.controller.PurchaseOrderController;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderSnapshot;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.PurchaseOrderSnapshotRepository;
import com.supplypro.service.PurchaseOrderSnapshotService;
import com.supplypro.service.PurchaseOrderService;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
public class PurchaseOrderConsistencyTest {

    @Autowired
    private PurchaseOrderController purchaseOrderController;

    @MockBean
    private PurchaseOrderSnapshotService snapshotService;

    @MockBean
    private PurchaseOrderService purchaseOrderService;

    @MockBean
    private PurchaseOrderRepository purchaseOrderRepository;

    @MockBean
    private PurchaseOrderSnapshotRepository purchaseOrderSnapshotRepository;
    
    @MockBean
    private com.supplypro.repository.InboundOrderRepository inboundOrderRepository;

    @Test
    public void testPaginationTotalBug() {
        // Setup: Mock 15 records in total, page size 10
        int totalRecords = 15;
        int pageSize = 10;
        
        List<PurchaseOrderSnapshot> content = new ArrayList<>();
        for (int i = 0; i < pageSize; i++) {
            PurchaseOrderSnapshot s = new PurchaseOrderSnapshot();
            s.setId((long)i);
            s.setSnapshotData("{}"); 
            content.add(s);
        }
        
        // Mock Page result: returns 10 items, but says total is 15
        Page<PurchaseOrderSnapshot> pageResult = new PageImpl<>(content, PageRequest.of(0, pageSize), totalRecords);
        
        when(snapshotService.searchSnapshots(any(Specification.class), any(Pageable.class)))
            .thenReturn(pageResult);
            
        // Mock conversion
        when(snapshotService.convertSnapshotToPO(any(PurchaseOrderSnapshot.class)))
            .thenAnswer(invocation -> {
                PurchaseOrderSnapshot s = (PurchaseOrderSnapshot) invocation.getArgument(0);
                PurchaseOrder po = new PurchaseOrder();
                po.setId(s.getId());
                return po;
            });

        // Execute
        ResponseEntity<Map<String, Object>> response = purchaseOrderController.getAll(
                0, 10, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
        );
        
        Map<String, Object> body = response.getBody();
        Map<String, Object> data = (Map<String, Object>) body.get("data");
        
        long returnedTotal = ((Number) data.get("total")).longValue();
        int returnedPageSize = ((Number) data.get("pageSize")).intValue();
        List<?> records = (List<?>) data.get("records");
        
        System.out.println("Test Pagination Total:");
        System.out.println("Expected Total: " + totalRecords);
        System.out.println("Actual Total: " + returnedTotal);
        System.out.println("Records in Page: " + records.size());
        
        // This assertion is expected to FAIL currently
        assertEquals(totalRecords, returnedTotal, "Total count should match database total elements, not page size");
    }
}
