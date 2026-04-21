import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Space, Tag, Modal, Select, Input, Dropdown, Menu, Form, message, Row, Col, Radio, InputNumber, Divider, Upload, Typography, DatePicker, Card, Tooltip, Result, Progress, AutoComplete } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';

import { DollarOutlined, UploadOutlined, ShoppingCartOutlined, SyncOutlined, ExclamationCircleOutlined, TruckOutlined, PlusOutlined, ThunderboltOutlined, ImportOutlined, ExportOutlined, EditOutlined, HistoryOutlined } from '@ant-design/icons';
import { cancelPurchaseOrder, getPurchaseOrders, PurchaseOrder, shipPurchaseOrder, checkWaybill, getStatusSummary, syncLogisticsStatus, searchOrderNos } from '../../services/purchaseOrderService';
import { batchAdjust, getPendingAdjustmentOrderIds } from '../../services/costAdjustmentService';
import { getStatusText, getStatusColor, StatusMap } from '../../utils/statusMapping';
import { formatTimeSmart, formatTimeFull } from '../../utils/dateFormatter';
import { trackEvent } from '../../utils/tracker';
import { useExport } from '../../utils/exportUtils';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import ShipOrderModal from './components/ShipOrderModal';
import ExportDeliveryModal from './components/ExportDeliveryModal';
import HistoryExportModal from './components/HistoryExportModal';
import ImportDeliveryModal from './components/ImportDeliveryModal';

interface PurchaseOrderType {
  key: string;
  poNo: string;
  supplier: string;
  supplierId: number;
  rawType: string;
  bizType: string;
  bizNo: string;
  purchaseType: 'Inbound' | 'Dropship' | 'SelfDistribute';
  orderTime: string;
  expectTime: string;
  adjustStatus: 'None' | 'Pending' | 'Approved';
  refundStatus: 'None' | 'Pending' | 'Approved';
  project: string;
  productName: string;
  specName: string;
  quantity: number;
  cost: number;
  totalCost: number;
  settlementStatus: 'Unsettled' | 'PartiallySettled' | 'Settled';
  status: 'Pending' | 'ToShip' | 'Shipped' | 'Received' | 'Cancelled' | 'InboundGenerated';
  shippingStatus?: 'Unshipped' | 'Shipped' | 'Received' | 'Partial';
  modificationStatus?: 'Increased' | 'Decreased' | 'None';
  freight: number;
  payableAmount?: number;
  settledAmount?: number;
  thirdPartyPlatform?: string;
  thirdPartyNo?: string;
  platformOrderNo?: string;
  inboundOrderNo?: string;
  stockInNo?: string;
  inboundOrderId?: number;
  productImage?: string;
  skuCode?: string;
  subProducts?: {
    name: string;
    spec: string;
    qty: number;
    unitCost: number;
    supplier: string;
  }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

import { Dayjs } from 'dayjs';
import { LogisticsProvider } from '../../types/logistics';



import Draggable from 'react-draggable';

const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shipModalOpen, setShipModalOpen] = useState(false);
  // Removed unused Single Price Adjust logic and mock data
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [currentShipOrder, setCurrentShipOrder] = useState<PurchaseOrderType | null>(null);
  const [settlementDetailModalOpen, setSettlementDetailModalOpen] = useState(false);
  const [currentSettlementRecord, setCurrentSettlementRecord] = useState<PurchaseOrderType | null>(null);

  // Validation states moved to ShipOrderModal
  // const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  // const [isFeeDisabled, setIsFeeDisabled] = useState(false);
  // const [isDriverInfoLocked, setIsDriverInfoLocked] = useState(false);
  // const [isLogisticsProviderLocked, setIsLogisticsProviderLocked] = useState(false);
  // const [isLogisticsCompanyLocked, setIsLogisticsCompanyLocked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderType[]>([]);
  const [total, setTotal] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [params, setParams] = useState<Record<string, any>>(() => {
    const initialState = { page: 0, size: 10 };
    // Lazy initialization to check for refresh state on mount
    // This ensures the first fetch includes the timestamp if needed
    if (location.state && (location.state as any).refresh) {
        return { ...initialState, _t: Date.now() };
    }
    return initialState;
  });
  const [errorCount, setErrorCount] = useState(0);
  
  // Ref to track the latest request ID to prevent race conditions
  const lastRequestId = useRef(0);
  
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<PurchaseOrderType[]>([]);
  const [batchPriceModalOpen, setBatchPriceModalOpen] = useState(false);
  const [batchPriceForm] = Form.useForm();
  const [exportCount, setExportCount] = useState<{ total: number; excluded: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: number; fail: number; errors: Array<{ poNo: string; msg: string }> } | null>(null);
  const [dragDisabled, setDragDisabled] = useState(true);
  const [dragBounds, setDragBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 });
  const dragRef = React.useRef<HTMLDivElement>(null);
  
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);
  
  const [exportDeliveryModalOpen, setExportDeliveryModalOpen] = useState(false);
  const [historyExportModalOpen, setHistoryExportModalOpen] = useState(false);
  const [importDeliveryModalOpen, setImportDeliveryModalOpen] = useState(false);
  
  const [syncingLogistics, setSyncingLogistics] = useState(false);
  
  const handleSyncLogisticsStatus = async () => {
    Modal.confirm({
      title: '同步物流配送状态',
      content: '将同步所有"已发货"状态且配送方式为"物流配送"的采购单物流信息，确定继续吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setSyncingLogistics(true);
        try {
          const response = await syncLogisticsStatus();
          if (response && response.data) {
            const { total, successCount, failCount, updatedCount } = response.data;
            message.success(`同步完成: 共 ${total} 条，成功 ${successCount} 条，失败 ${failCount} 条，状态变更 ${updatedCount} 条`);
            setRefreshKey(prev => prev + 1);
          } else {
            message.success('同步完成');
            setRefreshKey(prev => prev + 1);
          }
        } catch (error: unknown) {
          console.error('同步物流状态失败:', error);
          const err = error as { 
            response?: { 
              data?: { message?: string }, 
              status?: number,
              statusText?: string 
            }; 
            message?: string 
          };
          let errorMessage = '同步物流状态失败';
          if (err.response) {
            if (err.response.status === 405) {
              errorMessage = '请求方法不被支持，请联系系统管理员检查API配置';
            } else if (err.response.status === 401) {
              errorMessage = '登录已过期，请重新登录后再试';
            } else if (err.response.status === 403) {
              errorMessage = '您没有权限执行此操作';
            } else if (err.response.status === 500) {
              errorMessage = '服务器内部错误，请稍后重试或联系系统管理员';
            } else if (err.response.data?.message) {
              errorMessage = err.response.data.message;
            }
          } else if (err.message) {
            if (err.message.includes('timeout')) {
              errorMessage = '请求超时，请检查网络连接后重试';
            } else if (err.message.includes('Network Error')) {
              errorMessage = '网络连接失败，请检查网络设置';
            } else {
              errorMessage = err.message;
            }
          }
          message.error(errorMessage);
        } finally {
          setSyncingLogistics(false);
        }
      }
    });
  };
  
  // Status summary state
  interface StatusSummaryItem {
    status: string;
    label: string;
    count: number;
    color: string;
  }
  const [statusSummary, setStatusSummary] = useState<{ total: number; statusList: StatusSummaryItem[] }>({ total: 0, statusList: [] });
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Fetch status summary
  const fetchStatusSummary = useCallback(async (currentFilters = {}) => {
    setSummaryLoading(true);
    try {
      // Pass current filters to summary API to get dynamic counts
      const response = await getStatusSummary(currentFilters);
      if (response) {
        // Use backend colors directly (backend returns correct colors)
        setStatusSummary({
          total: response.total || 0,
          statusList: response.statusList || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch status summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  }, []);
  
  // Fetch status summary when params change (excluding status itself to avoid loop)
  useEffect(() => {
    // Extract filters excluding 'status' and pagination
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status, page, size, _t, ...filters } = params;
    fetchStatusSummary(filters);
  }, [fetchStatusSummary, params]);
  
  // Handle status card click
  const handleStatusClick = useCallback((status?: string) => {
    setParams((prev) => {
      // Clear status if clicking "All" (no status arg) OR clicking the same status again (toggle off)
      if (!status || prev.status === status) {
        const newParams = { ...prev, page: 0 };
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (newParams as Record<string, unknown>).status;
        return newParams;
      } else {
        return { ...prev, status, page: 0 };
      }
    });
    // Force immediate refresh after status change
    setRefreshKey(prev => prev + 1);
  }, []);
  const [scrollToId, setScrollToId] = useState<number | null>(null);
  const [orderNoOptions, setOrderNoOptions] = useState<{ label: string; value: string }[]>([]);
  const [poNosTags, setPoNosTags] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const onStart = (_event: any, uiData: any) => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const targetRect = dragRef.current?.getBoundingClientRect();
    if (!targetRect) {
      return;
    }
    setDragBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    });
  };

  // Cost Batch Price Adjustment
  const handleBatchPriceClick = () => {
    setBatchPriceModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
      try {
          message.loading({ content: '正在生成模板...', key: 'downloadTemplate' });
          const res = await getPurchaseOrders({ ...params, page: 0, size: 1000 });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dataList = (res as any).content || (res as any).records || [];
          
          const purchaseOrderIds = dataList.map((po: any) => po.id);
          let pendingOrderIds: number[] = [];
          
          if (purchaseOrderIds.length > 0) {
              try {
                  pendingOrderIds = await getPendingAdjustmentOrderIds(purchaseOrderIds);
              } catch (e) {
                  console.error('获取待审批调价单失败:', e);
              }
          }
          
          const pendingOrderIdSet = new Set(pendingOrderIds);
          
          setExportCount({ total: dataList.length, excluded: pendingOrderIds.length });
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const templateData = dataList
              .filter((po: any) => !pendingOrderIdSet.has(po.id))
              .map((po: any) => {
                  const item = (po.items && po.items.length > 0) ? po.items[0] : {};
                  return {
                      '采购单号': po.orderNo,
                      '商品名称': item.productName || '',
                      '规格': item.specName || item.spec || '',
                      '相关ID': item.id || '',
                      '商品供应商': po.supplierName || '',
                      '采购数量': item.quantity || 0,
                      '调价前成本价': item.unitPrice || 0,
                      '调价后成本价': ''
                  };
              });

          const ws = XLSX.utils.json_to_sheet(templateData);
          const wscols = [
              { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, 
              { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
          ];
          ws['!cols'] = wscols;

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, '成本调价模板');
          
          // Generate filename with timestamp
          const now = new Date();
          const dateStr = now.getFullYear() +
              String(now.getMonth() + 1).padStart(2, '0') +
              String(now.getDate()).padStart(2, '0') + '_' +
              String(now.getHours()).padStart(2, '0') +
              String(now.getMinutes()).padStart(2, '0') +
              String(now.getSeconds()).padStart(2, '0');
              
          XLSX.writeFile(wb, `成本批量调价数据_${dateStr}.xlsx`);
          
          if (pendingOrderIds.length > 0) {
              message.success({ content: `模板下载成功，已排除 ${pendingOrderIds.length} 条有待审批调价单的采购单`, key: 'downloadTemplate' });
          } else {
              message.success({ content: '模板下载成功', key: 'downloadTemplate' });
          }
      } catch (e) {
          console.error(e);
          message.error({ content: '模板生成失败', key: 'downloadTemplate' });
      }
  };

  const handleUploadAdjustment = async (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
          message.error('文件大小不能超过10MB');
          return false;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const data = e.target?.result;
              const workbook = XLSX.read(data, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(sheet);

              if (jsonData.length === 0) {
                  message.error('文件内容为空');
                  return;
              }
              
              if (jsonData.length > 1000) {
                  message.error('单次处理不能超过1000条记录');
                  return;
              }

              const firstRow: any = jsonData[0];
              if (!('采购单号' in firstRow) || !('调价后成本价' in firstRow)) {
                   message.error('模板格式错误：缺失必要字段');
                   return;
              }

              message.loading({ content: '正在校验数据...', key: 'uploadAdjustment', duration: 0 });

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const errors: any[] = [];
              
              // 获取所有采购单号
              const poNos = jsonData.map((row: any) => row['采购单号']).filter(Boolean);
              
              // 从后端获取采购单信息进行校验
              let poDataMap: Map<string, any> = new Map();
              try {
                  const poRes = await getPurchaseOrders({ page: 0, size: 1000 });
                  const poList = (poRes as any).content || (poRes as any).records || [];
                  poList.forEach((po: any) => {
                      poDataMap.set(po.orderNo, po);
                  });
              } catch (err) {
                  console.error('获取采购单数据失败:', err);
              }
              
              // 基本格式校验，收集所有数据（包括可能有错误的数据）
              const allAdjustments: any[] = [];
              
              for (let i = 0; i < jsonData.length; i++) {
                  const row: any = jsonData[i];
                  const poNo = row['采购单号'];
                  const productName = row['商品名称'];
                  const spec = row['规格'];
                  const oldCostStr = row['调价前成本价'];
                  const newCostStr = row['调价后成本价'];
                  const newCost = parseFloat(newCostStr);
                  
                  if (!poNo) {
                      errors.push({ row: i + 2, poNo: '', msg: '采购单号为空' });
                      continue;
                  }
                  
                  // 只做基本的价格格式验证，其他验证交给后端
                  if (isNaN(newCost) || newCost <= 0 || newCost > 999999.99) {
                      errors.push({ row: i + 2, poNo, msg: `价格无效: ${newCostStr}` });
                      continue;
                  }
                  
                  if (!/^\d+(\.\d{1,2})?$/.test(String(newCostStr))) {
                      errors.push({ row: i + 2, poNo, msg: '价格格式错误（最多2位小数）' });
                      continue;
                  }
                  
                  // 将所有数据收集起来，发送到后端进行完整验证
                  allAdjustments.push({
                      poNo,
                      productName,
                      specName: spec,
                      oldCost: oldCostStr,
                      newCost,
                      supplierName: poDataMap.get(poNo)?.supplierName
                  });
              }

              // 如果没有数据，直接返回错误
              if (allAdjustments.length === 0) {
                  message.error({ content: `校验失败: ${errors.length} 条记录有误`, key: 'uploadAdjustment' });
                  setUploadResult({ success: 0, fail: errors.length, errors: errors.map(e => ({ poNo: e.poNo, msg: e.msg })) });
                  return;
              }

              // Prepare payload for backend
              message.loading({ content: '正在提交调价申请...', key: 'uploadAdjustment', duration: 0 });

              try {
                  const res = await batchAdjust(allAdjustments);
                  
                  // 使用后端返回的错误信息
                  const allErrors = [...errors.map(e => ({ poNo: e.poNo, msg: e.msg })), ...(res.errors || [])];
                  const totalFail = errors.length + (res.fail || 0);
                  
                  setUploadResult({ success: res.success || 0, fail: totalFail, errors: allErrors });
                  
                  if (totalFail > 0 && res.success > 0) {
                      message.warning({ content: `处理完成: 成功 ${res.success}, 失败 ${totalFail}`, key: 'uploadAdjustment' });
                  } else if (totalFail > 0) {
                      message.error({ content: `处理失败: ${totalFail} 条记录有误`, key: 'uploadAdjustment' });
                  } else {
                      message.success({ content: `全部成功: ${res.success} 条`, key: 'uploadAdjustment' });
                  }
              } catch (apiError: any) {
                  console.error('API Error:', apiError);
                  const errorMsg = apiError?.response?.data?.message || apiError?.message || '提交失败，请稍后重试';
                  message.error({ content: errorMsg, key: 'uploadAdjustment' });
                  setUploadResult({ success: 0, fail: allAdjustments.length, errors: [{ poNo: '', msg: errorMsg }] });
              }
              
              setRefreshKey(prev => prev + 1);

          } catch (error) {
              console.error(error);
              message.error({ content: '文件解析失败', key: 'uploadAdjustment' });
          }
      };
      reader.readAsBinaryString(file);
      return false;
  };
  
  const handleDownloadErrorDetail = () => {
      if (!uploadResult || uploadResult.errors.length === 0) return;
      
      const errorData = uploadResult.errors.map(e => ({
          '采购单号': e.poNo || '',
          '错误信息': e.msg
      }));
      
      const ws = XLSX.utils.json_to_sheet(errorData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '失败明细');
      XLSX.writeFile(wb, '调价失败明细.xlsx');
  };
  
  const handleCloseBatchPriceModal = () => {
      setBatchPriceModalOpen(false);
      setExportCount(null);
      setUploadResult(null);
  };

  // Export Shipment Order
  const { exporting: exportingShipment, handleExport: handleExportShipment } = useExport({
    filenamePrefix: 'ShipmentOrders',
    fetchData: async () => {
        // If items are selected, use them. Otherwise fetch all based on current filters.
        let dataList: any[] = [];
        if (selectedRows.length > 0) {
            dataList = selectedRows;
        } else {
            // 使用合理的size而不是10000，或者分批导出
            // 此处保持10000但增加前端导出提示，后续建议改为后端导出
            const res = await getPurchaseOrders({ ...params, page: 0, size: 1000 });
            dataList = (res as any).content || (res as any).records || [];
        }

        return dataList.map((po: any) => ({
            poNo: po.poNo || po.orderNo,
            supplier: po.supplier || po.supplierName,
            logisticsCompany: po.logisticsCompany || po.freightCompany || '-',
            trackingNo: po.trackingNumber || po.shipNo || '-',
            status: getStatusInfo(po.status).text,
            shippingStatus: getStatusText(po.shippingStatus, 'shipping'),
            shippedAt: po.shippedAt || '-',
            receiver: po.deliverer || '-',
            phone: po.delivererPhone || '-'
        }));
    },
    columns: [
        { title: '采购单号', dataIndex: 'poNo' },
        { title: '供应商', dataIndex: 'supplier' },
        { title: '物流公司', dataIndex: 'logisticsCompany' },
        { title: '运单号', dataIndex: 'trackingNo' },
        { title: '订单状态', dataIndex: 'status' },
        { title: '发货状态', dataIndex: 'shippingStatus' },
        { title: '发货时间', dataIndex: 'shippedAt' },
        { title: '收货人', dataIndex: 'receiver' },
        { title: '联系电话', dataIndex: 'phone' }
    ]
  });

  // Import Shipment Order
  const handleImportShipment = async (file: File) => {
      setImporting(true);
      setImportProgress(0);
      message.loading({ content: '正在解析文件...', key: 'importShipment' });

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const data = e.target?.result;
              const workbook = XLSX.read(data, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(sheet);

              if (jsonData.length === 0) {
                  message.error({ content: '文件内容为空', key: 'importShipment' });
                  setImporting(false);
                  return;
              }

              let successCount = 0;
              let failCount = 0;
              const total = jsonData.length;

              for (let i = 0; i < total; i++) {
                  const row: any = jsonData[i];
                  // Expected columns: 采购单号, 物流公司, 运单号
                  const poNo = row['采购单号'] || row['PurchaseOrderNo'];
                  const company = row['物流公司'] || row['LogisticsCompany'];
                  const trackingNo = row['运单号'] || row['TrackingNo'];

                  if (!poNo || !trackingNo) {
                      failCount++;
                      continue;
                  }

                  try {
                      // 1. Find PO ID
                      const res = await getPurchaseOrders({ keyword: poNo, page: 0, size: 1 });
                      const list = (res as any).content || (res as any).records || [];
                      const targetPO = list.find((p: any) => p.orderNo === poNo);

                      if (targetPO) {
                          // 2. Update Logistics
                          await shipPurchaseOrder(targetPO.id, {
                              shipCompany: company || 'Other',
                              shipNo: trackingNo,
                              shippedAt: new Date().toISOString()
                          });
                          successCount++;
                      } else {
                          failCount++;
                          console.warn(`PO not found: ${poNo}`);
                      }
                  } catch (err) {
                      failCount++;
                      console.error(`Failed to import for ${poNo}`, err);
                  }

                  setImportProgress(Math.round(((i + 1) / total) * 100));
              }

              message.success({ content: `导入完成: 成功 ${successCount} 条, 失败 ${failCount} 条`, key: 'importShipment' });
              setRefreshKey(prev => prev + 1); // Refresh list
          } catch (error) {
              console.error('Import Error:', error);
              message.error({ content: '导入失败，请检查文件格式', key: 'importShipment' });
          } finally {
              setImporting(false);
          }
      };
      reader.readAsBinaryString(file);
      return false; // Prevent default upload
  };

  const fetchOrders = useCallback(async () => {
    const requestId = ++lastRequestId.current;
    setLoading(true);
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await getPurchaseOrders(params);
        
        // Race condition check: if a new request has started, ignore this result
        if (requestId !== lastRequestId.current) {
            return;
        }

        const list = res.content || res.records || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = list.map((po: any) => {
            const items = po.items || [];
            const firstItem = items.length > 0 ? items[0] : null;

            // Integrity Check
            if (items.length === 0 && po.totalAmount > 0) {
                trackEvent({ category: 'PurchaseOrderList', action: 'DataInconsistency', label: `PO ${po.orderNo} has amount but empty items` });
            }

            return {
                key: po.id,
                poNo: po.orderNo,
                supplier: po.supplierName || po.supplier?.name || '',
                supplierId: po.supplierId || po.supplier?.id,
                rawType: po.type,
                purchaseType: po.type === 'INBOUND' ? 'Inbound' : (po.type === 'DROPSHIP' ? 'Dropship' : 'SelfDistribute'),
                orderTime: po.createdAt,
                expectTime: po.deliveryDate || '',
                productName: (items.length === 0 && po.totalAmount > 0) ? '数据异常: 无商品明细' : (firstItem ? firstItem.productName : ''),
                specName: firstItem ? (firstItem.specName || firstItem.spec) : '',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                quantity: items.reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0),
                cost: firstItem ? firstItem.unitPrice : 0,
                totalCost: po.totalAmount || 0,
                settlementStatus: po.settlementStatus === 'UNSETTLED' ? 'Unsettled' : 'Settled',
                thirdPartyPlatform: po.thirdPartyPlatform || po.platformName || '',
                thirdPartyNo: po.thirdPartyNo || '',
                platformName: po.platformName || '',
                platformOrderNo: po.platformOrderNo || '',
                inboundOrderNo: po.inboundOrderNo || '',
                stockInNo: po.stockInNo || po.inboundOrderNo || '',
                inboundOrderId: po.inboundOrderId || null,
                productImage: firstItem?.productImage || '',
                skuCode: firstItem?.skuCode || '',
                status: po.status === 'PENDING' ? 'Pending' :  
                        po.status === 'CANCELLED' ? 'Cancelled' :
                        po.status === 'COMPLETED' ? 'Completed' :
                        po.status === 'RECEIVED' ? 'Received' :
                        po.status === 'SHIPPED' ? 'Shipped' :
                        po.shippingStatus === 'SHIPPED' ? 'Shipped' :
                        po.status === 'CONFIRMED' ? 'ToShip' : 'Pending',
                shippingStatus: po.shippingStatus === 'PENDING' ? 'Pending' :
                                po.shippingStatus === 'TO_SHIP' ? 'ToShip' :
                                po.shippingStatus === 'SHIPPED' ? 'Shipped' :
                                po.shippingStatus === 'RECEIVED' ? 'Received' : 'Pending',
                freight: po.logisticsFee || 0,
                freightPayable: po.freightPayable || po.logisticsFee || 0,
                freightSettled: po.freightSettled || 0,
                logisticsCompany: po.logisticsCompany || po.freightCompany,
                // Add logisticsSupplier mapping with fallback logic matching backend
                logisticsSupplier: po.logisticsSupplierName || po.logisticsProvider?.name || po.supplierName || po.supplier?.name || '',
                trackingNumber: po.shipNo || po.trackingNumber,
                shippedAt: po.shippedAt,
                deliverer: po.deliverer,
                delivererPhone: po.delivererPhone,
                deliveryMethod: po.deliveryMethod,
                payableAmount: po.payableAmount != null ? po.payableAmount : (po.totalAmount || 0),
                settledAmount: po.settledAmount || 0,
                project: po.projectName || po.project || '-',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                subProducts: items.map((i: any) => ({
                    name: i.productName,
                    spec: i.specName || i.spec || '',
                    quantity: i.quantity,
                    unitCost: i.unitPrice,
                    supplier: po.supplierName || ''
                })),
                bizType: po.bizType || '',
                bizNo: po.bizNo || '',
                adjustStatus: 'None', // Placeholder
                refundStatus: 'None', // Placeholder
            } as PurchaseOrderType;
        });
        setOrders(mapped);
        setTotal(res.totalElements || res.total || 0);
        setErrorCount(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        // Race condition check: if a new request has started, ignore this error
        if (requestId !== lastRequestId.current) {
            return;
        }

        console.error('Fetch Orders Error:', e);
        trackEvent({ category: 'PurchaseOrderList', action: 'FetchError', label: e.message });
        setErrorCount(prev => prev + 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorMsg = (e as any).response?.data?.message || (e as any).message || '加载采购单失败';
        if (errorCount < 3) {
             message.error(`加载失败: ${errorMsg}`);
        }
    } finally {
        if (requestId === lastRequestId.current) {
            setLoading(false);
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, errorCount]);

  // Removed logistics fetching effects as they are now in ShipOrderModal

  useEffect(() => {
    if (location.state && (location.state as any).refresh) {
        navigate(location.pathname, { replace: true, state: {} });
        setRefreshKey(prev => prev + 1);
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    if (refreshKey > 0) {
        // Keep current page instead of resetting to page 0
        setParams(prev => ({ ...prev, _t: Date.now() }));
    }
  }, [refreshKey]);

  useEffect(() => {
      fetchOrders();
  }, [fetchOrders]);

  // Scroll to the target order after data refresh
  useEffect(() => {
    if (scrollToId && orders.length > 0) {
      // Find the order in the current page
      const orderIndex = orders.findIndex(o => o.key === String(scrollToId));
      
      if (orderIndex !== -1) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          const rowElement = document.querySelector(`tr[data-row-key="${scrollToId}"]`);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add highlight effect
            rowElement.classList.add('ant-table-row-highlight');
            setTimeout(() => {
              rowElement.classList.remove('ant-table-row-highlight');
            }, 3000);
          }
        }, 100);
      }
      
      // Clear the scroll target
      setScrollToId(null);
    }
  }, [orders, scrollToId]);



  const getStatusInfo = (status: string) => {
    // Directly use centralized status mapping utility
    // It handles case-insensitivity and legacy mappings (e.g. ToShip -> CONFIRMED)
    return {
        text: getStatusText(status),
        color: getStatusColor(status)
    };
  };

  const getBizTypeInfo = (type: string) => {
    switch (type) {
      case 'PLATFORM':
      case 'OrderPurchase':
        return { label: '平台单', icon: <ShoppingCartOutlined />, color: '#1890ff', bg: '#e6f7ff' };
      case 'REPLENISHMENT':
      case 'ReplenishPurchase':
        return { label: '补货单', icon: <SyncOutlined />, color: '#722ed1', bg: '#f9f0ff' };
      case 'INBOUND':
      case 'ProductInbound':
      case '商品入库':
        return { label: '入库单', icon: <SyncOutlined />, color: '#722ed1', bg: '#f9f0ff' };
      case 'Dropship':
        return { label: '一件代发', icon: <TruckOutlined />, color: '#faad14', bg: '#fffbe6' };
      case 'JIT':
        return { label: '即时采购', icon: <ThunderboltOutlined />, color: '#52c41a', bg: '#f6ffed' };
      default:
        return { label: '其他', icon: <DollarOutlined />, color: '#8c8c8c', bg: '#f5f5f5' };
    }
  };

  const handleShipSuccess = useCallback((orderId: number, payload: any) => {
      setOrders(prevOrders => prevOrders.map(o => {
          if (o.key !== String(orderId)) return o;
          const updated = { 
                ...o, 
                status: 'Shipped' as const,
                shippingStatus: 'Shipped' as 'Shipped',
                trackingNumber: payload.shipNo,
                shipNo: payload.shipNo,
                logisticsCompany: payload.shipCompany,
                logisticsCompanyName: payload.logisticsCompanyName,
                freightCompany: payload.shipCompany,
                logisticsSupplierName: payload.logisticsSupplierName,
                logisticsFee: payload.logisticsFee || 0,
                shippedAt: payload.shippedAt || new Date().toISOString(),
                deliveryMethod: payload.shipType === 'SelfDelivery' ? 'SelfDelivery' : 'Logistics',
                shippingProof: payload.attachments !== undefined ? payload.attachments : o.shippingProof
            };
          return updated as PurchaseOrderType;
      }));
      
      setShipModalOpen(false);
      setCurrentShipOrder(null);
      
      fetchOrders();
      fetchStatusSummary(params);
  }, [fetchOrders, fetchStatusSummary, params]);

  const handleCancel = useCallback((record: PurchaseOrderType) => {
    const currentOrderId = Number(record.key);
    
    Modal.confirm({
      title: '确认取消',
      icon: <ExclamationCircleOutlined />,
      content: '确定要取消该采购单吗？取消后关联的入库单也将被取消。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
            await cancelPurchaseOrder(currentOrderId);
            message.success('取消成功');
            
            // Store the order ID to scroll to after refresh
            setScrollToId(currentOrderId);
            
            // Update local state immediately for visual feedback
            setOrders(prevOrders => prevOrders.map(o => 
              o.key === String(currentOrderId) 
                ? { ...o, status: 'Cancelled' as const } 
                : o
            ));
            
            // Refresh data from server to ensure consistency
            setRefreshKey(prev => prev + 1);
        } catch (error: any) {
            console.error('Cancel error:', error);
            message.error(error.response?.data?.message || error.message || '取消失败');
        }
      }
    });
  }, []);

  const handleViewLogistics = useCallback((record: PurchaseOrderType) => {
    // Commented out original modal logic as requested
    // setSelectedLogisticsOrder(record);
    // setLogisticsModalOpen(true);

    // Navigate to new logistics page
    navigate(`/supply-chain/purchase-order/logistics/${record.poNo}`, { state: { record } });
  }, [navigate]);







  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSearch = (values: Record<string, any>) => {
    // Process date range
    const processedValues = { ...values };
    
    // Convert moment/dayjs range to start/end strings
    if (values.orderTime && Array.isArray(values.orderTime) && values.orderTime.length === 2) {
      processedValues.startDate = values.orderTime[0].format('YYYY-MM-DD');
      processedValues.endDate = values.orderTime[1].format('YYYY-MM-DD');
      // Remove original array to avoid sending complex object
      delete processedValues.orderTime;
    }

    // Use poNosTags state for multiple order numbers
    if (poNosTags.length > 0) {
      processedValues.poNos = poNosTags;
    }
    delete processedValues.poNosTags;

        // Update params to trigger fetchOrders via useEffect
    setParams(prev => ({ ...prev, ...processedValues, page: 0, _t: Date.now() }));
    message.success('查询成功');
  };

  const openShipModal = useCallback((record: PurchaseOrderType) => {
    setCurrentShipOrder(record);
    setShipModalOpen(true);
  }, []);

  const openSettlementModal = useCallback((record: PurchaseOrderType) => {
     setCurrentSettlementRecord(record);
     setSettlementDetailModalOpen(true);
  }, []);

  const { exporting, progress, handleExport } = useExport({
    filenamePrefix: 'PurchaseOrders',
    fetchData: async () => {
        // Use backend export or chunked fetching in future
        const res = await getPurchaseOrders({ ...params, page: 0, size: 1000 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataList = (res as any).content || (res as any).records || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return dataList.map((po: any) => {
            const items = po.items || [];
            const isInbound = po.type?.toUpperCase() === 'INBOUND';
            const statusInfo = getStatusInfo(po.status);
            
            return {
                poNo: po.orderNo,
                supplier: po.supplierName || po.supplier?.name,
                purchaseType: isInbound ? '入库采购' : (po.type === 'DROPSHIP' ? '代发采购' : '自配采购'),
                status: statusInfo.text,
                productName: items.map((i: any) => i.productName).join(', '),
                quantity: items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0),
                totalAmount: po.totalAmount,
                createTime: po.createdAt
            };
        });
    },
    columns: [
        { title: '采购单号', dataIndex: 'poNo' },
        { title: '供应商', dataIndex: 'supplier' },
        { title: '类型', dataIndex: 'purchaseType' },
        { title: '状态', dataIndex: 'status' },
        { title: '商品名称', dataIndex: 'productName' },
        { title: '总数量', dataIndex: 'quantity' },
        { title: '总金额', dataIndex: 'totalAmount' },
        { title: '下单时间', dataIndex: 'createTime' }
    ]
  });

  const columns: ColumnsType<PurchaseOrderType> = useMemo(() => [
    { 
      title: '采购单信息', 
      key: 'poInfo', 
      width: '100%',
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          gap: '0', 
          border: '1px solid #e8e8e8', 
          borderRadius: '8px', 
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          borderLeft: record.modificationStatus === 'Increased' ? '4px solid #52c41a' : 
                      record.modificationStatus === 'Decreased' ? '4px solid #ff4d4f' : 
                      '1px solid #e8e8e8',
          minHeight: '200px'
        }}>
          {/* Row 1: Header Titles */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '48px', background: '#fafafa', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>业务类型/平台订单</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>采购单号</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>三方信息</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>供应商</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>业务单类型/单号</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>下单时间</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>期望收货</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>调价状态</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>退款</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>项目</Col>
          </Row>
          {/* Row 2: Header Values */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '60px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
            <Col span={3} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
                {(() => {
                    const label = record.bizType === 'PLATFORM' || record.bizType === 'OrderPurchase' ? '订单采购' : 
                                  record.bizType === 'INBOUND' || record.bizType === 'ProductInbound' ? '入库采购' : 
                                  record.bizType === 'REPLENISHMENT' || record.bizType === 'ReplenishPurchase' ? '补货采购' : '入库采购';
                    const color = label === '入库采购' ? 'purple' : 
                                  label === '订单采购' ? 'blue' : 
                                  label === '补货采购' ? 'orange' : 'purple';
                    
                    const showPlatformOrder = (record.bizType === 'PLATFORM' || record.bizType === 'OrderPurchase' || 
                                              record.bizType === 'REPLENISHMENT' || record.bizType === 'ReplenishPurchase') && 
                                              record.platformOrderNo;
                    
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Tag color={color}>{label}</Tag>
                            {showPlatformOrder && (
                                <Typography.Text style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                                    {record.platformOrderNo}
                                </Typography.Text>
                            )}
                        </div>
                    );
                })()}
            </Col>
            <Col span={2} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'column' }}>
                   <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography.Text copyable style={{ fontSize: '12px' }}>{record.poNo}</Typography.Text>
                      {record.modificationStatus === 'Increased' && <Tag color="success" style={{ marginLeft: 4, transform: 'scale(0.8)' }}>增</Tag>}
                      {record.modificationStatus === 'Decreased' && <Tag color="error" style={{ marginLeft: 4, transform: 'scale(0.8)' }}>减</Tag>}
                   </div>
                   <div style={{ marginTop: 4 }}>
                      {(() => {
                        const statusInfo = getStatusInfo(record.status);
                        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
                      })()}
                   </div>
                </div>
            </Col>
            <Col span={2} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
                {record.platformName && (
                   <div style={{ fontSize: '12px', color: '#666', marginTop: 4, textAlign: 'center' }}>
                      {record.platformName}<br/>{record.thirdPartyNo}
                   </div>
                )}
                {(!record.platformName) && <span style={{ color: '#ccc' }}>-</span>}
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
              <Typography.Text strong>{record.supplier}</Typography.Text>
            </Col>
            <Col span={3} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
               {(() => {
                  const isInbound = record.rawType === 'INBOUND';
                  const bizTypeInfo = getBizTypeInfo(record.bizType);
                  const stockInNo = record.stockInNo || record.inboundOrderNo;
                  const bizNoValue = isInbound ? stockInNo : record.bizNo;
                  
                  return (
                    <>
                      <Tag 
                          icon={bizTypeInfo.icon} 
                          color={bizTypeInfo.bg} 
                          style={{ 
                            color: bizTypeInfo.color, 
                            borderColor: bizTypeInfo.color, 
                            margin: '0 0 4px 0',
                          }}
                        >
                          {bizTypeInfo.label}
                        </Tag>
                        {bizNoValue ? (
                           <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5', wordBreak: 'break-all' }}>
                               {bizNoValue}
                           </div>
                        ) : (
                           <span style={{ color: '#ccc' }}>-</span>
                        )}
                    </>
                  );
               })()}
            </Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
              <Tooltip title={formatTimeFull(record.orderTime)}>
                {formatTimeSmart(record.orderTime)}
              </Tooltip>
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
               {record.expectTime ? (
                 <Tooltip title={formatTimeFull(record.expectTime)}>
                   {formatTimeSmart(record.expectTime)}
                 </Tooltip>
               ) : <span style={{ color: '#ccc' }}>-</span>}
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
               {record.adjustStatus === 'Pending' ? <Tag color="warning">待审批</Tag> : 
                record.adjustStatus === 'Approved' ? <Tag color="success">已调价</Tag> : '-'}
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
               {record.refundStatus === 'Pending' ? <Tag color="warning">待退款</Tag> : 
                record.refundStatus === 'Approved' ? <Tag color="success">已退款</Tag> : '-'}
            </Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>{record.project || '-'}</Col>
          </Row>
          {/* Row 3: Product Titles */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '48px', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', marginBottom: '8px', background: '#fafafa' }}>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>商品名称</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>规格</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>数量</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>单价</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>合计</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>运费应结算</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>运费已结算</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>商品应结算</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>商品已结算</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>操作</Col>
          </Row>
          {/* Row 4: Product Values */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '60px', marginBottom: '0' }}>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', alignItems: 'center' }}>
                <Typography.Text strong ellipsis={{ tooltip: record.productName }}>
                   {record.productName}
                </Typography.Text>
                {record.skuCode && (
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    SKU: {record.skuCode}
                  </Typography.Text>
                )}
              </div>
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>{record.specName}</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
              <Typography.Text strong>{record.quantity}</Typography.Text>
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
              <Typography.Text strong>¥{record.cost.toFixed(2)}</Typography.Text>
            </Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>¥{record.totalCost.toFixed(2)}</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
              <Typography.Text style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{(record.freightPayable || record.freight || 0).toFixed(2)}</Typography.Text>
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
              <Typography.Text style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{(record.freightSettled || 0).toFixed(2)}</Typography.Text>
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
               <Typography.Text style={{ color: '#1890ff', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => openSettlementModal(record)}>
                 ¥{(record.payableAmount || 0).toFixed(2)}
               </Typography.Text>
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
               <Typography.Text style={{ color: '#52c41a', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => openSettlementModal(record)}>
                 ¥{(record.settledAmount || 0).toFixed(2)}
               </Typography.Text>
            </Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
               <Space direction="vertical" size={0} style={{ alignItems: 'center' }}>
                 <Button type="link" size="small" onClick={() => navigate(`/supply-chain/purchase-order/detail/${record.key}`)}>查看</Button>
                 {(record.status === 'Pending' || record.status === 'ToShip') && (
                    <Button type="link" size="small" danger onClick={() => handleCancel(record)}>取消</Button>
                 )}
                 {(record.status === 'ToShip' || record.status === 'Pending') && <Button type="link" size="small" onClick={() => openShipModal(record)}>发货</Button>}
                 {(record.status === 'Shipped' || record.status === 'Received') && (
                    <Button type="link" size="small" icon={<TruckOutlined />} onClick={() => handleViewLogistics(record)}>
                      查看物流
                    </Button>
                 )}
               </Space>
            </Col>
          </Row>
        </div>
      )
    }
  ], [navigate, handleCancel, handleViewLogistics, openShipModal, openSettlementModal]);

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <style>
        {`
          .po-list-row {
            transition: background-color 0.3s;
          }
          .po-list-row:hover {
            background-color: #e6f7ff !important;
          }
        `}
      </style>
      <PageDoc 
        pageTitle="供应链管理 > 采购订单管理 > 采购单列表"
        description={`采购单列表页面...`}
        fields={[
          { name: 'poNo', type: 'String', desc: '采购单号' },
          { name: 'supplier', type: 'String', desc: '供应商' },
          { name: 'status', type: 'Enum', desc: '状态' },
          { name: 'totalAmount', type: 'Decimal', desc: '总金额' }
        ]}
      />

      {/* Search Form - Optimized Layout with Grid */}
      <SearchFormLayout 
        form={searchForm} 
        onFinish={handleSearch} 
        onReset={() => {
          searchForm.resetFields();
          setPoNosTags([]);
          setOrderNoOptions([]);
          setParams({ page: 0, size: 10 });
        }}
      >
        <Form.Item label="供应商" name="supplierName" style={{ marginBottom: 0 }}>
          <Input placeholder="模糊搜索" />
        </Form.Item>
        <Form.Item label="采购单号" name="poNosTags" style={{ marginBottom: 0 }}>
          <Select
            mode="multiple"
            placeholder="输入采购单号搜索"
            value={poNosTags}
            onChange={setPoNosTags}
            filterOption={false}
            loading={searchLoading}
            onSearch={(value) => {
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              if (value.trim()) {
                setSearchLoading(true);
                searchTimeoutRef.current = setTimeout(async () => {
                  try {
                    const res = await searchOrderNos(value.trim());
                    const options = (res || []).map((item: { orderNo: string; supplierName?: string; createdAt?: string }) => ({
                      label: `${item.orderNo}${item.supplierName ? ` (${item.supplierName})` : ''}`,
                      value: item.orderNo,
                    }));
                    setOrderNoOptions(options);
                  } catch (error) {
                    console.error('Search order nos failed:', error);
                  } finally {
                    setSearchLoading(false);
                  }
                }, 300);
              } else {
                setOrderNoOptions([]);
              }
            }}
            options={orderNoOptions}
            style={{ width: '100%' }}
            allowClear
            showSearch
          />
        </Form.Item>
        <Form.Item label="商品信息" name="product" style={{ marginBottom: 0 }}>
          <Input placeholder="名称/规格" />
        </Form.Item>
        <Form.Item label="收货信息" name="receiver" style={{ marginBottom: 0 }}>
          <Input placeholder="姓名/电话/地址" />
        </Form.Item>
        <Form.Item label="下单时间" name="orderTime" style={{ marginBottom: 0 }}>
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="业务类型" name="bizType" style={{ marginBottom: 0 }}>
          <Select placeholder="类型" allowClear>
            <Select.Option value="PLATFORM">订单采购</Select.Option>
            <Select.Option value="INBOUND">入库采购</Select.Option>
            <Select.Option value="REPLENISHMENT">补货采购</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="商品结算状态" name="settlementStatus" style={{ marginBottom: 0 }}>
          <Select placeholder="状态" allowClear>
            <Select.Option value="Unsettled">待结算</Select.Option>
            <Select.Option value="Settled">已结算</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="平台订单号" name="platformOrderNo" style={{ marginBottom: 0 }}>
          <Input placeholder="精确匹配" />
        </Form.Item>
        <Form.Item label="业务单号" name="bizNo" style={{ marginBottom: 0 }}>
          <Input placeholder="精确匹配" />
        </Form.Item>
        <Form.Item label="项目" name="project" style={{ marginBottom: 0 }}>
          <Select placeholder="选择" allowClear>
            <Select.Option value="P001">某某大型国企项目</Select.Option>
            <Select.Option value="P002">某学校采购项目</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="成本承担方" name="costType" style={{ marginBottom: 0 }}>
          <Select placeholder="选择" allowClear>
            <Select.Option value="PLATFORM">平台承担</Select.Option>
            <Select.Option value="SUPPLIER">供应商承担</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="三方平台" name="platformName" style={{ marginBottom: 0 }}>
          <Input placeholder="平台名称" />
        </Form.Item>
        <Form.Item label="三方单号" name="thirdPartyNo" style={{ marginBottom: 0 }}>
          <Input placeholder="三方订单号" />
        </Form.Item>
      </SearchFormLayout>

      {/* Status Summary Cards - moved below search form */}
      
      {/* Status Summary Cards - optimized compact design */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
        <Space size={12} wrap>
          <span style={{ color: '#8c8c8c', fontSize: 13, marginRight: 4 }}>状态筛选：</span>
          <span 
            onClick={() => handleStatusClick()}
            style={{ 
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              borderRadius: 4,
              border: params.status ? '1px solid #d9d9d9' : '1px solid #1890ff',
              background: params.status ? '#fff' : '#e6f7ff',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1890ff', marginRight: 6 }}>{statusSummary.total}</span>
            <span style={{ fontSize: 13, color: '#666' }}>全部</span>
          </span>
          {statusSummary.statusList.map((item) => (
            <span 
              key={item.status}
              onClick={() => handleStatusClick(item.status)}
              style={{ 
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: 4,
                border: params.status === item.status ? `1px solid ${item.color}` : '1px solid #d9d9d9',
                background: params.status === item.status ? '#fff' : '#fff',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: item.color, marginRight: 6 }}>{item.count}</span>
              <span style={{ fontSize: 13, color: '#666' }}>{item.label}</span>
            </span>
          ))}
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
         <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/purchase-order/create')}>新增入库采购单</Button>
            <Button icon={<EditOutlined />} onClick={handleBatchPriceClick}>成本批量调价</Button>
            <Button icon={<SyncOutlined />} onClick={handleSyncLogisticsStatus} loading={syncingLogistics}>
              同步物流配送状态
            </Button>
            <Button icon={<UploadOutlined />} onClick={handleExport} loading={exporting}>
              {exporting ? `导出中 ${progress}%` : '导出采购单'}
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => setExportDeliveryModalOpen(true)}>
              导出发货单
            </Button>
            <Button icon={<HistoryOutlined />} onClick={() => setHistoryExportModalOpen(true)}>
              历史导出记录
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => setImportDeliveryModalOpen(true)}>
              导入发货单
            </Button>
         </Space>
      </div>

      {errorCount > 3 ? (
        <Result
            status="500"
            title="无法加载采购单列表"
            subTitle="网络连接异常或服务器无响应，请稍后重试。"
            extra={<Button type="primary" onClick={() => setErrorCount(0)}>重试</Button>}
        />
      ) : (
      <div ref={tableRef}>
      <Table 
         columns={columns} 
         dataSource={orders}
         rowKey="key"
         loading={loading}
         locale={{ emptyText: loading ? '加载中...' : '暂无数据' }}
         pagination={{
            current: (params.page || 0) + 1,
            pageSize: params.size || 10,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (page, size) => {
                setParams(prev => ({ ...prev, page: page - 1, size: size || prev.size || 10 }));
            }
         }}
      />
      </div>
      )}

      {/* Cost Batch Price Adjustment Modal */}
      <Modal
            title={
                <div
                    style={{ width: '100%', cursor: 'move' }}
                    onMouseOver={() => {
                        if (dragDisabled) {
                            setDragDisabled(false);
                        }
                    }}
                    onMouseOut={() => {
                        setDragDisabled(true);
                    }}
                    onFocus={() => {}}
                    onBlur={() => {}}
                >
                    成本批量调价
                </div>
            }
            open={batchPriceModalOpen}
            onCancel={handleCloseBatchPriceModal}
            width={800}
            footer={null}
            style={{ top: 50 }}
            modalRender={(modal) => (
                <Draggable
                    disabled={dragDisabled}
                    bounds={dragBounds}
                    nodeRef={dragRef}
                    onStart={(event, uiData) => onStart(event, uiData)}
                >
                    <div ref={dragRef}>{modal}</div>
                </Draggable>
            )}
        >
          <div style={{ padding: '20px' }}>
              {/* Top: Instructions */}
              <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                  <Typography.Text style={{ fontSize: '16px' }}>
                      <ExclamationCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                      请下载模板填写后上传，支持.xls/.xlsx格式
                  </Typography.Text>
              </div>

              {/* Middle: Buttons */}
              <Row justify="center" gutter={32} style={{ marginBottom: '30px' }}>
                  <Col>
                      <Button 
                          type="primary" 
                          size="large" 
                          icon={<ImportOutlined rotate={180} />} 
                          onClick={handleDownloadTemplate}
                          style={{ minWidth: '200px', height: '50px' }}
                      >
                          下载成本批量调价模板
                      </Button>
                  </Col>
                  <Col>
                      <Upload 
                          beforeUpload={handleUploadAdjustment} 
                          showUploadList={false} 
                          accept=".xlsx,.xls"
                      >
                          <Button 
                              size="large" 
                              icon={<UploadOutlined />}
                              style={{ minWidth: '200px', height: '50px' }}
                          >
                              上传调价单
                          </Button>
                      </Upload>
                  </Col>
              </Row>

              {/* Export Count Info */}
              {exportCount && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#e6f7ff', borderRadius: '4px', textAlign: 'center' }}>
                      <Typography.Text>
                          导出采购单总数: <strong>{exportCount.total}</strong> 条
                          {exportCount.excluded > 0 && (
                              <span style={{ marginLeft: 16, color: '#faad14' }}>
                                  已排除有待审批调价单: <strong>{exportCount.excluded}</strong> 条
                              </span>
                          )}
                      </Typography.Text>
                  </div>
              )}

              {/* Upload Result Info */}
              {uploadResult && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: uploadResult.fail > 0 ? '#fff2e8' : '#f6ffed', borderRadius: '4px' }}>
                      <div style={{ textAlign: 'center', marginBottom: 8 }}>
                          <Typography.Text>
                              上传结果: 
                              <span style={{ color: '#52c41a', marginLeft: 8 }}>成功 <strong>{uploadResult.success}</strong> 条</span>
                              {uploadResult.fail > 0 && (
                                  <span style={{ color: '#ff4d4f', marginLeft: 16 }}>失败 <strong>{uploadResult.fail}</strong> 条</span>
                              )}
                          </Typography.Text>
                      </div>
                      {uploadResult.fail > 0 && uploadResult.errors.length > 0 && (
                          <div style={{ textAlign: 'center' }}>
                              <Button type="link" onClick={handleDownloadErrorDetail} icon={<ExportOutlined />}>
                                  下载失败明细
                              </Button>
                          </div>
                      )}
                  </div>
              )}

              {/* Bottom: Status Message */}
              <div style={{ textAlign: 'center', color: '#888' }}>
                  <Typography.Text type="secondary">
                      上传后系统将自动校验数据格式与完整性，并检查采购单信息是否匹配
                  </Typography.Text>
              </div>
          </div>
      </Modal>

      {/* Shipment Modal */}
      <ShipOrderModal 
        open={shipModalOpen} 
        onCancel={() => setShipModalOpen(false)}
        onSuccess={handleShipSuccess}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        order={currentShipOrder ? {
            ...currentShipOrder,
            id: Number(currentShipOrder.key),
            items: currentShipOrder.subProducts // Pass subProducts as items if needed by modal
        } : null}
      />

      {/* Logistics Detail Modal (Commented out for independent page) */}
      {/* 
      <Modal title="物流详情" open={logisticsModalOpen} onCancel={() => setLogisticsModalOpen(false)} footer={null}>
         {selectedLogisticsOrder ? (
            <>
              <div style={{ marginBottom: 20, padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>承运商</div>
                    <div style={{ fontWeight: 'bold' }}>顺丰速运</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>运单号</div>
                    <div style={{ fontWeight: 'bold' }}>SF{selectedLogisticsOrder.poNo.replace('C', '')}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>当前状态</div>
                    <div style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      {selectedLogisticsOrder.status === 'Completed' ? '已签收' : '运输中'}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>预计送达</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedLogisticsOrder.expectTime}</div>
                  </Col>
                </Row>
              </div>
              <Timeline
                items={[
                   {
                      children: '已签收，签收人：前台',
                      color: selectedLogisticsOrder.status === 'Completed' ? 'green' : 'gray',
                      label: '2023-10-29 10:30',
                   },
                   {
                      children: '快件派送中',
                      color: 'blue',
                      label: '2023-10-29 08:00',
                   },
                   {
                      children: '快件到达【上海浦东集散中心】',
                      label: '2023-10-28 22:00',
                   },
                   {
                      children: '供应商已发货',
                      label: '2023-10-28 14:00',
                   },
                ]}
              />
            </>
         ) : (
            <div>加载中...</div>
         )}
      </Modal>
      */}



      {/* Cost Adjust Modal (Single) - Removed */}
      
      {/* Settlement Detail Modal */}
      <Modal
        title="结算明细"
        open={settlementDetailModalOpen}
        onCancel={() => setSettlementDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setSettlementDetailModalOpen(false)}>
            关闭
          </Button>
        ]}
      >
        {currentSettlementRecord && (
            <div>
                <div style={{ marginBottom: 16, padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <p><strong>采购单号：</strong>{currentSettlementRecord.poNo}</p>
                    <p><strong>供应商：</strong>{currentSettlementRecord.supplier}</p>
                </div>
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <Card size="small" title="应结算金额">
                             <span style={{ fontSize: '18px', color: '#1890ff', fontWeight: 'bold' }}>
                                ¥{(currentSettlementRecord.payableAmount || 0).toFixed(2)}
                             </span>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card size="small" title="已结算金额">
                             <span style={{ fontSize: '18px', color: '#52c41a', fontWeight: 'bold' }}>
                                ¥{(currentSettlementRecord.settledAmount || 0).toFixed(2)}
                             </span>
                        </Card>
                    </Col>
                </Row>
                <div style={{ marginTop: 16 }}>
                    <Card size="small" title="待结算余额">
                         <span style={{ fontSize: '18px', color: '#ff4d4f', fontWeight: 'bold' }}>
                            ¥{((currentSettlementRecord.payableAmount || 0) - (currentSettlementRecord.settledAmount || 0)).toFixed(2)}
                         </span>
                    </Card>
                </div>
            </div>
        )}
      </Modal>

      <ExportDeliveryModal
        open={exportDeliveryModalOpen}
        onCancel={() => setExportDeliveryModalOpen(false)}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
        selectedCount={selectedRows.length}
        selectedPoIds={selectedRows.map(r => Number(r.key))}
        listFilterParams={{
          keyword: params.keyword,
          product: params.product,
          supplierName: params.supplierName,
          receiver: params.receiver,
          bizType: params.bizType,
          settlementStatus: params.settlementStatus,
          platformOrderNo: params.platformOrderNo,
          bizNo: params.bizNo,
          project: params.project,
          status: params.status,
          startDate: params.startDate,
          endDate: params.endDate,
          supplierId: params.supplierId
        }}
        totalCount={total}
      />

      <HistoryExportModal
        open={historyExportModalOpen}
        onCancel={() => setHistoryExportModalOpen(false)}
      />

      <ImportDeliveryModal
        open={importDeliveryModalOpen}
        onCancel={() => setImportDeliveryModalOpen(false)}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
};

export default PurchaseOrderList;
