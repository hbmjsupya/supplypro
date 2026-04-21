package com.supplypro.service.impl;

import com.supplypro.entity.DeliveryExportRecord;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.Product;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.entity.Supplier;
import com.supplypro.repository.DeliveryExportRecordRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.ProductRepository;
import com.supplypro.repository.PurchaseOrderItemRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.service.DeliveryOrderExportService;
import com.supplypro.service.PurchaseOrderSnapshotService;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class DeliveryOrderExportServiceImpl implements DeliveryOrderExportService {

    private static final Logger log = LoggerFactory.getLogger(DeliveryOrderExportServiceImpl.class);

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private DeliveryExportRecordRepository deliveryExportRecordRepository;
    
    @Autowired
    private PurchaseOrderSnapshotService snapshotService;
    
    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;
    
    @Autowired
    private SettlementOrderRepository settlementOrderRepository;
    
    @org.springframework.beans.factory.annotation.Value("${file.upload-dir}")
    private String uploadDir;

    private String currentExportFileName;
    private List<Long> currentExportedOrderIds;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter FILENAME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

    @Override
    @Transactional
    public byte[] exportDeliveryOrders(List<Long> purchaseOrderIds, String exportedBy) throws Exception {
        log.info("开始导出发货单，采购单ID: {}, 操作人: {}", purchaseOrderIds, exportedBy);

        if (purchaseOrderIds == null || purchaseOrderIds.isEmpty()) {
            throw new IllegalArgumentException("采购单ID列表不能为空");
        }

        List<PurchaseOrder> orders = purchaseOrderRepository.findAllById(purchaseOrderIds);
        if (orders.isEmpty()) {
            throw new IllegalArgumentException("未找到指定的采购单");
        }

        for (PurchaseOrder order : orders) {
            if (order.getStatus() != PurchaseOrder.Status.PENDING) {
                throw new IllegalStateException("采购单 " + order.getOrderNo() + " 状态不是待处理，无法导出");
            }
            if (order.getShippingStatus() != PurchaseOrder.ShippingStatus.PENDING) {
                throw new IllegalStateException("采购单 " + order.getOrderNo() + " 发货状态不是待处理，无法导出");
            }
        }

        Map<Long, List<PurchaseOrder>> ordersBySupplier = orders.stream()
                .collect(Collectors.groupingBy(order -> order.getSupplier().getId()));

        log.info("按供应商拆分完成，共 {} 个供应商", ordersBySupplier.size());

        Map<Long, Supplier> supplierMap = new HashMap<>();
        for (Long supplierId : ordersBySupplier.keySet()) {
            supplierRepository.findById(supplierId).ifPresent(supplier -> supplierMap.put(supplierId, supplier));
        }

        Map<Long, List<PurchaseOrderItem>> orderItemsMap = new HashMap<>();
        for (PurchaseOrder order : orders) {
            List<PurchaseOrderItem> items = purchaseOrderItemRepository.findByPurchaseOrderId(order.getId());
            orderItemsMap.put(order.getId(), items);
        }

        Set<Long> productIds = new HashSet<>();
        for (List<PurchaseOrderItem> items : orderItemsMap.values()) {
            for (PurchaseOrderItem item : items) {
                if (item.getProductId() != null) {
                    productIds.add(item.getProductId());
                }
            }
        }
        Map<Long, Product> productMap = new HashMap<>();
        if (!productIds.isEmpty()) {
            List<Product> products = productRepository.findAllById(productIds);
            for (Product product : products) {
                productMap.put(product.getId(), product);
            }
        }

        Set<Long> logisticsProviderIds = orders.stream()
                .filter(order -> order.getLogisticsProvider() != null)
                .map(order -> order.getLogisticsProvider().getId())
                .collect(Collectors.toSet());
        Map<Long, LogisticsProvider> logisticsProviderMap = new HashMap<>();
        if (!logisticsProviderIds.isEmpty()) {
            List<LogisticsProvider> providers = logisticsProviderRepository.findAllById(logisticsProviderIds);
            for (LogisticsProvider provider : providers) {
                logisticsProviderMap.put(provider.getId(), provider);
            }
        }

        String timestamp = LocalDateTime.now().format(FILENAME_FORMATTER);
        this.currentExportFileName = "发货单-" + timestamp + ".zip";
        this.currentExportedOrderIds = new ArrayList<>(purchaseOrderIds);

        byte[] zipBytes = generateZipFile(ordersBySupplier, supplierMap, orderItemsMap, productMap, logisticsProviderMap);

        saveExportRecord(exportedBy, purchaseOrderIds, zipBytes.length, zipBytes);

        updateOrderShippingStatus(orders);

        log.info("发货单导出完成，文件名: {}, 大小: {} bytes", currentExportFileName, zipBytes.length);

        return zipBytes;
    }

    private byte[] generateZipFile(
            Map<Long, List<PurchaseOrder>> ordersBySupplier,
            Map<Long, Supplier> supplierMap,
            Map<Long, List<PurchaseOrderItem>> orderItemsMap,
            Map<Long, Product> productMap,
            Map<Long, LogisticsProvider> logisticsProviderMap) throws IOException {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        String exportDate = LocalDateTime.now().format(DATE_FORMATTER);

        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (Map.Entry<Long, List<PurchaseOrder>> entry : ordersBySupplier.entrySet()) {
                Long supplierId = entry.getKey();
                List<PurchaseOrder> supplierOrders = entry.getValue();
                Supplier supplier = supplierMap.get(supplierId);

                if (supplier == null) {
                    log.warn("供应商ID {} 未找到，跳过", supplierId);
                    continue;
                }

                String supplierName = supplier.getName().replaceAll("[\\s\\\\/:*?\"<>|]", "");
                String excelFileName = supplierName + LocalDateTime.now().format(FILENAME_FORMATTER) + ".xlsx";
                byte[] excelBytes = generateExcelFile(supplierOrders, supplier, orderItemsMap, productMap, logisticsProviderMap);

                ZipEntry zipEntry = new ZipEntry(excelFileName);
                zos.putNextEntry(zipEntry);
                zos.write(excelBytes);
                zos.closeEntry();

                log.info("生成Excel文件: {}, 大小: {} bytes", excelFileName, excelBytes.length);
            }
        }

        return baos.toByteArray();
    }

    private byte[] generateExcelFile(
            List<PurchaseOrder> orders,
            Supplier supplier,
            Map<Long, List<PurchaseOrderItem>> orderItemsMap,
            Map<Long, Product> productMap,
            Map<Long, LogisticsProvider> logisticsProviderMap) throws IOException {

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("发货单");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            int rowNum = 0;

            Row supplierRow = sheet.createRow(rowNum++);
            supplierRow.createCell(0).setCellValue("供应商：" + supplier.getName());

            rowNum++;

            String[] headers = {
                    "采购单编号", "标签", "供应商", "商品信息", "商品规格", "数量",
                    "成本单价", "成本总价", "下单时间", "收货人", "联系电话",
                    "收货地址", "期望到货时间", "采购单备注", "物流供应商", "配送方式",
                    "物流公司", "物流单号", "备注", "配送员", "联系电话", "车牌号", "费用"
            };

            Row headerRow = sheet.createRow(rowNum++);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            for (PurchaseOrder order : orders) {
                List<PurchaseOrderItem> items = orderItemsMap.getOrDefault(order.getId(), new ArrayList<>());

                if (items.isEmpty()) {
                    Row dataRow = sheet.createRow(rowNum++);
                    fillOrderData(dataRow, order, null, null, dataStyle, currencyStyle, logisticsProviderMap);
                } else {
                    for (PurchaseOrderItem item : items) {
                        Row dataRow = sheet.createRow(rowNum++);
                        Product product = productMap.get(item.getProductId());
                        fillOrderData(dataRow, order, item, product, dataStyle, currencyStyle, logisticsProviderMap);
                    }
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    private void fillOrderData(
            Row row,
            PurchaseOrder order,
            PurchaseOrderItem item,
            Product product,
            CellStyle dataStyle,
            CellStyle currencyStyle,
            Map<Long, LogisticsProvider> logisticsProviderMap) {

        int col = 0;

        createCell(row, col++, order.getOrderNo(), dataStyle);

        String label = "";
        if (order.getBizType() != null) {
            label = order.getBizType().getDescription();
        }
        createCell(row, col++, label, dataStyle);

        createCell(row, col++, order.getSupplierName(), dataStyle);

        String productName = "";
        if (item != null) {
            productName = item.getProductName();
            if (productName == null && product != null) {
                productName = product.getName();
            }
        }
        createCell(row, col++, productName, dataStyle);

        String spec = "";
        if (item != null) {
            spec = item.getSpec() != null ? item.getSpec() : item.getSpecName();
        }
        createCell(row, col++, spec, dataStyle);

        createCell(row, col++, item != null ? item.getQuantity().toString() : "", dataStyle);

        if (item != null && item.getUnitPrice() != null) {
            Cell priceCell = row.createCell(col++);
            priceCell.setCellValue(item.getUnitPrice().doubleValue());
            priceCell.setCellStyle(currencyStyle);
        } else {
            createCell(row, col++, "", dataStyle);
        }

        if (item != null && item.getTotalPrice() != null) {
            Cell totalCell = row.createCell(col++);
            totalCell.setCellValue(item.getTotalPrice().doubleValue());
            totalCell.setCellStyle(currencyStyle);
        } else {
            createCell(row, col++, "", dataStyle);
        }

        String orderTime = order.getCreatedAt() != null ? order.getCreatedAt().format(DATETIME_FORMATTER) : "";
        createCell(row, col++, orderTime, dataStyle);

        createCell(row, col++, order.getContactName(), dataStyle);

        createCell(row, col++, order.getContactPhone(), dataStyle);

        String address = buildAddress(order);
        createCell(row, col++, address, dataStyle);

        String deliveryDate = order.getDeliveryDate() != null ? order.getDeliveryDate().format(DATE_FORMATTER) : "";
        createCell(row, col++, deliveryDate, dataStyle);

        createCell(row, col++, order.getRemark(), dataStyle);

        String logisticsProviderName = "";
        if (order.getLogisticsProvider() != null) {
            LogisticsProvider provider = logisticsProviderMap.get(order.getLogisticsProvider().getId());
            if (provider != null) {
                logisticsProviderName = provider.getName();
            }
        }
        createCell(row, col++, logisticsProviderName, dataStyle);

        String deliveryMethod = "";
        if (order.getDeliveryMethod() != null) {
            switch (order.getDeliveryMethod()) {
                case "Logistics":
                    deliveryMethod = "物流配送";
                    break;
                case "SelfDelivery":
                    deliveryMethod = "自提";
                    break;
                default:
                    deliveryMethod = order.getDeliveryMethod();
            }
        }
        createCell(row, col++, deliveryMethod, dataStyle);

        createCell(row, col++, order.getLogisticsCompany(), dataStyle);

        createCell(row, col++, order.getTrackingNumber(), dataStyle);

        createCell(row, col++, "", dataStyle);

        createCell(row, col++, order.getDeliverer(), dataStyle);

        createCell(row, col++, order.getDelivererPhone(), dataStyle);

        createCell(row, col++, order.getPlateNumber(), dataStyle);

        if (order.getLogisticsFee() != null) {
            Cell feeCell = row.createCell(col++);
            feeCell.setCellValue(order.getLogisticsFee().doubleValue());
            feeCell.setCellStyle(currencyStyle);
        } else {
            createCell(row, col++, "", dataStyle);
        }
    }

    private void createCell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private String buildAddress(PurchaseOrder order) {
        StringBuilder sb = new StringBuilder();
        if (order.getProvince() != null) sb.append(order.getProvince());
        if (order.getCity() != null) sb.append(order.getCity());
        if (order.getDistrict() != null) sb.append(order.getDistrict());
        if (order.getDetailAddress() != null) sb.append(order.getDetailAddress());
        return sb.toString();
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);

        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0.00"));
        return style;
    }

    private void saveExportRecord(String exportedBy, List<Long> purchaseOrderIds, long fileSize, byte[] zipBytes) {
        try {
            // 创建exports目录
            Path exportsDir = Paths.get(uploadDir, "exports").toAbsolutePath().normalize();
            Files.createDirectories(exportsDir);
            
            // 保存文件到服务器
            Path filePath = exportsDir.resolve(currentExportFileName);
            try (FileOutputStream fos = new FileOutputStream(filePath.toFile())) {
                fos.write(zipBytes);
            }
            log.info("导出文件已保存到: {}", filePath);
            
            // 保存导出记录
            DeliveryExportRecord record = new DeliveryExportRecord();
            record.setFileName(currentExportFileName);
            record.setFilePath(filePath.toString());
            record.setFileSize(fileSize);
            record.setExportedBy(exportedBy);
            record.setExportedAt(LocalDateTime.now());
            record.setPurchaseOrderIds(purchaseOrderIds.stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",")));
            record.setTotalCount(purchaseOrderIds.size());
            record.setSuccessCount(purchaseOrderIds.size());
            record.setFailCount(0);
            record.setStatus("SUCCESS");

            deliveryExportRecordRepository.save(record);
            log.info("导出记录已保存，ID: {}", record.getId());
        } catch (IOException e) {
            log.error("保存导出文件失败: {}", e.getMessage(), e);
            throw new RuntimeException("保存导出文件失败: " + e.getMessage(), e);
        }
    }

    private void updateOrderShippingStatus(List<PurchaseOrder> orders) {
        for (PurchaseOrder order : orders) {
            PurchaseOrder.Status oldStatus = order.getStatus();
            PurchaseOrder.ShippingStatus oldShippingStatus = order.getShippingStatus();
            
            order.setShippingStatus(PurchaseOrder.ShippingStatus.TO_SHIP);
            order.setStatus(PurchaseOrder.Status.CONFIRMED);
            purchaseOrderRepository.save(order);
            
            try {
                snapshotService.captureSnapshot(order, "DELIVERY_EXPORT");
                log.info("采购单 {} 快照已更新，状态从 {} 更新为 {}", order.getOrderNo(), oldStatus, PurchaseOrder.Status.CONFIRMED);
            } catch (Exception e) {
                log.error("更新采购单 {} 快照失败: {}", order.getOrderNo(), e.getMessage(), e);
            }
            
            try {
                PurchaseOrderLog logEntry = new PurchaseOrderLog();
                logEntry.setPurchaseOrderId(order.getId());
                logEntry.setOperator("系统");
                logEntry.setOperationType("批量导出发货单");
                logEntry.setOldValue(String.format("状态: %s, 发货状态: %s", 
                    convertStatusToChinese(oldStatus), 
                    convertShippingStatusToChinese(oldShippingStatus)));
                logEntry.setNewValue(String.format("状态: %s, 发货状态: %s", 
                    convertStatusToChinese(PurchaseOrder.Status.CONFIRMED), 
                    convertShippingStatusToChinese(PurchaseOrder.ShippingStatus.TO_SHIP)));
                logEntry.setRemark(String.format("批量导出发货单操作，采购单编号: %s，导出时间: %s", 
                    order.getOrderNo(), 
                    LocalDateTime.now().format(DATETIME_FORMATTER)));
                purchaseOrderLogRepository.save(logEntry);
            } catch (Exception e) {
                log.error("保存采购单 {} 操作日志失败: {}", order.getOrderNo(), e.getMessage(), e);
            }
            
            createPurchaseSettlementIfNeeded(order, oldStatus);
            
            log.info("采购单 {} 发货状态已更新为待发货，状态从 {} 更新为 {}", order.getOrderNo(), oldStatus, PurchaseOrder.Status.CONFIRMED);
        }
    }
    
    private void createPurchaseSettlementIfNeeded(PurchaseOrder order, PurchaseOrder.Status oldStatus) {
        if (oldStatus != PurchaseOrder.Status.PENDING) {
            log.debug("采购单 {} 状态从 {} 变更，不需要创建商品结算单", order.getOrderNo(), oldStatus);
            return;
        }
        
        List<SettlementOrder> existingSettlements = settlementOrderRepository.findByRelatedOrderNoAndType(
            order.getOrderNo(), SettlementOrder.Type.PURCHASE);
        if (existingSettlements != null && !existingSettlements.isEmpty()) {
            log.debug("采购单 {} 已存在商品结算单，跳过创建", order.getOrderNo());
            return;
        }
        
        java.math.BigDecimal payableAmount = order.getTotalAmount();
        if (payableAmount == null || payableAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            log.debug("采购单 {} 应付金额为空或为零，跳过创建商品结算单", order.getOrderNo());
            return;
        }
        
        SettlementOrder settlement = new SettlementOrder();
        settlement.setType(SettlementOrder.Type.PURCHASE);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setRelatedOrderNo(order.getOrderNo());
        settlement.setTotalAmount(payableAmount);
        settlement.setSupplier(order.getSupplier());
        settlement.setSourceType("采购单");
        
        java.math.BigDecimal netAmount = payableAmount.divide(new java.math.BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
        java.math.BigDecimal taxAmount = payableAmount.subtract(netAmount);
        settlement.setNetAmount(netAmount);
        settlement.setTaxAmount(taxAmount);
        
        String deliveryNo = "GS" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + 
                           String.format("%03d", new java.util.Random().nextInt(1000));
        settlement.setDeliveryNo(deliveryNo);
        
        if (order.getSupplier() != null && order.getSupplier().getSettlementPeriod() != null) {
            settlement.setSettlementPeriod(order.getSupplier().getSettlementPeriod());
        }
        
        settlement.setCreatedAt(LocalDateTime.now());
        settlement.setCreatedBy("SYSTEM");
        
        settlementOrderRepository.save(settlement);
        
        order.setSettlementStatus(PurchaseOrder.SettlementStatus.UNSETTLED);
        purchaseOrderRepository.save(order);
        
        log.info("采购单 {} 批量导出发货单后自动创建商品结算单 {}，金额 {}", 
            order.getOrderNo(), deliveryNo, payableAmount);
    }
    
    private String convertStatusToChinese(PurchaseOrder.Status status) {
        if (status == null) return "未知";
        switch (status) {
            case PENDING: return "待处理";
            case CONFIRMED: return "已确认";
            case SHIPPED: return "已发货";
            case RECEIVED: return "已收货";
            case CANCELLED: return "已取消";
            case PENDING_SETTLEMENT: return "待结算";
            default: return status.name();
        }
    }
    
    private String convertShippingStatusToChinese(PurchaseOrder.ShippingStatus status) {
        if (status == null) return "未知";
        switch (status) {
            case PENDING: return "待处理";
            case TO_SHIP: return "待发货";
            case SHIPPED: return "已发货";
            case RECEIVED: return "已收货";
            default: return status.name();
        }
    }

    @Override
    public String getExportFileName() {
        return currentExportFileName;
    }

    @Override
    public List<Long> getExportedPurchaseOrderIds() {
        return currentExportedOrderIds;
    }
}
