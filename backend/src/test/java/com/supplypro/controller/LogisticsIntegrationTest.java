package com.supplypro.controller;

import com.supplypro.dto.LogisticsResponse;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.search.ProductSearchRepository;
import com.supplypro.service.KuaidiNiaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.data.redis.repositories.enabled=false")
@AutoConfigureMockMvc
@Transactional
public class LogisticsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @MockBean
    private KuaidiNiaoService kuaidiNiaoService;

    @MockBean
    private ProductSearchRepository productSearchRepository;

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @MockBean
    private ReactiveRedisConnectionFactory reactiveRedisConnectionFactory;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private PurchaseOrder testOrder;

    @BeforeEach
    public void setup() {
        purchaseOrderRepository.deleteAll();
        supplierRepository.deleteAll();

        // Mock Redis
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);

        // Create Supplier
        Supplier supplier = new Supplier();
        supplier.setName("Test Supplier");
        supplier.setSupplierNo("SUP-" + UUID.randomUUID().toString().substring(0, 8));
        supplier.setContactPerson("Contact");
        supplier.setContactPhone("1234567890");
        supplier.setSettlementType(Supplier.SettlementType.CASH);
        supplier.setStatus(Supplier.Status.ACTIVE);
        supplierRepository.save(supplier);

        // Create test data
        testOrder = new PurchaseOrder();
        testOrder.setOrderNo("PO-" + UUID.randomUUID().toString().substring(0, 8));
        testOrder.setLogisticsCompany("SF");
        testOrder.setTrackingNumber("SF123456789");
        testOrder.setSupplier(supplier);
        testOrder.setType(PurchaseOrder.Type.STANDARD);
        testOrder.setTotalAmount(BigDecimal.ZERO);
        testOrder.setStatus(PurchaseOrder.Status.PENDING);
        
        purchaseOrderRepository.save(testOrder);
    }

    @Test
    @WithMockUser(username = "admin")
    public void testGetLogisticsTrack_Success() throws Exception {
        // Mock KuaidiNiao Service response
        LogisticsResponse mockResponse = new LogisticsResponse();
        mockResponse.setSuccess(true);
        mockResponse.setLogisticCode("SF123456789");
        mockResponse.setState("2"); // In Transit
        LogisticsResponse.Trace trace = new LogisticsResponse.Trace();
        trace.setAcceptTime("2023-10-27 10:00:00");
        trace.setAcceptStation("Station A");
        mockResponse.setTraces(Collections.singletonList(trace));

        when(kuaidiNiaoService.track("SF", "SF123456789")).thenReturn(mockResponse);

        mockMvc.perform(get("/api/logistics/track/purchase-order/" + testOrder.getId()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.LogisticCode").value("SF123456789"))
                .andExpect(jsonPath("$.data.Success").value(true))
                .andExpect(jsonPath("$.data.Traces[0].AcceptStation").value("Station A"));
    }

    @Test
    @WithMockUser(username = "admin")
    public void testGetLogisticsTrack_OrderNotFound() throws Exception {
        mockMvc.perform(get("/api/logistics/track/purchase-order/999999"))
                .andDo(print())
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "admin")
    public void testGetLogisticsTrack_MissingInfo() throws Exception {
        PurchaseOrder noInfoOrder = new PurchaseOrder();
        noInfoOrder.setOrderNo("PO-NO-INFO-" + UUID.randomUUID().toString().substring(0, 8));
        noInfoOrder.setSupplier(testOrder.getSupplier());
        noInfoOrder.setType(PurchaseOrder.Type.STANDARD);
        noInfoOrder.setTotalAmount(BigDecimal.ZERO);
        noInfoOrder.setStatus(PurchaseOrder.Status.PENDING);
        purchaseOrderRepository.save(noInfoOrder);

        mockMvc.perform(get("/api/logistics/track/purchase-order/" + noInfoOrder.getId()))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("物流信息缺失 (公司编码或单号为空)"));
    }
}
