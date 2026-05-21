package com.supplypro.controller;

import com.supplypro.entity.PrepaymentApproval;
import com.supplypro.entity.Supplier;
import com.supplypro.entity.SupplierAccount;
import com.supplypro.entity.SupplierPrepaymentLog;
import com.supplypro.entity.LogisticsProvider;
import com.supplypro.entity.LogisticsProviderAccount;
import com.supplypro.repository.PrepaymentApprovalRepository;
import com.supplypro.repository.SupplierAccountRepository;
import com.supplypro.repository.SupplierPrepaymentLogRepository;
import com.supplypro.repository.SupplierRepository;
import com.supplypro.repository.LogisticsProviderRepository;
import com.supplypro.repository.LogisticsProviderAccountRepository;
import com.supplypro.service.SupplierFinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/prepayment-approvals")
@CrossOrigin(origins = "*")
public class PrepaymentApprovalController {

    @Autowired
    private PrepaymentApprovalRepository prepaymentApprovalRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private SupplierFinanceService supplierFinanceService;

    @Autowired
    private SupplierPrepaymentLogRepository supplierPrepaymentLogRepository;

    @Autowired
    private SupplierAccountRepository supplierAccountRepository;

    @Autowired
    private LogisticsProviderRepository logisticsProviderRepository;

    @Autowired
    private LogisticsProviderAccountRepository logisticsProviderAccountRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long logisticsProviderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<PrepaymentApproval> pageResult;
        if (logisticsProviderId != null) {
            pageResult = prepaymentApprovalRepository.findByLogisticsProviderId(
                    logisticsProviderId, PageRequest.of(page, size, Sort.by("id").descending()));
        } else {
            pageResult = prepaymentApprovalRepository.findBySupplierId(
                    supplierId, PageRequest.of(page, size, Sort.by("id").descending()));
        }

        List<Map<String, Object>> records = new ArrayList<>();
        for (PrepaymentApproval pa : pageResult.getContent()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", pa.getId());
            map.put("approvalNo", pa.getApprovalNo());
            map.put("ownerType", pa.getOwnerType());
            if (pa.getSupplier() != null) {
                Map<String, Object> supplier = new HashMap<>();
                supplier.put("id", pa.getSupplier().getId());
                supplier.put("name", pa.getSupplier().getName());
                map.put("supplier", supplier);
            }
            if (pa.getLogisticsProvider() != null) {
                Map<String, Object> lp = new HashMap<>();
                lp.put("id", pa.getLogisticsProvider().getId());
                lp.put("name", pa.getLogisticsProvider().getName());
                map.put("logisticsProvider", lp);
            }
            map.put("appliedAmount", pa.getAppliedAmount());
            map.put("actualAmount", pa.getActualAmount());
            map.put("status", pa.getStatus() != null ? pa.getStatus().name() : null);
            map.put("bankReceiptNo", pa.getBankReceiptNo());
            map.put("approvedBy", pa.getApprovedBy());
            map.put("approvedAt", pa.getApprovedAt());
            map.put("cashierBy", pa.getCashierBy());
            map.put("cashierAt", pa.getCashierAt());
            map.put("rejectReason", pa.getRejectReason());
            map.put("costInvoiceAmount", pa.getCostInvoiceAmount());
            map.put("costInvoiceReceived", pa.getCostInvoiceReceived());
            map.put("costInvoiceStatus", pa.getCostInvoiceStatus());
            map.put("createdBy", pa.getCreatedBy());
            map.put("createdAt", pa.getCreatedAt());
            records.add(map);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", Map.of(
                "records", records,
                "total", pageResult.getTotalElements()
        ));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/by-no/{approvalNo}")
    public ResponseEntity<Map<String, Object>> getByApprovalNo(@PathVariable String approvalNo) {
        PrepaymentApproval pa = prepaymentApprovalRepository.findByApprovalNo(approvalNo);
        if (pa == null) {
            throw new RuntimeException("预付款审批单不存在");
        }
        return getById(pa.getId());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        PrepaymentApproval pa = prepaymentApprovalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("预付款审批单不存在"));

        Map<String, Object> map = new HashMap<>();
        map.put("id", pa.getId());
        map.put("approvalNo", pa.getApprovalNo());
        map.put("ownerType", pa.getOwnerType());
        if (pa.getSupplier() != null) {
            Map<String, Object> supplier = new HashMap<>();
            supplier.put("id", pa.getSupplier().getId());
            supplier.put("name", pa.getSupplier().getName());
            supplier.put("contactPerson", pa.getSupplier().getContactPerson());
            supplier.put("contactPhone", pa.getSupplier().getContactPhone());
            map.put("supplier", supplier);
        }
        if (pa.getLogisticsProvider() != null) {
            Map<String, Object> lp = new HashMap<>();
            lp.put("id", pa.getLogisticsProvider().getId());
            lp.put("name", pa.getLogisticsProvider().getName());
            lp.put("contactPerson", pa.getLogisticsProvider().getContactPerson());
            lp.put("contactPhone", pa.getLogisticsProvider().getContactPhone());
            map.put("logisticsProvider", lp);
        }
        map.put("appliedAmount", pa.getAppliedAmount());
        map.put("actualAmount", pa.getActualAmount());
        map.put("payerName", pa.getPayerName());
        map.put("payerAccount", pa.getPayerAccount());
        map.put("payerBank", pa.getPayerBank());
        map.put("payeeName", pa.getPayeeName());
        map.put("payeeAccount", pa.getPayeeAccount());
        map.put("payeeBank", pa.getPayeeBank());
        map.put("contactName", pa.getContactName());
        map.put("contactPhone", pa.getContactPhone());
        map.put("attachments", pa.getAttachments());
        map.put("applyRemark", pa.getApplyRemark());
        map.put("status", pa.getStatus() != null ? pa.getStatus().name() : null);
        map.put("bankReceiptNo", pa.getBankReceiptNo());
        map.put("paymentVoucher", pa.getPaymentVoucher());
        map.put("approvedBy", pa.getApprovedBy());
        map.put("approvedAt", pa.getApprovedAt());
        map.put("cashierBy", pa.getCashierBy());
        map.put("cashierAt", pa.getCashierAt());
        map.put("rejectReason", pa.getRejectReason());
        map.put("costInvoiceAmount", pa.getCostInvoiceAmount());
        map.put("costInvoiceReceived", pa.getCostInvoiceReceived());
        map.put("costInvoiceStatus", pa.getCostInvoiceStatus());
        map.put("costInvoiceFiles", pa.getCostInvoiceFiles());
        map.put("createdBy", pa.getCreatedBy());
        map.put("createdAt", pa.getCreatedAt());
        map.put("updatedAt", pa.getUpdatedAt());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "Success");
        response.put("data", map);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> payload) {
        PrepaymentApproval pa = new PrepaymentApproval();
        pa.setApprovalNo(generateApprovalNo());
        pa.setStatus(PrepaymentApproval.Status.PENDING);

        boolean isLogistics = payload.get("logisticsProviderId") != null;
        
        if (isLogistics) {
            Long lpId = Long.valueOf(payload.get("logisticsProviderId").toString());
            LogisticsProvider lp = logisticsProviderRepository.findById(lpId)
                    .orElseThrow(() -> new RuntimeException("物流供应商不存在"));
            pa.setLogisticsProvider(lp);
            pa.setOwnerType("LOGISTICS");
            
            if (pa.getContactName() == null) {
                pa.setContactName(lp.getContactPerson());
            }
            if (pa.getContactPhone() == null) {
                pa.setContactPhone(lp.getContactPhone());
            }
        } else {
            Long supplierId = Long.valueOf(payload.get("supplierId").toString());
            Supplier supplier = supplierRepository.findById(supplierId)
                    .orElseThrow(() -> new RuntimeException("供应商不存在"));
            pa.setSupplier(supplier);
            pa.setOwnerType("SUPPLIER");
            
            if (pa.getContactName() == null) {
                pa.setContactName(supplier.getContactPerson());
            }
            if (pa.getContactPhone() == null) {
                pa.setContactPhone(supplier.getContactPhone());
            }
        }

        BigDecimal appliedAmount = new BigDecimal(payload.get("appliedAmount").toString());
        if (appliedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Charge amount must be positive");
        }
        pa.setAppliedAmount(appliedAmount);

        if (payload.get("payerName") != null) {
            pa.setPayerName((String) payload.get("payerName"));
        }
        if (payload.get("payerAccount") != null) {
            pa.setPayerAccount((String) payload.get("payerAccount"));
        }
        if (payload.get("payerBank") != null) {
            pa.setPayerBank((String) payload.get("payerBank"));
        }
        if (payload.get("payeeName") != null) {
            pa.setPayeeName((String) payload.get("payeeName"));
        }
        if (payload.get("payeeAccount") != null) {
            pa.setPayeeAccount((String) payload.get("payeeAccount"));
        }
        if (payload.get("payeeBank") != null) {
            pa.setPayeeBank((String) payload.get("payeeBank"));
        }
        if (payload.get("contactName") != null) {
            pa.setContactName((String) payload.get("contactName"));
        }
        if (payload.get("contactPhone") != null) {
            pa.setContactPhone((String) payload.get("contactPhone"));
        }
        if (payload.get("attachments") != null) {
            pa.setAttachments((String) payload.get("attachments"));
        }
        if (payload.get("applyRemark") != null) {
            pa.setApplyRemark((String) payload.get("applyRemark"));
        }
        
        if (payload.get("costInvoiceAmount") != null) {
            pa.setCostInvoiceAmount(new BigDecimal(payload.get("costInvoiceAmount").toString()));
        } else {
            pa.setCostInvoiceAmount(pa.getAppliedAmount());
        }
        
        if (payload.get("costInvoiceFiles") != null) {
            String costInvoiceFilesStr = (String) payload.get("costInvoiceFiles");
            pa.setCostInvoiceFiles(costInvoiceFilesStr);
            
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                List<Map<String, Object>> files = mapper.readValue(costInvoiceFilesStr, List.class);
                BigDecimal totalReceived = BigDecimal.ZERO;
                for (Map<String, Object> file : files) {
                    if (file.get("amount") != null) {
                        totalReceived = totalReceived.add(new BigDecimal(file.get("amount").toString()));
                    }
                }
                pa.setCostInvoiceReceived(totalReceived);
                if (totalReceived.compareTo(BigDecimal.ZERO) > 0) {
                    if (totalReceived.compareTo(pa.getCostInvoiceAmount()) >= 0) {
                        pa.setCostInvoiceStatus("已上传");
                    } else {
                        pa.setCostInvoiceStatus("部分上传");
                    }
                } else {
                    pa.setCostInvoiceStatus("未上传");
                }
            } catch (Exception e) {
                pa.setCostInvoiceStatus("未上传");
            }
        } else {
            pa.setCostInvoiceStatus("未上传");
            pa.setCostInvoiceReceived(BigDecimal.ZERO);
        }

        if (pa.getPayeeName() == null || pa.getPayeeAccount() == null || pa.getPayeeBank() == null) {
            if (isLogistics) {
                List<LogisticsProviderAccount> accounts = logisticsProviderAccountRepository.findByLogisticsProviderId(pa.getLogisticsProvider().getId());
                LogisticsProviderAccount defaultAccount = null;
                for (LogisticsProviderAccount acc : accounts) {
                    if (acc.isDefault()) {
                        defaultAccount = acc;
                        break;
                    }
                }
                if (defaultAccount == null && !accounts.isEmpty()) {
                    defaultAccount = accounts.get(0);
                }
                if (defaultAccount != null) {
                    if (pa.getPayeeName() == null) pa.setPayeeName(defaultAccount.getName());
                    if (pa.getPayeeAccount() == null) pa.setPayeeAccount(defaultAccount.getAccount());
                    if (pa.getPayeeBank() == null) pa.setPayeeBank(defaultAccount.getBank());
                }
            } else {
                List<SupplierAccount> accounts = supplierAccountRepository.findBySupplierId(pa.getSupplier().getId());
                SupplierAccount defaultAccount = null;
                for (SupplierAccount acc : accounts) {
                    if (acc.isDefault()) {
                        defaultAccount = acc;
                        break;
                    }
                }
                if (defaultAccount == null && !accounts.isEmpty()) {
                    defaultAccount = accounts.get(0);
                }
                if (defaultAccount != null) {
                    if (pa.getPayeeName() == null) pa.setPayeeName(defaultAccount.getName());
                    if (pa.getPayeeAccount() == null) pa.setPayeeAccount(defaultAccount.getAccount());
                    if (pa.getPayeeBank() == null) pa.setPayeeBank(defaultAccount.getBank());
                }
            }
        }

        if (payload.get("createdBy") != null) {
            pa.setCreatedBy((String) payload.get("createdBy"));
        }

        PrepaymentApproval saved = prepaymentApprovalRepository.save(pa);

        Map<String, Object> data = new HashMap<>();
        data.put("id", saved.getId());
        data.put("approvalNo", saved.getApprovalNo());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "创建成功");
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<Map<String, Object>> approve(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        PrepaymentApproval pa = prepaymentApprovalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("预付款审批单不存在"));

        if (pa.getStatus() != PrepaymentApproval.Status.PENDING) {
            throw new RuntimeException("只有待审批状态的审批单才能审核通过");
        }

        pa.setStatus(PrepaymentApproval.Status.APPROVED);
        pa.setApprovedBy((String) payload.get("approvedBy"));
        pa.setApprovedAt(LocalDateTime.now());

        prepaymentApprovalRepository.save(pa);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "审核通过");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<Map<String, Object>> reject(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        PrepaymentApproval pa = prepaymentApprovalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("预付款审批单不存在"));

        if (pa.getStatus() != PrepaymentApproval.Status.PENDING) {
            throw new RuntimeException("只有待审批状态的审批单才能驳回");
        }

        pa.setStatus(PrepaymentApproval.Status.REJECTED);
        pa.setRejectReason((String) payload.get("rejectReason"));

        prepaymentApprovalRepository.save(pa);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "已驳回");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/withdraw")
    @Transactional
    public ResponseEntity<Map<String, Object>> withdraw(@PathVariable Long id) {
        PrepaymentApproval pa = prepaymentApprovalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("预付款审批单不存在"));

        if (pa.getStatus() != PrepaymentApproval.Status.PENDING) {
            throw new RuntimeException("只有待审批状态的审批单才能撤回");
        }

        pa.setStatus(PrepaymentApproval.Status.WITHDRAWN);

        prepaymentApprovalRepository.save(pa);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "已撤回");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/pay")
    @Transactional
    public ResponseEntity<Map<String, Object>> pay(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        PrepaymentApproval pa = prepaymentApprovalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("预付款审批单不存在"));

        if (pa.getStatus() != PrepaymentApproval.Status.APPROVED) {
            throw new RuntimeException("只有已审核通过的审批单才能付款");
        }

        pa.setStatus(PrepaymentApproval.Status.PAID);
        pa.setBankReceiptNo((String) payload.get("bankReceiptNo"));
        pa.setPaymentVoucher((String) payload.get("paymentVoucher"));
        pa.setCashierBy((String) payload.get("cashierBy"));
        pa.setCashierAt(LocalDateTime.now());
        pa.setActualAmount(pa.getAppliedAmount());
        
        if (payload.get("payeeName") != null) {
            pa.setPayeeName((String) payload.get("payeeName"));
        }
        if (payload.get("payeeAccount") != null) {
            pa.setPayeeAccount((String) payload.get("payeeAccount"));
        }
        if (payload.get("payeeBank") != null) {
            pa.setPayeeBank((String) payload.get("payeeBank"));
        }

        prepaymentApprovalRepository.save(pa);

        if ("LOGISTICS".equals(pa.getOwnerType()) && pa.getLogisticsProvider() != null) {
            supplierFinanceService.chargeLogistics(
                    pa.getLogisticsProvider().getId(),
                    pa.getAppliedAmount(),
                    "预付款充值 - 审批单号: " + pa.getApprovalNo(),
                    pa.getCashierBy()
            );

            List<SupplierPrepaymentLog> logs = supplierPrepaymentLogRepository
                    .findByLogisticsProviderIdOrderByCreatedAtDesc(pa.getLogisticsProvider().getId());
            if (!logs.isEmpty()) {
                SupplierPrepaymentLog latestLog = logs.get(0);
                latestLog.setRelatedOrderNo(pa.getApprovalNo());
                supplierPrepaymentLogRepository.save(latestLog);
            }
        } else if (pa.getSupplier() != null) {
            supplierFinanceService.charge(
                    pa.getSupplier().getId(),
                    pa.getAppliedAmount(),
                    "预付款充值 - 审批单号: " + pa.getApprovalNo(),
                    pa.getCashierBy()
            );

            List<SupplierPrepaymentLog> logs = supplierPrepaymentLogRepository
                    .findBySupplierIdOrderByCreatedAtDesc(pa.getSupplier().getId());
            if (!logs.isEmpty()) {
                SupplierPrepaymentLog latestLog = logs.get(0);
                latestLog.setRelatedOrderNo(pa.getApprovalNo());
                supplierPrepaymentLogRepository.save(latestLog);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "付款成功");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/cost-invoice")
    @Transactional
    public ResponseEntity<Map<String, Object>> uploadCostInvoice(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        PrepaymentApproval pa = prepaymentApprovalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("预付款审批单不存在"));

        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String fileUrl = (String) payload.get("fileUrl");
        String invoiceCode = (String) payload.get("invoiceCode");
        String type = (String) payload.getOrDefault("type", "成本票");

        if (pa.getCostInvoiceAmount() == null) {
            pa.setCostInvoiceAmount(pa.getAppliedAmount());
        }
        if (pa.getCostInvoiceReceived() == null) {
            pa.setCostInvoiceReceived(BigDecimal.ZERO);
        }

        BigDecimal newReceived = pa.getCostInvoiceReceived().add(amount);
        
        if (newReceived.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("红冲金额不能大于已上传成本票金额");
        }
        
        if (amount.compareTo(BigDecimal.ZERO) > 0 && newReceived.compareTo(pa.getCostInvoiceAmount()) > 0) {
            BigDecimal uncollected = pa.getCostInvoiceAmount().subtract(pa.getCostInvoiceReceived());
            throw new RuntimeException("上传金额不能大于未收金额 ¥" + String.format("%.2f", uncollected));
        }
        
        pa.setCostInvoiceReceived(newReceived);

        if (newReceived.compareTo(pa.getCostInvoiceAmount()) >= 0) {
            pa.setCostInvoiceStatus("已上传");
        } else if (newReceived.compareTo(BigDecimal.ZERO) > 0) {
            pa.setCostInvoiceStatus("部分上传");
        } else {
            pa.setCostInvoiceStatus("未上传");
        }

        String filesStr = pa.getCostInvoiceFiles();
        List<Map<String, Object>> files = new ArrayList<>();
        if (filesStr != null && !filesStr.isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                files = mapper.readValue(filesStr, List.class);
            } catch (Exception e) {
                files = new ArrayList<>();
            }
        }

        Map<String, Object> newFile = new HashMap<>();
        newFile.put("url", fileUrl);
        newFile.put("amount", amount);
        newFile.put("invoiceCode", invoiceCode);
        newFile.put("type", type);
        newFile.put("uploadTime", LocalDateTime.now().toString());
        files.add(newFile);

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            pa.setCostInvoiceFiles(mapper.writeValueAsString(files));
        } catch (Exception e) {
            pa.setCostInvoiceFiles("[]");
        }

        prepaymentApprovalRepository.save(pa);

        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", type.equals("红冲票") ? "红冲票上传成功" : "成本票上传成功");
        return ResponseEntity.ok(response);
    }

    private String generateApprovalNo() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%03d", new Random().nextInt(1000));
        return "YF" + timestamp + random;
    }

    @GetMapping("/logs/all")
    public ResponseEntity<List<Map<String, Object>>> getAllPrepaymentLogs() {
        List<SupplierPrepaymentLog> logs = supplierPrepaymentLogRepository.findAll(Sort.by("id").descending());
        List<Map<String, Object>> result = new ArrayList<>();
        for (SupplierPrepaymentLog log : logs) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("type", log.getType());
            map.put("amount", log.getAmount());
            map.put("balanceAfter", log.getBalanceAfter());
            map.put("relatedOrderNo", log.getRelatedOrderNo());
            map.put("remark", log.getRemark());
            map.put("createdAt", log.getCreatedAt());
            map.put("ownerType", log.getOwnerType());
            if (log.getSupplier() != null) {
                map.put("supplierId", log.getSupplier().getId());
                map.put("supplierName", log.getSupplier().getName());
            }
            if (log.getLogisticsProvider() != null) {
                map.put("logisticsProviderId", log.getLogisticsProvider().getId());
                map.put("logisticsProviderName", log.getLogisticsProvider().getName());
            }
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/logs/logistics/{logisticsProviderId}")
    public ResponseEntity<List<Map<String, Object>>> getLogisticsPrepaymentLogs(@PathVariable Long logisticsProviderId) {
        List<SupplierPrepaymentLog> logs = supplierPrepaymentLogRepository.findByLogisticsProviderIdOrderByCreatedAtDesc(logisticsProviderId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (SupplierPrepaymentLog log : logs) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("type", log.getType());
            map.put("amount", log.getAmount());
            map.put("balanceAfter", log.getBalanceAfter());
            map.put("relatedOrderNo", log.getRelatedOrderNo());
            map.put("remark", log.getRemark());
            map.put("createdAt", log.getCreatedAt());
            map.put("ownerType", log.getOwnerType());
            if (log.getLogisticsProvider() != null) {
                map.put("logisticsProviderId", log.getLogisticsProvider().getId());
                map.put("logisticsProviderName", log.getLogisticsProvider().getName());
            }
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }
}
