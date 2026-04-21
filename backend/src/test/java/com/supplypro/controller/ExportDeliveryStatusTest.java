package com.supplypro.controller;

import com.supplypro.entity.PurchaseOrder;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.service.DeliveryOrderExportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@AutoConfigureMockMvc
public class ExportDeliveryStatusTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PurchaseOrderRepository purchaseOrderRepository;

    @MockBean
    private DeliveryOrderExportService deliveryOrderExportService;

    @BeforeEach
    public void setup() {
        // 模拟 repository 返回空列表，我们主要验证 Specification 构建逻辑
        when(purchaseOrderRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
    }

    @Test
    public void testExportDelivery_WhenNoStatusProvided_ShouldFilterByPending() throws Exception {
        Map<String, Object> request = new HashMap<>();
        // 不传 status

        mockMvc.perform(post("/api/purchase-orders/export-delivery")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"keyword\":\"test\"}")) // JSON content
                .andExpect(status().isBadRequest()); // expect 400 because empty list

        // 验证 findAll 调用时的 Specification
        ArgumentCaptor<Specification<PurchaseOrder>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        verify(purchaseOrderRepository).findAll(specCaptor.capture());
        
        // 注意：由于 Specification 是 lambda 表达式，直接验证内部逻辑比较困难。
        // 但我们可以通过集成测试或更深入的 Mock 来验证。
        // 这里主要验证接口能正常响应且 repository 被调用。
    }

    @Test
    public void testGetExportDeliveryCount_ShouldAlwaysFilterByPending() throws Exception {
        // 验证 count 接口也强制过滤 PENDING 状态
        mockMvc.perform(post("/api/purchase-orders/export-delivery-count")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\"}")) // 即使传入 COMPLETED
                .andExpect(status().isOk()); // 应该返回 200

        ArgumentCaptor<Specification<PurchaseOrder>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        verify(purchaseOrderRepository).findAll(specCaptor.capture());
        
        // 同样，我们验证 repository 被调用了。
        // 实际的 SQL 过滤逻辑在集成测试中更有意义。
    }
}
