package com.supplypro.service.impl;

import com.supplypro.dto.DeliveryOrderImportDTO;
import com.supplypro.dto.DeliveryOrderImportResult;
import com.supplypro.dto.LogisticsResponse;
import com.supplypro.entity.LogisticsCompany;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.PurchaseOrder;
import com.supplypro.entity.PurchaseOrderItem;
import com.supplypro.entity.PurchaseOrderLog;
import com.supplypro.entity.SettlementOrder;
import com.supplypro.repository.LogisticsCompanyRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.PurchaseOrderLogRepository;
import com.supplypro.repository.PurchaseOrderRepository;
import com.supplypro.repository.SettlementOrderRepository;
import com.supplypro.service.DeliveryOrderImportService;
import com.supplypro.service.KuaidiNiaoService;
import com.supplypro.service.PurchaseOrderSnapshotService;
import com.supplypro.util.PurchaseOrderShippingValidator;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class DeliveryOrderImportServiceImpl implements DeliveryOrderImportService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryOrderImportServiceImpl.class);
    
    private static final Pattern TRACKING_NUMBER_PATTERN = Pattern.compile("^[A-Za-z0-9-]{5,50}$");
    
    private static class ValidationResult {
        private final List<String> errors = new ArrayList<>();
        private final List<String> warnings = new ArrayList<>();
        private boolean blockingError = false;
        
        public void addError(String error) {
            errors.add(error);
        }
        
        public void addWarning(String warning) {
            warnings.add(warning);
        }
        
        public void setBlockingError(boolean blocking) {
            this.blockingError = blocking;
        }
        
        public boolean hasErrors() {
            return !errors.isEmpty();
        }
        
        public boolean hasBlockingError() {
            return blockingError;
        }
        
        public boolean isBlockingError() {
            return blockingError;
        }
        
        public String getErrorMessage() {
            return String.join("; ", errors);
        }
        
        public String getWarningMessage() {
            return String.join("; ", warnings);
        }
        
        public void mergeWarnings(String existingWarnings) {
            if (existingWarnings != null && !existingWarnings.trim().isEmpty()) {
                warnings.add(0, existingWarnings);
            }
        }
    }
    
    private static final String[] EXPECTED_HEADERS = {
        "采购单编号", "标签", "供应商", "商品信息", "商品规格", "数量", "成本单价", "成本总价",
        "下单时间", "收货人", "联系电话", "收货地址", "期望到货时间", "采购单备注",
        "物流供应商", "配送方式", "物流公司", "物流单号", "备注",
        "配送员", "联系电话", "车牌号", "费用"
    };

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;
    
    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;
    
    @Autowired
    private LogisticsCompanyRepository logisticsCompanyRepository;
    
    @Autowired
    private SettlementOrderRepository settlementOrderRepository;
    
    @Autowired
    private PurchaseOrderSnapshotService snapshotService;
    
    @Autowired
    private KuaidiNiaoService kuaidiNiaoService;
    
    @Autowired
    private PurchaseOrderLogRepository purchaseOrderLogRepository;

    @Override
    @Transactional
    public DeliveryOrderImportResult importDeliveryOrders(MultipartFile file) throws IOException {
        DeliveryOrderImportResult result = new DeliveryOrderImportResult();
        
        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            
            if (sheet.getPhysicalNumberOfRows() < 2) {
                throw new RuntimeException("Excel文件内容为空或只有标题行");
            }
            
            int headerRowIndex = findHeaderRow(sheet);
            if (headerRowIndex < 0) {
                throw new RuntimeException("无法找到有效的标题行，请确保Excel包含\"采购单编号\"列");
            }
            
            Row headerRow = sheet.getRow(headerRowIndex);
            Map<Integer, String> headerMap = parseHeaders(headerRow);
            
            List<DeliveryOrderImportDTO> allDtos = new ArrayList<>();
            
            for (int i = headerRowIndex + 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }
                
                DeliveryOrderImportDTO dto = parseRow(row, headerMap, i + 1);
                allDtos.add(dto);
            }
            
            validateSameTrackingNumberRecords(allDtos);
            
            for (DeliveryOrderImportDTO dto : allDtos) {
                try {
                    validateAndImport(dto);
                    if (dto.getErrorMessage() == null) {
                        dto.setSuccess(true);
                    } else {
                        dto.setSuccess(false);
                    }
                } catch (Exception e) {
                    logger.error("导入第{}行失败: {}", dto.getRowNum(), e.getMessage());
                    dto.setSuccess(false);
                    String existingError = dto.getErrorMessage();
                    dto.setErrorMessage(existingError != null 
                        ? existingError + "; " + e.getMessage() 
                        : e.getMessage());
                }
                
                result.addRecord(dto);
            }
        }
        
        return result;
    }
    
    private void validateSameTrackingNumberRecords(List<DeliveryOrderImportDTO> dtos) {
        Map<String, List<DeliveryOrderImportDTO>> trackingNumberGroups = new HashMap<>();
        
        for (DeliveryOrderImportDTO dto : dtos) {
            String trackingNumber = dto.getTrackingNumber();
            if (trackingNumber == null || trackingNumber.trim().isEmpty()) {
                continue;
            }
            
            trackingNumber = trackingNumber.trim();
            trackingNumberGroups.computeIfAbsent(trackingNumber, k -> new ArrayList<>()).add(dto);
        }
        
        for (Map.Entry<String, List<DeliveryOrderImportDTO>> entry : trackingNumberGroups.entrySet()) {
            String trackingNumber = entry.getKey();
            List<DeliveryOrderImportDTO> group = entry.getValue();
            
            if (group.size() <= 1) {
                continue;
            }
            
            // 检查该物流单号是否已在数据库中存在已发货/已收货的采购单
            List<PurchaseOrder> existingOrders = purchaseOrderRepository.findByTrackingNumber(trackingNumber);
            boolean hasShippedOrReceived = existingOrders != null && existingOrders.stream()
                .anyMatch(po -> po.getStatus() == PurchaseOrder.Status.SHIPPED || 
                               po.getStatus() == PurchaseOrder.Status.RECEIVED);
            
            if (hasShippedOrReceived) {
                // 如果物流单号已存在于已发货/已收货采购单，跳过校验
                // 后续checkTrackingNumberHistory方法会处理物流信息代入
                logger.info("物流单号[{}]已存在于已发货/已收货采购单，跳过导入文件内一致性校验", trackingNumber);
                continue;
            }
            
            int feeGreaterThanZeroCount = 0;
            for (DeliveryOrderImportDTO dto : group) {
                BigDecimal fee = dto.getFee();
                if (fee != null && fee.compareTo(BigDecimal.ZERO) > 0) {
                    feeGreaterThanZeroCount++;
                }
            }
            
            if (feeGreaterThanZeroCount > 1) {
                String errorMsg = String.format("物流单号[%s]存在多条记录物流费用大于0，仅允许一条记录物流费用大于0", trackingNumber);
                for (DeliveryOrderImportDTO dto : group) {
                    dto.setSuccess(false);
                    dto.setErrorMessage(dto.getErrorMessage() != null 
                        ? dto.getErrorMessage() + "; " + errorMsg 
                        : errorMsg);
                }
                continue;
            }
            
            DeliveryOrderImportDTO first = group.get(0);
            boolean inconsistent = false;
            
            for (int i = 1; i < group.size(); i++) {
                DeliveryOrderImportDTO current = group.get(i);
                
                if (!isStringEquals(first.getLogisticsCompany(), current.getLogisticsCompany()) ||
                    !isStringEquals(first.getLogisticsSupplier(), current.getLogisticsSupplier()) ||
                    !isStringEquals(first.getDeliverer(), current.getDeliverer()) ||
                    !isStringEquals(first.getDelivererPhone(), current.getDelivererPhone()) ||
                    !isStringEquals(first.getPlateNumber(), current.getPlateNumber())) {
                    inconsistent = true;
                    break;
                }
            }
            
            if (inconsistent) {
                String errorMsg = String.format("物流单号[%s]的物流信息不一致，请检查物流公司、物流供应商、配送员、联系电话、车牌号等字段", trackingNumber);
                for (DeliveryOrderImportDTO dto : group) {
                    dto.setSuccess(false);
                    dto.setErrorMessage(dto.getErrorMessage() != null 
                        ? dto.getErrorMessage() + "; " + errorMsg 
                        : errorMsg);
                }
            }
        }
    }
    
    private boolean isStringEquals(String s1, String s2) {
        if (s1 == null || s1.trim().isEmpty()) {
            return s2 == null || s2.trim().isEmpty();
        }
        if (s2 == null || s2.trim().isEmpty()) {
            return false;
        }
        return s1.trim().equals(s2.trim());
    }

    private int findHeaderRow(Sheet sheet) {
        for (int i = 0; i <= Math.min(5, sheet.getLastRowNum()); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            
            for (Cell cell : row) {
                String value = getCellValueAsString(cell);
                if ("采购单编号".equals(value) || "采购单号".equals(value)) {
                    return i;
                }
            }
        }
        return -1;
    }

    private Map<Integer, String> parseHeaders(Row headerRow) {
        Map<Integer, String> headerMap = new HashMap<>();
        
        for (Cell cell : headerRow) {
            int columnIndex = cell.getColumnIndex();
            String headerValue = getCellValueAsString(cell).trim();
            headerMap.put(columnIndex, headerValue);
        }
        
        return headerMap;
    }

    private DeliveryOrderImportDTO parseRow(Row row, Map<Integer, String> headerMap, int rowNum) {
        DeliveryOrderImportDTO dto = new DeliveryOrderImportDTO();
        dto.setRowNum(rowNum);
        
        Map<String, Integer> headerIndexMap = new HashMap<>();
        for (Map.Entry<Integer, String> entry : headerMap.entrySet()) {
            headerIndexMap.put(entry.getValue(), entry.getKey());
        }
        
        dto.setOrderNo(getStringValue(row, headerIndexMap, "采购单编号"));
        dto.setTag(getStringValue(row, headerIndexMap, "标签"));
        dto.setSupplierName(getStringValue(row, headerIndexMap, "供应商"));
        dto.setProductInfo(getStringValue(row, headerIndexMap, "商品信息"));
        dto.setProductSpec(getStringValue(row, headerIndexMap, "商品规格"));
        dto.setQuantity(getIntegerValue(row, headerIndexMap, "数量"));
        dto.setCostUnitPrice(getBigDecimalValue(row, headerIndexMap, "成本单价"));
        dto.setCostTotalPrice(getBigDecimalValue(row, headerIndexMap, "成本总价"));
        dto.setOrderTime(getStringValue(row, headerIndexMap, "下单时间"));
        dto.setReceiverName(getStringValue(row, headerIndexMap, "收货人"));
        dto.setReceiverPhone(getStringValue(row, headerIndexMap, "联系电话"));
        dto.setReceiverAddress(getStringValue(row, headerIndexMap, "收货地址"));
        dto.setExpectedArrivalTime(getStringValue(row, headerIndexMap, "期望到货时间"));
        dto.setOrderRemark(getStringValue(row, headerIndexMap, "采购单备注"));
        dto.setLogisticsSupplier(getStringValue(row, headerIndexMap, "物流供应商"));
        dto.setDeliveryMethod(getStringValue(row, headerIndexMap, "配送方式"));
        dto.setLogisticsCompany(getStringValue(row, headerIndexMap, "物流公司"));
        dto.setTrackingNumber(getStringValue(row, headerIndexMap, "物流单号"));
        dto.setLogisticsRemark(getStringValue(row, headerIndexMap, "备注"));
        dto.setDeliverer(getStringValue(row, headerIndexMap, "配送员"));
        dto.setDelivererPhone(getStringValue(row, headerIndexMap, "联系电话"));
        dto.setPlateNumber(getStringValue(row, headerIndexMap, "车牌号"));
        dto.setFee(getBigDecimalValue(row, headerIndexMap, "费用"));
        
        return dto;
    }

    private void validateAndImport(DeliveryOrderImportDTO dto) {
        if (dto.getErrorMessage() != null && !dto.getErrorMessage().isEmpty()) {
            dto.setSuccess(false);
            return;
        }
        
        ValidationResult validation = new ValidationResult();
        
        if (dto.getOrderNo() == null || dto.getOrderNo().trim().isEmpty()) {
            validation.addError("采购单编号不能为空");
            validation.setBlockingError(true);
        }
        
        if (validation.hasBlockingError()) {
            dto.setSuccess(false);
            dto.setErrorMessage(dto.getErrorMessage() != null 
                ? dto.getErrorMessage() + "; " + validation.getErrorMessage() 
                : validation.getErrorMessage());
            return;
        }
        
        String deliveryMethodRaw = dto.getDeliveryMethod();
        if (deliveryMethodRaw == null || deliveryMethodRaw.trim().isEmpty()) {
            validation.addError("配送方式不能为空");
        }
        
        String deliveryMethodNormalized = dto.getDeliveryMethodNormalized();
        if (deliveryMethodNormalized == null && deliveryMethodRaw != null && !deliveryMethodRaw.trim().isEmpty()) {
            validation.addError("配送方式只能填写物流配送或自配送");
        }
        
        PurchaseOrder order = purchaseOrderRepository.findByOrderNo(dto.getOrderNo().trim());
        if (order == null) {
            validation.addError("采购单[" + dto.getOrderNo() + "]不存在");
            validation.setBlockingError(true);
            dto.setSuccess(false);
            dto.setErrorMessage(dto.getErrorMessage() != null 
                ? dto.getErrorMessage() + "; " + validation.getErrorMessage() 
                : validation.getErrorMessage());
            return;
        }
        
        if (order.getSupplier() != null && dto.getSupplierName() != null && !dto.getSupplierName().trim().isEmpty()) {
            String orderSupplierName = order.getSupplier().getName();
            if (orderSupplierName != null && !orderSupplierName.equals(dto.getSupplierName().trim())) {
                validation.addError(String.format("采购单[%s]供应商不一致，系统中为[%s]，导入为[%s]", 
                    dto.getOrderNo(), orderSupplierName, dto.getSupplierName().trim()));
            }
        }
        
        PurchaseOrderItem matchedItem = null;
        if (dto.getProductInfo() != null && !dto.getProductInfo().trim().isEmpty() && order.getItems() != null && !order.getItems().isEmpty()) {
            boolean productMatched = false;
            String dtoProductInfo = dto.getProductInfo().trim();
            for (PurchaseOrderItem item : order.getItems()) {
                String productName = item.getProductName();
                if (productName != null && productName.equals(dtoProductInfo)) {
                    productMatched = true;
                    matchedItem = item;
                    break;
                }
            }
            if (!productMatched) {
                validation.addError(String.format("采购单[%s]商品信息不一致，系统中不存在商品[%s]", dto.getOrderNo(), dtoProductInfo));
            }
            
            if (matchedItem != null && dto.getQuantity() != null) {
                int systemQuantity = matchedItem.getQuantity() != null ? matchedItem.getQuantity() : 0;
                int importQuantity = dto.getQuantity();
                if (systemQuantity != importQuantity) {
                    validation.addError(String.format("采购单[%s]商品数量不一致，系统中数量为%d，导入数量为%d", dto.getOrderNo(), systemQuantity, importQuantity));
                }
            }
        }
        
        if (!PurchaseOrderShippingValidator.canFirstShip(order)) {
            String currentStatus = order.getShippingStatus() != null ? 
                                   convertShippingStatusToChinese(order.getShippingStatus()) : "未知";
            validation.addError(String.format(
                "采购单[%s]当前状态为[%s]，仅允许待处理/待发货状态执行发货操作", dto.getOrderNo(), currentStatus));
        }
        
        if (dto.getLogisticsSupplier() != null && !dto.getLogisticsSupplier().trim().isEmpty()) {
            LogisticsProvider provider = findLogisticsProvider(dto.getLogisticsSupplier().trim());
            if (provider == null) {
                validation.addError("物流供应商[" + dto.getLogisticsSupplier().trim() + "]在系统中不存在");
            }
        }
        
        if (deliveryMethodNormalized != null) {
            validateDeliveryInfoAll(dto, deliveryMethodNormalized, validation);
        }
        
        if (validation.hasErrors()) {
            dto.setSuccess(false);
            String existingError = dto.getErrorMessage();
            String newError = validation.getErrorMessage();
            dto.setErrorMessage(existingError != null 
                ? existingError + "; " + newError 
                : newError);
            if (validation.getWarningMessage() != null && !validation.getWarningMessage().isEmpty()) {
                String existingWarning = dto.getWarningMessage();
                String newWarning = validation.getWarningMessage();
                dto.setWarningMessage(existingWarning != null 
                    ? existingWarning + "; " + newWarning 
                    : newWarning);
            }
            return;
        }
        
        if (deliveryMethodNormalized != null) {
            checkTrackingNumberHistory(dto, deliveryMethodNormalized);
        }
        
        updatePurchaseOrder(order, dto, deliveryMethodNormalized);
        
        validation.mergeWarnings(dto.getWarningMessage());
        if (validation.getWarningMessage() != null && !validation.getWarningMessage().isEmpty()) {
            dto.setWarningMessage(validation.getWarningMessage());
        }
    }

    private void validateDeliveryInfoAll(DeliveryOrderImportDTO dto, String deliveryMethod, ValidationResult validation) {
        // 首先检查物流单号是否已存在于已发货/已收货采购单（适用于所有配送方式）
        String trackingNo = dto.getTrackingNumber();
        if (trackingNo != null && !trackingNo.trim().isEmpty()) {
            List<PurchaseOrder> existingOrders = purchaseOrderRepository.findByTrackingNumber(trackingNo.trim());
            boolean hasShippedOrReceived = existingOrders != null && existingOrders.stream()
                .anyMatch(po -> (po.getStatus() == PurchaseOrder.Status.SHIPPED || 
                                po.getStatus() == PurchaseOrder.Status.RECEIVED) &&
                               !po.getOrderNo().equals(dto.getOrderNo()));
            
            if (hasShippedOrReceived) {
                // 物流单号已存在于已发货/已收货采购单，跳过所有物流信息校验
                // 后续checkTrackingNumberHistory方法会处理物流信息代入
                logger.info("物流单号[{}]已存在于已发货/已收货采购单，跳过所有物流信息校验", trackingNo);
                return;
            }
        }
        
        if ("Logistics".equals(deliveryMethod)) {
            if (dto.getLogisticsCompany() == null || dto.getLogisticsCompany().trim().isEmpty()) {
                validation.addError("配送方式为物流配送时，物流公司不能为空");
            } else {
                LogisticsCompany company = findLogisticsCompany(dto.getLogisticsCompany().trim());
                if (company == null) {
                    validation.addError("物流公司[" + dto.getLogisticsCompany().trim() + "]在系统中不存在");
                }
            }
            
            if (dto.getTrackingNumber() == null || dto.getTrackingNumber().trim().isEmpty()) {
                validation.addError("配送方式为物流配送时，物流单号为必填项");
            } else {
                String trackingNoCheck = dto.getTrackingNumber().trim();
                if (!TRACKING_NUMBER_PATTERN.matcher(trackingNoCheck).matches()) {
                    validation.addError("物流单号格式不正确，应为5-50位字母、数字或横线");
                }
            }
        } else if ("SelfDelivery".equals(deliveryMethod)) {
            if (dto.getDeliverer() == null || dto.getDeliverer().trim().isEmpty()) {
                validation.addError("配送方式为自配送时，配送员为必填项");
            }
            if (dto.getDelivererPhone() == null || dto.getDelivererPhone().trim().isEmpty()) {
                validation.addError("配送方式为自配送时，联系电话为必填项");
            }
        }
    }

    private void checkTrackingNumberHistory(DeliveryOrderImportDTO dto, String deliveryMethod) {
        String trackingNo = dto.getTrackingNumber();
        if (trackingNo == null || trackingNo.trim().isEmpty()) {
            logger.debug("物流单号为空，跳过历史检查");
            return;
        }
        
        trackingNo = trackingNo.trim();
        logger.info("检查物流单号历史: {}, 当前采购单: {}", trackingNo, dto.getOrderNo());
        
        List<PurchaseOrder> duplicates = purchaseOrderRepository.findByTrackingNumber(trackingNo);
        logger.info("找到 {} 个使用相同物流单号的采购单", duplicates != null ? duplicates.size() : 0);
        
        if (duplicates == null || duplicates.isEmpty()) {
            return;
        }
        
        for (PurchaseOrder po : duplicates) {
            logger.info("  - 采购单: {}, 状态: {}, 运费: {}", po.getOrderNo(), po.getStatus(), po.getLogisticsFee());
        }
        
        // 优先选择有运费（>0）的采购单作为原始采购单
        // 如果没有运费大于0的采购单，则选择创建时间最早的
        PurchaseOrder duplicate = duplicates.stream()
            .filter(p -> !p.getOrderNo().equals(dto.getOrderNo().trim()))
            .filter(p -> p.getStatus() == PurchaseOrder.Status.SHIPPED || p.getStatus() == PurchaseOrder.Status.RECEIVED)
            .sorted((p1, p2) -> {
                BigDecimal fee1 = p1.getLogisticsFee() != null ? p1.getLogisticsFee() : BigDecimal.ZERO;
                BigDecimal fee2 = p2.getLogisticsFee() != null ? p2.getLogisticsFee() : BigDecimal.ZERO;
                
                // 优先按运费降序排序（运费大的排前面）
                int feeCompare = fee2.compareTo(fee1);
                if (feeCompare != 0) {
                    return feeCompare;
                }
                
                // 运费相同时，按创建时间升序排序（创建时间早的排前面）
                if (p1.getCreatedAt() == null && p2.getCreatedAt() == null) return 0;
                if (p1.getCreatedAt() == null) return 1;
                if (p2.getCreatedAt() == null) return -1;
                return p1.getCreatedAt().compareTo(p2.getCreatedAt());
            })
            .findFirst()
            .orElse(null);
        
        if (duplicate == null) {
            logger.info("未找到已发货状态的使用相同物流单号的采购单");
            return;
        }
        
        logger.info("找到已发货历史采购单: {}, 状态: {}, 运费: {}", 
            duplicate.getOrderNo(), duplicate.getStatus(), duplicate.getLogisticsFee());
        
        BigDecimal histFee = duplicate.getLogisticsFee() != null ? duplicate.getLogisticsFee() : BigDecimal.ZERO;
        
        String originalLogisticsCompany = dto.getLogisticsCompany();
        String originalLogisticsSupplier = dto.getLogisticsSupplier();
        String originalDeliverer = dto.getDeliverer();
        String originalDelivererPhone = dto.getDelivererPhone();
        String originalPlateNumber = dto.getPlateNumber();
        BigDecimal originalFee = dto.getFee();
        
        dto.setLogisticsCompany(duplicate.getLogisticsCompany());
        dto.setLogisticsSupplier(duplicate.getLogisticsSupplierName());
        dto.setDeliverer(duplicate.getDeliverer());
        dto.setDelivererPhone(duplicate.getDelivererPhone());
        dto.setPlateNumber(duplicate.getPlateNumber());
        if (duplicate.getDeliveryMethod() != null) {
            dto.setDeliveryMethod(duplicate.getDeliveryMethod());
        }
        
        String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String statusText = duplicate.getStatus() == PurchaseOrder.Status.RECEIVED ? "已收货" : "已发货";
        
        if (histFee.compareTo(BigDecimal.ZERO) > 0) {
            dto.setFee(BigDecimal.ZERO);
            
            StringBuilder warning = new StringBuilder();
            warning.append(String.format("物流单号[%s]已关联%s采购单[%s]；", trackingNo, statusText, duplicate.getOrderNo()));
            warning.append("已自动代入原采购单物流信息；");
            warning.append(String.format("信息代入时间：%s；", timestamp));
            warning.append("操作人员：系统导入；");
            warning.append("运费已置0（原采购单运费>0）");
            
            dto.setWarningMessage(warning.toString());
            
            logger.info("物流单号 {} 已关联{}采购单 {} (运费 {}), 强制代入原物流信息并置运费为0", 
                trackingNo, statusText, duplicate.getOrderNo(), histFee);
            logger.info("原始数据 - 物流公司: {}, 配送员: {}, 运费: {}", 
                originalLogisticsCompany, originalDeliverer, originalFee);
            logger.info("代入数据 - 物流公司: {}, 配送员: {}, 运费: 0", 
                duplicate.getLogisticsCompany(), duplicate.getDeliverer());
        } else {
            StringBuilder warning = new StringBuilder();
            warning.append(String.format("物流单号[%s]已关联%s采购单[%s]；", trackingNo, statusText, duplicate.getOrderNo()));
            warning.append("已自动代入原采购单物流信息；");
            warning.append(String.format("信息代入时间：%s；", timestamp));
            warning.append("操作人员：系统导入；");
            warning.append(String.format("运费使用导入值：%s（原采购单运费=0）", originalFee != null ? originalFee.toString() : "0"));
            
            dto.setWarningMessage(warning.toString());
            
            logger.info("物流单号 {} 已关联{}采购单 {} (运费=0), 代入原物流信息，使用导入运费", 
                trackingNo, statusText, duplicate.getOrderNo());
        }
    }

    private void updatePurchaseOrder(PurchaseOrder order, DeliveryOrderImportDTO dto, String deliveryMethod) {
        BigDecimal logisticsFee = dto.getFee() != null ? dto.getFee() : BigDecimal.ZERO;
        
        List<SettlementOrder> existingSettlements = settlementOrderRepository
            .findByRelatedOrderNoAndType(order.getOrderNo(), SettlementOrder.Type.LOGISTICS);
        SettlementOrder existingSettlement = (existingSettlements != null && !existingSettlements.isEmpty()) 
            ? existingSettlements.get(0) : null;
        
        if (existingSettlement != null) {
            throw new RuntimeException(String.format(
                "采购单已有配送记录，配送单号：%s，导入失败", 
                existingSettlement.getSettlementNo()));
        }
        
        order.setDeliveryMethod(deliveryMethod);
        
        String logisticsCompany = dto.getLogisticsCompany();
        String trackingNumber = dto.getTrackingNumber();
        
        if ("Logistics".equals(deliveryMethod) && trackingNumber != null && !trackingNumber.trim().isEmpty()) {
            try {
                logger.info("调用快递鸟API查询物流信息: 物流公司={}, 物流单号={}", logisticsCompany, trackingNumber);
                LogisticsResponse response = kuaidiNiaoService.track(logisticsCompany, trackingNumber);
                
                if (response != null && response.isSuccess()) {
                    String kdnShipperName = response.getShipperName();
                    String kdnShipperCode = response.getShipperCode();
                    String reason = response.getReason();
                    
                    if (reason != null && !reason.trim().isEmpty() && 
                        (reason.contains("暂无") || reason.contains("无轨迹") || reason.contains("无结果"))) {
                        String errorType = determineTrackingErrorType(reason);
                        String detailedWarning = buildTrackingWarningMessage(trackingNumber, logisticsCompany, errorType, reason);
                        
                        logger.warn("快递鸟API查询成功但无轨迹 - 物流单号: {}, 物流公司: {}, 原因: {}", 
                            trackingNumber, logisticsCompany, reason);
                        
                        dto.setWarningMessage(dto.getWarningMessage() != null 
                            ? dto.getWarningMessage() + "; " + detailedWarning 
                            : detailedWarning);
                    }
                    
                    if (kdnShipperName != null && !kdnShipperName.trim().isEmpty()) {
                        LogisticsCompany matchedCompany = findLogisticsCompanyByKdnInfo(kdnShipperName, kdnShipperCode);
                        if (matchedCompany != null) {
                            String originalCompany = logisticsCompany;
                            logisticsCompany = matchedCompany.getName();
                            logger.info("快递鸟返回物流公司: {} (code={}), 原始物流公司: {}, 使用快递鸟数据", 
                                kdnShipperName, kdnShipperCode, originalCompany);
                            
                            if (!isStringEquals(originalCompany, logisticsCompany)) {
                                dto.setWarningMessage(dto.getWarningMessage() != null 
                                    ? dto.getWarningMessage() + "; 物流公司已根据快递鸟API更新" 
                                    : "物流公司已根据快递鸟API更新");
                            }
                        } else {
                            logisticsCompany = kdnShipperName;
                            String codeInfo = kdnShipperCode != null ? "(" + kdnShipperCode + ")" : "";
                            logger.warn("快递鸟返回物流公司: {} {}, 未在系统物流公司库中找到匹配，直接使用返回名称", 
                                kdnShipperName, codeInfo);
                            
                            String warningMsg = String.format("物流公司[%s%s]未在系统库中匹配，已使用快递鸟返回名称", 
                                kdnShipperName, codeInfo);
                            dto.setWarningMessage(dto.getWarningMessage() != null 
                                ? dto.getWarningMessage() + "; " + warningMsg 
                                : warningMsg);
                        }
                    }
                } else {
                    String reason = response != null ? response.getReason() : "未知错误";
                    String errorType = determineTrackingErrorType(reason);
                    String detailedWarning = buildTrackingWarningMessage(trackingNumber, logisticsCompany, errorType, reason);
                    
                    logger.warn("快递鸟API查询失败 - 物流单号: {}, 物流公司: {}, 错误类型: {}, 原因: {}", 
                        trackingNumber, logisticsCompany, errorType, reason);
                    
                    dto.setWarningMessage(dto.getWarningMessage() != null 
                        ? dto.getWarningMessage() + "; " + detailedWarning 
                        : detailedWarning);
                }
            } catch (Exception e) {
                String errorType = "API_EXCEPTION";
                String detailedWarning = buildTrackingWarningMessage(trackingNumber, logisticsCompany, errorType, e.getMessage());
                
                logger.error("调用快递鸟API异常 - 物流单号: {}, 物流公司: {}, 异常类型: {}, 详细信息: {}", 
                    trackingNumber, logisticsCompany, e.getClass().getSimpleName(), e.getMessage(), e);
                
                dto.setWarningMessage(dto.getWarningMessage() != null 
                    ? dto.getWarningMessage() + "; " + detailedWarning 
                    : detailedWarning);
            }
        }
        
        order.setLogisticsCompany(logisticsCompany);
        order.setTrackingNumber(trackingNumber);
        order.setDeliverer(dto.getDeliverer());
        order.setDelivererPhone(dto.getDelivererPhone());
        order.setPlateNumber(dto.getPlateNumber());
        order.setLogisticsFee(logisticsFee);
        order.setShippedAt(LocalDateTime.now());
        
        String logisticsSupplierName = null;
        if (dto.getLogisticsSupplier() != null && !dto.getLogisticsSupplier().trim().isEmpty()) {
            LogisticsProvider provider = findLogisticsProvider(dto.getLogisticsSupplier().trim());
            if (provider != null) {
                order.setLogisticsProvider(provider);
                logisticsSupplierName = provider.getName();
                logger.info("采购单 {} 设置物流供应商: {}", order.getOrderNo(), provider.getName());
            } else {
                logger.warn("采购单 {} 未找到物流供应商: {}", order.getOrderNo(), dto.getLogisticsSupplier());
            }
        } else {
            if (order.getSupplier() != null) {
                LogisticsProvider supplierAsProvider = findLogisticsProviderBySupplier(order.getSupplier().getName());
                if (supplierAsProvider != null) {
                    order.setLogisticsProvider(supplierAsProvider);
                    logisticsSupplierName = supplierAsProvider.getName();
                    logger.info("采购单 {} 物流供应商为空，自动设置为采购单供应商: {}", 
                        order.getOrderNo(), supplierAsProvider.getName());
                } else {
                    order.setLogisticsProvider(null);
                    logisticsSupplierName = order.getSupplier().getName();
                    logger.info("采购单 {} 物流供应商为空，供应商[{}]未在物流供应商中找到，判定为一件代发", 
                        order.getOrderNo(), order.getSupplier().getName());
                }
            }
        }
        order.setLogisticsSupplierName(logisticsSupplierName);
        
        order.setShippingStatus(PurchaseOrder.ShippingStatus.SHIPPED);
        PurchaseOrder.Status oldStatus = order.getStatus();
        if (order.getStatus() == PurchaseOrder.Status.CONFIRMED || 
            order.getStatus() == PurchaseOrder.Status.PENDING) {
            order.setStatus(PurchaseOrder.Status.SHIPPED);
        }
        
        purchaseOrderRepository.save(order);
        
        try {
            PurchaseOrderLog logEntry = new PurchaseOrderLog();
            logEntry.setPurchaseOrderId(order.getId());
            logEntry.setOperator("系统");
            logEntry.setOperationType("批量导入发货单");
            logEntry.setOldValue(String.format("状态: %s, 发货状态: %s", 
                convertStatusToChinese(oldStatus), 
                convertShippingStatusToChinese(PurchaseOrder.ShippingStatus.TO_SHIP)));
            logEntry.setNewValue(String.format("状态: %s, 发货状态: %s", 
                convertStatusToChinese(order.getStatus()), 
                convertShippingStatusToChinese(PurchaseOrder.ShippingStatus.SHIPPED)));
            
            StringBuilder remark = new StringBuilder();
            remark.append(String.format("批量导入发货单操作，采购单编号: %s，导入时间: %s", 
                order.getOrderNo(), 
                LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))));
            if (trackingNumber != null && !trackingNumber.trim().isEmpty()) {
                remark.append(String.format("，物流单号: %s", trackingNumber));
            }
            if (logisticsCompany != null && !logisticsCompany.trim().isEmpty()) {
                remark.append(String.format("，物流公司: %s", logisticsCompany));
            }
            remark.append(String.format("，运费: %s", logisticsFee));
            logEntry.setRemark(remark.toString());
            purchaseOrderLogRepository.save(logEntry);
        } catch (Exception e) {
            logger.error("保存采购单 {} 操作日志失败: {}", order.getOrderNo(), e.getMessage(), e);
        }
        
        if (logisticsFee.compareTo(BigDecimal.ZERO) > 0) {
            createPendingDeliveryOrder(order, logisticsFee, deliveryMethod, logisticsCompany);
        }
        
        try {
            snapshotService.captureSnapshot(order, "DELIVERY_IMPORT");
        } catch (Exception e) {
            logger.warn("Failed to capture snapshot for order {}: {}", order.getOrderNo(), e.getMessage());
        }
        
        logger.info("成功导入发货信息: 采购单={}, 物流单号={}, 物流公司={}", order.getOrderNo(), trackingNumber, logisticsCompany);
    }
    
    private LogisticsCompany findLogisticsCompanyByKdnInfo(String shipperName, String shipperCode) {
        if (shipperCode != null && !shipperCode.trim().isEmpty()) {
            List<LogisticsCompany> companiesByKdnCode = logisticsCompanyRepository.findByKdnCode(shipperCode);
            if (companiesByKdnCode != null && !companiesByKdnCode.isEmpty()) {
                return companiesByKdnCode.get(0);
            }
            if (logisticsCompanyRepository.findByCode(shipperCode).isPresent()) {
                return logisticsCompanyRepository.findByCode(shipperCode).get();
            }
        }
        
        if (shipperName != null && !shipperName.trim().isEmpty()) {
            if (logisticsCompanyRepository.findByName(shipperName).isPresent()) {
                return logisticsCompanyRepository.findByName(shipperName).get();
            }
            if (logisticsCompanyRepository.findByShortName(shipperName).isPresent()) {
                return logisticsCompanyRepository.findByShortName(shipperName).get();
            }
        }
        
        return null;
    }

    private LogisticsProvider findLogisticsProvider(String nameOrCode) {
        List<LogisticsProvider> providers = logisticsProviderRepository.findAll();
        for (LogisticsProvider provider : providers) {
            if (nameOrCode.equals(provider.getName()) || 
                nameOrCode.equals(provider.getCode()) ||
                nameOrCode.equals(provider.getShortName())) {
                return provider;
            }
        }
        return null;
    }
    
    private LogisticsProvider findLogisticsProviderBySupplier(String supplierName) {
        if (supplierName == null || supplierName.trim().isEmpty()) {
            return null;
        }
        List<LogisticsProvider> providers = logisticsProviderRepository.findAll();
        for (LogisticsProvider provider : providers) {
            if (supplierName.equals(provider.getName()) || 
                supplierName.equals(provider.getShortName())) {
                return provider;
            }
        }
        return null;
    }
    
    private String determineTrackingErrorType(String reason) {
        if (reason == null) {
            return "UNKNOWN_ERROR";
        }
        String lowerReason = reason.toLowerCase();
        if (lowerReason.contains("单号不存在") || lowerReason.contains("不存在") || lowerReason.contains("not found")) {
            return "TRACKING_NOT_FOUND";
        }
        if (lowerReason.contains("快递公司") || lowerReason.contains("物流公司") || lowerReason.contains("company")) {
            return "COMPANY_MISMATCH";
        }
        if (lowerReason.contains("权限") || lowerReason.contains("授权") || lowerReason.contains("key") || lowerReason.contains("auth") || lowerReason.contains("authentication")) {
            return "AUTH_ERROR";
        }
        if (lowerReason.contains("参数") || lowerReason.contains("格式") || lowerReason.contains("invalid")) {
            return "INVALID_PARAMETER";
        }
        if (lowerReason.contains("超时") || lowerReason.contains("timeout") || lowerReason.contains("网络")) {
            return "NETWORK_ERROR";
        }
        if (lowerReason.contains("频率") || lowerReason.contains("limit") || lowerReason.contains("quota")) {
            return "RATE_LIMIT";
        }
        return "API_ERROR";
    }
    
    private String buildTrackingWarningMessage(String trackingNumber, String logisticsCompany, String errorType, String reason) {
        StringBuilder sb = new StringBuilder();
        sb.append("物流单号[").append(trackingNumber).append("]");
        
        switch (errorType) {
            case "TRACKING_NOT_FOUND":
                sb.append("查询无结果，可能原因：1.单号输入错误 2.快递尚未揽收 3.物流公司选择错误");
                break;
            case "COMPANY_MISMATCH":
                sb.append("物流公司[").append(logisticsCompany).append("]与单号不匹配，请核实物流公司");
                break;
            case "INVALID_PARAMETER":
                sb.append("参数格式错误，请检查物流单号格式");
                break;
            case "AUTH_ERROR":
                sb.append("API授权失败，请联系系统管理员检查快递鸟配置");
                break;
            case "NETWORK_ERROR":
                sb.append("网络连接超时，请稍后重试或联系系统管理员");
                break;
            case "RATE_LIMIT":
                sb.append("API调用频率超限，请稍后重试");
                break;
            case "API_EXCEPTION":
                sb.append("API调用异常: ").append(reason != null ? reason : "未知异常");
                break;
            default:
                sb.append("查询失败: ").append(reason != null ? reason : "未知错误");
        }
        
        return sb.toString();
    }
    
    private LogisticsCompany findLogisticsCompany(String nameOrCode) {
        if (logisticsCompanyRepository.findByName(nameOrCode).isPresent()) {
            return logisticsCompanyRepository.findByName(nameOrCode).get();
        }
        if (logisticsCompanyRepository.findByShortName(nameOrCode).isPresent()) {
            return logisticsCompanyRepository.findByShortName(nameOrCode).get();
        }
        if (logisticsCompanyRepository.findByCode(nameOrCode).isPresent()) {
            return logisticsCompanyRepository.findByCode(nameOrCode).get();
        }
        return null;
    }

    private void createPendingDeliveryOrder(PurchaseOrder order, BigDecimal logisticsFee, String deliveryMethod, String logisticsCompany) {
        SettlementOrder settlement = new SettlementOrder();
        
        if (order.getLogisticsProvider() != null) {
            settlement.setLogisticsProvider(order.getLogisticsProvider());
            settlement.setSourceType("物流配送");
            logger.info("配送单关联物流供应商: {}", order.getLogisticsProvider().getName());
        } else if (order.getSupplier() != null) {
            settlement.setSupplier(order.getSupplier());
            settlement.setSourceType("一件代发");
            logger.info("配送单判定为一件代发，关联供应商: {}", order.getSupplier().getName());
        }
        
        settlement.setType(SettlementOrder.Type.LOGISTICS);
        settlement.setStatus(SettlementOrder.Status.PENDING);
        settlement.setTotalAmount(logisticsFee);
        settlement.setLogisticsCompany(logisticsCompany);
        
        BigDecimal netAmount = logisticsFee.divide(new BigDecimal("1.06"), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal taxAmount = logisticsFee.subtract(netAmount);
        settlement.setNetAmount(netAmount);
        settlement.setTaxAmount(taxAmount);
        
        settlement.setRelatedOrderNo(order.getOrderNo());
        settlement.setDeliveryMethod(deliveryMethod);
        
        String deliveryNo = "PS" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + 
                           String.format("%03d", new java.util.Random().nextInt(1000));
        settlement.setDeliveryNo(deliveryNo);
        settlement.setSettlementNo(null);
        
        settlement.setCreatedAt(LocalDateTime.now());
        settlement.setCreatedBy("DELIVERY_IMPORT");
        
        settlementOrderRepository.save(settlement);
        logger.info("创建待结算配送单 {} for 采购单 {} 运费 {}，类型: {}", 
            deliveryNo, order.getOrderNo(), logisticsFee, settlement.getSourceType());
    }

    @Override
    public byte[] generateResultExcel(DeliveryOrderImportResult result) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("导入结果");
            
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle successStyle = createSuccessStyle(workbook);
            CellStyle failStyle = createFailStyle(workbook);
            CellStyle warningStyle = createWarningStyle(workbook);
            
            Row headerRow = sheet.createRow(0);
            String[] headers = {"行号", "采购单编号", "供应商", "配送方式", "物流供应商", "物流公司", "物流单号", 
                               "配送员", "联系电话", "车牌号", "费用", "导入结果", "错误信息", "警告信息"};
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 20 * 256);
            }
            
            int rowNum = 1;
            for (DeliveryOrderImportDTO dto : result.getRecords()) {
                Row row = sheet.createRow(rowNum++);
                
                CellStyle rowStyle = dto.isSuccess() ? successStyle : failStyle;
                boolean hasWarning = dto.getWarningMessage() != null && !dto.getWarningMessage().isEmpty();
                
                for (int i = 0; i < 13; i++) {
                    String value = "";
                    switch (i) {
                        case 0: value = dto.getRowNum() != null ? dto.getRowNum().toString() : ""; break;
                        case 1: value = dto.getOrderNo() != null ? dto.getOrderNo() : ""; break;
                        case 2: value = dto.getSupplierName() != null ? dto.getSupplierName() : ""; break;
                        case 3: value = convertDeliveryMethodToChinese(dto.getDeliveryMethod()); break;
                        case 4: value = dto.getLogisticsSupplier() != null ? dto.getLogisticsSupplier() : ""; break;
                        case 5: value = dto.getLogisticsCompany() != null ? dto.getLogisticsCompany() : ""; break;
                        case 6: value = dto.getTrackingNumber() != null ? dto.getTrackingNumber() : ""; break;
                        case 7: value = dto.getDeliverer() != null ? dto.getDeliverer() : ""; break;
                        case 8: value = dto.getDelivererPhone() != null ? dto.getDelivererPhone() : ""; break;
                        case 9: value = dto.getPlateNumber() != null ? dto.getPlateNumber() : ""; break;
                        case 10: value = dto.getFee() != null ? dto.getFee().toString() : ""; break;
                        case 11: value = dto.isSuccess() ? "成功" : "失败"; break;
                        case 12: value = dto.getErrorMessage() != null ? dto.getErrorMessage() : ""; break;
                    }
                    createCell(row, i, value, rowStyle);
                }
                
                CellStyle warningCellStyle = hasWarning ? warningStyle : rowStyle;
                String warningValue = dto.getWarningMessage() != null ? dto.getWarningMessage() : "";
                createCell(row, 13, warningValue, warningCellStyle);
            }
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
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
        
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        
        return style;
    }

    private CellStyle createSuccessStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createFailStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.CORAL.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createWarningStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private void createCell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private String convertDeliveryMethodToChinese(String deliveryMethod) {
        if (deliveryMethod == null) {
            return "";
        }
        switch (deliveryMethod) {
            case "Logistics":
                return "物流配送";
            case "SelfDelivery":
                return "自配送";
            default:
                return deliveryMethod;
        }
    }

    private String convertShippingStatusToChinese(PurchaseOrder.ShippingStatus status) {
        if (status == null) {
            return "未知";
        }
        switch (status) {
            case PENDING:
                return "待处理";
            case TO_SHIP:
                return "待发货";
            case SHIPPED:
                return "已发货";
            case RECEIVED:
                return "已收货";
            default:
                return status.name();
        }
    }

    private boolean isRowEmpty(Row row) {
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                }
                double numValue = cell.getNumericCellValue();
                if (numValue == (long) numValue) {
                    return String.valueOf((long) numValue);
                }
                return String.valueOf(numValue);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    CellType cachedType = cell.getCachedFormulaResultType();
                    if (cachedType == CellType.STRING) {
                        return cell.getStringCellValue();
                    } else if (cachedType == CellType.NUMERIC) {
                        double numVal = cell.getNumericCellValue();
                        if (numVal == (long) numVal) {
                            return String.valueOf((long) numVal);
                        }
                        return String.valueOf(numVal);
                    } else if (cachedType == CellType.BOOLEAN) {
                        return String.valueOf(cell.getBooleanCellValue());
                    }
                    return "";
                } catch (Exception e) {
                    return "";
                }
            case BLANK:
            default:
                return "";
        }
    }

    private String getStringValue(Row row, Map<String, Integer> headerIndexMap, String headerName) {
        Integer index = headerIndexMap.get(headerName);
        if (index == null) {
            return null;
        }
        Cell cell = row.getCell(index);
        return getCellValueAsString(cell);
    }

    private Integer getIntegerValue(Row row, Map<String, Integer> headerIndexMap, String headerName) {
        String value = getStringValue(row, headerIndexMap, headerName);
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal getBigDecimalValue(Row row, Map<String, Integer> headerIndexMap, String headerName) {
        String value = getStringValue(row, headerIndexMap, headerName);
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
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
}
