package com.supplypro.service;

import com.supplypro.entity.*;
import com.supplypro.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class RefundOrderService {

    @Autowired
    private RefundOrderRepository refundOrderRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private OutboundOrderRepository outboundOrderRepository;

    @Autowired
    private InboundOrderRepository inboundOrderRepository;

    @Autowired
    private StockFlowRepository stockFlowRepository;

    @Autowired
    private SkuRepository skuRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private StockBatchRepository stockBatchRepository;

    public Page<RefundOrder> search(String refundNo, String relatedOrderNo, String platformRefundNo,
                                     RefundOrder.RefundType refundType, RefundOrder.Bearer bearer,
                                     RefundOrder.Status status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return refundOrderRepository.search(refundNo, relatedOrderNo, platformRefundNo, refundType, bearer, status, pageable);
    }

    public RefundOrder getById(Long id) {
        return refundOrderRepository.findById(id).orElse(null);
    }

    public List<RefundOrder> getByRelatedOrderNo(String orderNo) {
        return refundOrderRepository.findByRelatedOrderNo(orderNo);
    }

    public List<RefundOrder> getByRelatedOrderIdAndBizType(Long relatedOrderId, RefundOrder.BizType bizType) {
        return refundOrderRepository.findByRelatedOrderIdAndBizType(relatedOrderId, bizType);
    }

    public BigDecimal getSupplierRefundTotalForPurchaseOrder(Long purchaseOrderId) {
        List<RefundOrder> refunds = refundOrderRepository.findByRelatedOrderIdAndBizType(
                purchaseOrderId, RefundOrder.BizType.PURCHASE);
        return refunds.stream()
                .filter(r -> r.getBearer() == RefundOrder.Bearer.SUPPLIER)
                .filter(r -> r.getStatus() == RefundOrder.Status.COMPLETED)
                .map(RefundOrder::getRefundAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public RefundOrder create(RefundOrder refundOrder) {
        String refundNo = generateRefundNo();
        refundOrder.setRefundNo(refundNo);
        findRelatedOrder(refundOrder);
        if (refundOrder.getBizType() == null) {
            refundOrder.setBizType(RefundOrder.BizType.PURCHASE);
        }
        if (refundOrder.getRefundType() == RefundOrder.RefundType.REFUND_ONLY
                && refundOrder.getBearer() == RefundOrder.Bearer.SUPPLIER) {
            refundOrder.setStatus(RefundOrder.Status.COMPLETED);
            handleRefundOnlySupplier(refundOrder);
        } else if (refundOrder.getRefundType() == RefundOrder.RefundType.REFUND_ONLY
                && refundOrder.getBearer() == RefundOrder.Bearer.PLATFORM) {
            throw new RuntimeException("仅退款且承担方为平台的退款单不会推送至本项目");
        } else if (refundOrder.getRefundType() == RefundOrder.RefundType.REFUND_RETURN) {
            if (refundOrder.getTrackingNo() != null && !refundOrder.getTrackingNo().isEmpty()) {
                refundOrder.setStatus(RefundOrder.Status.RETURNING);
            } else {
                refundOrder.setStatus(RefundOrder.Status.PENDING);
            }
        }
        return refundOrderRepository.save(refundOrder);
    }

    @Transactional
    public RefundOrder confirmReceipt(Long id, String receivedBy) {
        RefundOrder order = refundOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("退款单不存在"));
        if (order.getStatus() != RefundOrder.Status.RETURNING) {
            throw new RuntimeException("当前状态不允许确认收货");
        }
        order.setConfirmReceivedBy(receivedBy);
        order.setConfirmReceivedAt(LocalDateTime.now());
        handleConfirmReceiptBusinessLogic(order);
        order.setStatus(RefundOrder.Status.COMPLETED);
        return refundOrderRepository.save(order);
    }

    private void findRelatedOrder(RefundOrder refundOrder) {
        String platformOrderNo = refundOrder.getPlatformOrderNo();
        String platformSubOrderNo = refundOrder.getPlatformSubOrderNo();
        if (platformOrderNo != null && !platformOrderNo.isEmpty()) {
            List<PurchaseOrder> purchaseOrders = purchaseOrderRepository.findAll().stream()
                    .filter(po -> platformOrderNo.equals(po.getPlatformOrderNo()))
                    .toList();
            if (!purchaseOrders.isEmpty()) {
                PurchaseOrder po = purchaseOrders.get(0);
                refundOrder.setBizType(RefundOrder.BizType.PURCHASE);
                refundOrder.setRelatedOrderNo(po.getOrderNo());
                refundOrder.setRelatedOrderId(po.getId());
                return;
            }
        }
        if (platformOrderNo != null && !platformOrderNo.isEmpty()) {
            List<OutboundOrder> outboundOrders = outboundOrderRepository.findAll().stream()
                    .filter(oo -> platformOrderNo.equals(oo.getSourceRefNo()))
                    .toList();
            if (!outboundOrders.isEmpty()) {
                OutboundOrder oo = outboundOrders.get(0);
                refundOrder.setBizType(RefundOrder.BizType.OUTBOUND);
                refundOrder.setRelatedOrderNo(oo.getOutboundNo());
                refundOrder.setRelatedOrderId(oo.getId());
            }
        }
    }

    private void handleRefundOnlySupplier(RefundOrder refundOrder) {
        if (refundOrder.getBizType() == RefundOrder.BizType.PURCHASE && refundOrder.getRelatedOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(refundOrder.getRelatedOrderId()).orElse(null);
            if (po != null && po.getStatus() == PurchaseOrder.Status.PENDING) {
                po.setStatus(PurchaseOrder.Status.CANCELLED);
                purchaseOrderRepository.save(po);
            }
        }
    }

    private void handleConfirmReceiptBusinessLogic(RefundOrder order) {
        if (order.getBizType() == RefundOrder.BizType.PURCHASE
                && order.getBearer() == RefundOrder.Bearer.SUPPLIER) {
            // 供应商承担+采购单：退款金额记入待结算采购单列表（退款单本身作为子项展示）
            // 无需额外操作，待结算列表会自动查询关联的退款单
        } else if (order.getBizType() == RefundOrder.BizType.PURCHASE
                && order.getBearer() == RefundOrder.Bearer.PLATFORM) {
            createReturnInboundOrder(order);
        } else if (order.getBizType() == RefundOrder.BizType.OUTBOUND) {
            createReturnInboundOrder(order);
        }
    }

    private void createReturnInboundOrder(RefundOrder order) {
        InboundOrder inboundOrder = new InboundOrder();
        inboundOrder.setInboundNo("RK" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%03d", 1));
        inboundOrder.setStatus(InboundOrder.Status.PENDING);
        inboundOrder.setInboundDate(LocalDateTime.now());

        if (order.getBizType() == RefundOrder.BizType.PURCHASE && order.getRelatedOrderId() != null) {
            PurchaseOrder po = purchaseOrderRepository.findById(order.getRelatedOrderId()).orElse(null);
            if (po != null) {
                inboundOrder.setPurchaseOrder(po);
                if (po.getWarehouseId() != null) {
                    Warehouse wh = warehouseRepository.findById(po.getWarehouseId()).orElse(null);
                    if (wh != null) {
                        inboundOrder.setWarehouse(wh);
                    }
                }
            }
        }

        if (order.getBizType() == RefundOrder.BizType.OUTBOUND && order.getRelatedOrderId() != null) {
            OutboundOrder oo = outboundOrderRepository.findById(order.getRelatedOrderId()).orElse(null);
            if (oo != null && oo.getWarehouse() != null) {
                inboundOrder.setWarehouse(oo.getWarehouse());
            }
        }

        if (inboundOrder.getWarehouse() == null) {
            List<Warehouse> warehouses = warehouseRepository.findAll();
            if (!warehouses.isEmpty()) {
                inboundOrder.setWarehouse(warehouses.get(0));
            }
        }

        inboundOrderRepository.save(inboundOrder);

        if (order.getSkuId() != null && order.getQuantity() != null) {
            Sku sku = skuRepository.findById(order.getSkuId()).orElse(null);
            Product product = order.getProductId() != null ? productRepository.findById(order.getProductId()).orElse(null) : null;
            Warehouse warehouse = inboundOrder.getWarehouse();

            BigDecimal unitCost = order.getUnitPrice() != null ? order.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal totalCost = unitCost.multiply(BigDecimal.valueOf(order.getQuantity()));

            StockBatch batch = new StockBatch();
            batch.setBatchNo(order.getRefundNo());
            batch.setProduct(product);
            batch.setSku(sku);
            batch.setWarehouse(warehouse);
            batch.setPurchaseOrderId(order.getRelatedOrderId());
            batch.setQuantity(order.getQuantity());
            batch.setAvailableQuantity(order.getQuantity());
            batch.setLockedQuantity(0);
            batch.setUnitCost(unitCost);
            batch.setTotalCost(totalCost);
            batch.setProductionDate(java.time.LocalDate.now());
            batch.setExpiryDate(java.time.LocalDate.now().plusYears(1));
            batch.setStatus(StockBatch.Status.ACTIVE);
            StockBatch savedBatch = stockBatchRepository.save(batch);

            int currentBalance = 0;
            if (warehouse != null && sku != null) {
                Integer balance = stockBatchRepository.sumQuantityByWarehouseIdAndSkuId(warehouse.getId(), sku.getId());
                currentBalance = balance != null ? balance : 0;
            }

            StockFlow stockFlow = new StockFlow();
            stockFlow.setStockBatch(savedBatch);
            stockFlow.setFlowType(StockFlow.FlowType.RETURN_IN);
            stockFlow.setQuantity(order.getQuantity());
            stockFlow.setBalanceAfter(currentBalance);
            stockFlow.setReferenceNo(order.getRefundNo());
            stockFlow.setBatchNo(order.getRefundNo());
            stockFlow.setReason("退款退货入库 - " + order.getRefundNo());
            stockFlow.setOperator(order.getConfirmReceivedBy());
            stockFlow.setCreatedAt(LocalDateTime.now());
            stockFlow.setSku(sku);
            stockFlow.setProduct(product);
            stockFlow.setWarehouse(warehouse);
            stockFlow.setUnitCost(unitCost);
            stockFlow.setTotalCost(totalCost);
            stockFlow.setCostChange(totalCost);
            stockFlow.setRelatedSheetNo(inboundOrder.getInboundNo());
            stockFlow.setSpecName(order.getSpecName());

            stockFlowRepository.save(stockFlow);
        }
    }

    private String generateRefundNo() {
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "T" + dateStr;
        String maxNo = refundOrderRepository.findMaxRefundNoByPrefix(prefix + "%");
        int seq = 1;
        if (maxNo != null && maxNo.length() > prefix.length()) {
            try {
                seq = Integer.parseInt(maxNo.substring(prefix.length())) + 1;
            } catch (NumberFormatException e) {
                seq = 1;
            }
        }
        return prefix + String.format("%04d", seq);
    }
}
