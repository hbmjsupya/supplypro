package com.supplypro.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class BatchDistributeRequest {
    private List<Long> warehouseIds;
    private List<DistributeItem> items;

    @Data
    public static class DistributeItem {
        private Long productId;
        private Integer quantity;
        private BigDecimal unitCost;
    }
}
