import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Card, Space, Tag, Modal, message, Form, Input, Select, Row, Col, DatePicker } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { InboundOrder } from '../../types/warehouse';
import { getInboundOrders, confirmInboundOrder, getWarehouseNameMap, getWarehouses, getInboundOrderStatusSummary, checkInboundAdjustment } from '../../services/warehouseService';
import { getStatusText, getStatusColor } from '../../utils/statusMapping';
import { formatTimeSmart, formatTimeFull } from '../../utils/dateFormatter';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import TablePagination from '../../components/Pagination';
import { Tooltip } from 'antd';

const STORAGE_KEY_FILTERS = 'inbound_order_filters';

const InboundOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InboundOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  const [adjustmentInfo, setAdjustmentInfo] = useState<any[]>([]);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [shippingStatusModalOpen, setShippingStatusModalOpen] = useState(false);
  const [shippingStatusInfo, setShippingStatusInfo] = useState<{ shippingStatus: string; status: string } | null>(null);
  
  // Filter state
  const [filterForm] = Form.useForm();
  // Pagination state (1-based for AntD)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [warehouses, setWarehouses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  
  // Status summary state
  const [statusSummary, setStatusSummary] = useState<{
    total: number;
    statusList: { status: string; label: string; count: number; color: string }[];
  }>({
    total: 0,
    statusList: []
  });
  
  // Data for creation
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({});

  // Load saved filters from localStorage
  const loadSavedFilters = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
      if (saved) {
        const filters = JSON.parse(saved);
        
        // Restore dayjs objects for date pickers
        if (filters.inboundDateRange && Array.isArray(filters.inboundDateRange)) {
            filters.inboundDateRange = filters.inboundDateRange.map((d: string) => d ? dayjs(d) : null);
        }

        filterForm.setFieldsValue(filters);
        return filters;
      }
    } catch (e) {
      console.error('Failed to load saved filters', e);
    }
    return null;
  }, [filterForm]);

  // Save filters to localStorage
  const saveFilters = useCallback((filters: Record<string, unknown>) => {
    try {
      localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
    } catch (e) {
      console.error('Failed to save filters', e);
    }
  }, []);

  const loadData = async (filters?: Record<string, unknown>, currentPage = page, currentSize = pageSize) => {
    setLoading(true);
    try {
      const queryFilters = { ...filters, page: currentPage, size: currentSize };
      const [orderRes, whMap, whList, summary] = await Promise.all([
        getInboundOrders(queryFilters), 
        getWarehouseNameMap(),
        getWarehouses({ size: 1000 }),
        getInboundOrderStatusSummary(filters)
      ]);
      
      const orders = orderRes.records || [];
      const totalCount = orderRes.total || 0;

      // Extract unique suppliers from orders
      const supplierMap = new Map<number, string>();
      orders.forEach(order => {
        if (order.supplierId && order.supplierName) {
          supplierMap.set(Number(order.supplierId), order.supplierName);
        }
      });
      setSuppliers(Array.from(supplierMap.entries()).map(([id, name]) => ({ id, name })));
      setWarehouses(whList.map((w) => ({ id: w.id, name: w.name, code: w.code })));
      
      // Data Sanitization: Only allow valid records
      const validOrders = orders.filter(order => {
        // 1. Basic Structure Check
        if (!order.id || !order.items || !Array.isArray(order.items)) return false;
        
        // 2. Status Whitelist (Backend uses uppercase)
        const validStatuses = ['PENDING', 'RECEIVED', 'CANCELLED'];
        if (!validStatuses.includes(order.status)) return false;
        
        return true;
      });
      
      // Sort by creation time desc (Backend already sorts, but double check if needed)
      // validOrders.sort((a, b) => { ... }); 
      
      setData(validOrders);
      setTotal(totalCount);
      setWarehouseMap(whMap);
      
      // Update status summary from API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summaryData = (summary as any).data || summary;
      if (summaryData && summaryData.statusList) {
          setStatusSummary(summaryData);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('InboundOrderList loadData error:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (error as any).response?.data?.message || (error as any).message || '加载失败，请稍后重试';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Process filters for API
  const processFilters = useCallback((filters: Record<string, any>) => {
    const cleanFilters: Record<string, unknown> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle date range
        if (key === 'inboundDateRange' && Array.isArray(value) && value.length === 2) {
          // Check if both values are valid dayjs objects
          const startDate = value[0];
          const endDate = value[1];
          if (startDate && endDate && 
              typeof startDate.format === 'function' && 
              typeof endDate.format === 'function') {
            cleanFilters.startDate = startDate.format('YYYY-MM-DD');
            cleanFilters.endDate = endDate.format('YYYY-MM-DD');
          }
        } else if (key !== 'inboundDateRange') {
          cleanFilters[key] = value;
        }
      }
    });
    return cleanFilters;
  }, []);

  // Handle filter change - real-time update
  const handleFilterChange = useCallback(() => {
    const filters = filterForm.getFieldsValue();
    const cleanFilters = processFilters(filters);
    saveFilters(cleanFilters); // Note: We might want to save RAW filters or processed? 
    // Usually we save RAW filters to restore form state. 
    // But saveFilters implementation (lines 68-74) just stringifies.
    // If we save processed filters (strings), then loadSavedFilters (lines 47-65) works fine (it parses strings).
    // BUT loadSavedFilters restores dayjs objects from strings.
    // So if we save { startDate: '...', endDate: '...' }, loadSavedFilters won't find 'inboundDateRange'.
    // We should save the FORM values (with dayjs converted to string automatically by JSON.stringify?).
    // dayjs objects stringify to ISO strings.
    // So loadSavedFilters sees ISO strings.
    // My previous fix in loadSavedFilters restores dayjs from these strings.
    // So we should save the RAW form values (or processed if we want to change storage format).
    // The current implementation of saveFilters just does JSON.stringify(filters).
    // If filters has dayjs, it becomes string.
    // So we should save `filters` (form values), NOT `cleanFilters` (API values).
    
    // Wait, handleFilterChange implementation was:
    // const filters = filterForm.getFieldsValue();
    // ... processing ...
    // saveFilters(cleanFilters);
    
    // If we save `cleanFilters`, it has `startDate` and `endDate` strings, but NOT `inboundDateRange`.
    // When reloading, `filterForm.setFieldsValue(filters)` will set `startDate` and `endDate` fields.
    // But the Form Item is named `inboundDateRange`.
    // So the DatePicker won't be populated!
    
    // So we MUST save `inboundDateRange`.
    // So `saveFilters` should receive the raw filters (with dayjs), or we construct a saveable object.
    
    // Let's keep `saveFilters` saving the form values (but clean empty ones).
    const rawFilters = filterForm.getFieldsValue();
    const filtersToSave: Record<string, any> = {};
    Object.entries(rawFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') filtersToSave[k] = v;
    });
    saveFilters(filtersToSave);
    
    setPage(1); 
    loadData(cleanFilters, 1, pageSize);
  }, [filterForm, saveFilters, pageSize, processFilters]);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    filterForm.resetFields();
    localStorage.removeItem(STORAGE_KEY_FILTERS);
    setPage(1);
    loadData({}, 1, pageSize);
  }, [filterForm, pageSize]);

  // Handle status click for status summary
  const handleStatusClick = useCallback((status?: string) => {
    if (status) {
      filterForm.setFieldsValue({ status });
      const filters = filterForm.getFieldsValue();
      const cleanFilters = processFilters(filters);
      // We should probably save the status too
      saveFilters({ ...filters, status }); 
      
      setPage(1);
      loadData({ ...cleanFilters, status }, 1, pageSize);
    } else {
      filterForm.setFieldsValue({ status: undefined });
      localStorage.removeItem(STORAGE_KEY_FILTERS);
      setPage(1);
      loadData({}, 1, pageSize);
    }
  }, [filterForm, saveFilters, pageSize, processFilters]);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const inboundNo = searchParams.get('inboundNo');
    if (inboundNo) {
      filterForm.setFieldsValue({ inboundNo });
      const filters = { inboundNo };
      saveFilters(filters);
      const cleanFilters = processFilters(filters);
      setPage(1);
      loadData(cleanFilters, 1, pageSize);
    } else {
      loadData(undefined, 1, pageSize);
    }
  }, [searchParams]);

  // Pagination Change
  const handlePageChange = (newPage: number, newSize: number) => {
    setPage(newPage);
    setPageSize(newSize);
    const filters = filterForm.getFieldsValue();
    const cleanFilters = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    loadData(cleanFilters, newPage, newSize);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmArrival = async (record: InboundOrder) => {
    setSelectedOrder(record);
    try {
      const result = await checkInboundAdjustment(record.id);
      const adjustments = result.adjustments || [];
      const shippingStatus = result.purchaseOrderShippingStatus;
      
      // 检查采购单发货状态，如果不是已收货，需要弹窗确认
      if (shippingStatus && shippingStatus !== 'RECEIVED') {
        setShippingStatusInfo({ 
          shippingStatus: shippingStatus, 
          status: result.purchaseOrderStatus || '' 
        });
        setShippingStatusModalOpen(true);
        // 如果有调价单，也保存调价信息
        if (adjustments && adjustments.length > 0) {
          setAdjustmentInfo(adjustments);
        }
      } else if (adjustments && adjustments.length > 0) {
        // 发货状态是已收货，但有调价单
        setAdjustmentInfo(adjustments);
        setAdjustmentModalOpen(true);
      } else {
        // 发货状态是已收货，且没有调价单
        setConfirmModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to check adjustment:', error);
      setConfirmModalOpen(true);
    }
  };

  const handleAdjustmentConfirm = () => {
    setAdjustmentModalOpen(false);
    setConfirmModalOpen(true);
  };

  const handleShippingStatusConfirm = () => {
    setShippingStatusModalOpen(false);
    // 如果有调价单，显示调价弹窗
    if (adjustmentInfo && adjustmentInfo.length > 0) {
      setAdjustmentModalOpen(true);
    } else {
      setConfirmModalOpen(true);
    }
  };

  const submitConfirm = async () => {
    if (selectedOrder) {
      await confirmInboundOrder(selectedOrder.id, 'CurrentUser'); // Mock user
      message.success('入库确认成功，库存已更新');
      setConfirmModalOpen(false);
      loadData();
    }
  };

  const columns: ColumnsType<InboundOrder> = [
    { title: '入库单号', dataIndex: 'inboundNo', key: 'inboundNo', render: (val, record) => val || record.id },
    { 
        title: '关联采购单', 
        dataIndex: 'purchaseOrderNo', 
        key: 'purchaseOrderNo',
        render: (text, record) => {
            // Use purchaseOrderId if available, fallback to text/poNo
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const id = (record as any).purchaseOrderId || text || record.poNo;
            return <a href={`/supply-chain/purchase-order/detail/${id}`} target="_blank" rel="noopener noreferrer">{text || record.poNo}</a>;
        }
    },
    { title: '供应商', dataIndex: 'supplierName', key: 'supplierName' },
    { 
        title: '入库仓库', 
        dataIndex: 'warehouseCode', 
        key: 'warehouseCode',
        render: (code, record) => record.warehouseName || warehouseMap[code] || code
    },
    {
        title: '总数量',
        dataIndex: 'totalQuantity',
        key: 'totalQuantity',
        render: (val, record) => val !== undefined ? val : record.items.reduce((sum, item) => sum + item.quantity, 0)
    },
    {
        title: '商品明细',
        key: 'items',
        width: 200,
        render: (_, record) => {
          const items = record.items || [];
          if (items.length === 0) return '-';
          const displayItems = items.slice(0, 2);
          const hasMore = items.length > 2;
          return (
            <div style={{ fontSize: 12 }}>
              {displayItems.map((item, idx) => (
                <div key={idx} style={{ marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.productName}
                  {item.specName ? <span style={{ color: '#666', marginLeft: 4 }}>({item.specName})</span> : ''}
                </div>
              ))}
              {hasMore && <span style={{ color: '#1890ff' }}>+{items.length - 2}项...</span>}
            </div>
          );
        }
    },
    { 
        title: '成本总计', 
        key: 'totalCost',
        render: (_, record) => `¥${(record.totalAmount !== undefined ? record.totalAmount : record.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)).toFixed(2)}`
    },
    { 
      title: '发货状态', 
      dataIndex: 'shippingStatus', 
      key: 'shippingStatus',
      render: (status) => (
        <Tag color={getStatusColor(status, 'shipping')}>
            {getStatusText(status, 'shipping')}
        </Tag>
      )
    },
    { 
      title: '入库状态', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'PENDING': { text: '待入库', color: 'blue' },
          'RECEIVED': { text: '已入库', color: 'green' },
          'CANCELLED': { text: '已取消', color: 'default' },
        };
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    { 
      title: '入库日期', 
      dataIndex: 'inboundDate', 
      key: 'inboundDate',
      render: (t) => (
        <Tooltip title={formatTimeFull(t)}>
          <span>{formatTimeSmart(t)}</span>
        </Tooltip>
      )
    },
    { 
      title: '创建时间', 
      dataIndex: 'createTime', 
      key: 'createTime',
      render: (t) => (
        <Tooltip title={formatTimeFull(t)}>
          <span>{formatTimeSmart(t)}</span>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING' && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleConfirmArrival(record)}>
              确认入库
            </Button>
          )}
          <Button size="small" onClick={() => navigate(`/supply-chain/inbound/detail/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 采购入库"
        description={`
          **功能说明**：
          1. **入库单管理**：管理所有采购入库单据。入库单必须关联有效的采购单。
          2. **创建入库单**：
             - 选择已审核通过的采购单。
             - 指定入库仓库。
             - 系统自动带入采购单商品明细及待入库数量。
          3. **确认到货**：
             - 库管员核对实物与单据。
             - 确认无误后，系统将状态更新为“已完成”。
             - **自动逻辑**：确认到货后，系统自动创建对应的库存批次（Inventory Batch），增加仓库库存。
        `}
        fields={[
          { name: 'id', type: 'String', desc: '入库单号' },
          { name: 'poNo', type: 'String', desc: '关联采购单号' },
          { name: 'supplierName', type: 'String', desc: '供应商名称' },
          { name: 'warehouseCode', type: 'String', desc: '入库仓库代码' },
          { name: 'status', type: 'Enum', desc: '状态: pending(待确认), completed(已完成)' },
          { name: 'createTime', type: 'DateTime', desc: '创建时间' },
          { name: 'items', type: 'Array', desc: '入库商品明细' },
        ]}
        flowchart={`
          graph LR
            A[采购单生效] --> B[创建入库单]
            B --> C{待确认}
            C -->|确认到货| D[已完成]
            D -.-> E[生成库存批次]
        `}
      />
      
      {/* Filter Form */}
      <SearchFormLayout
        form={filterForm}
        onSearch={() => handleFilterChange()}
        onReset={handleResetFilters}
        formProps={{
          onValuesChange: () => {
            setTimeout(handleFilterChange, 300);
          }
        }}
      >
        <Form.Item label="入库单号" name="inboundNo" style={{ marginBottom: 0 }}>
          <Input placeholder="模糊搜索" allowClear />
        </Form.Item>
        <Form.Item label="采购单号" name="poNo" style={{ marginBottom: 0 }}>
          <Input placeholder="模糊搜索" allowClear />
        </Form.Item>
        <Form.Item label="供应商" name="supplierId" style={{ marginBottom: 0 }}>
          <Select 
            placeholder="选择供应商" 
            allowClear 
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {suppliers.map(s => (
              <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="入库仓库" name="warehouseId" style={{ marginBottom: 0 }}>
          <Select 
            placeholder="选择仓库" 
            allowClear 
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {warehouses.map(w => (
              <Select.Option key={w.id} value={w.id}>{w.name} ({w.code})</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="商品信息" name="product" style={{ marginBottom: 0 }}>
          <Input placeholder="名称/SKU/条码" allowClear />
        </Form.Item>
        <Form.Item label="发货状态" name="shippingStatus" style={{ marginBottom: 0 }}>
          <Select placeholder="全部" allowClear>
            <Select.Option value="PENDING">未发货</Select.Option>
            <Select.Option value="TO_SHIP">待发货</Select.Option>
            <Select.Option value="SHIPPED">已发货</Select.Option>
            <Select.Option value="RECEIVED">已收货</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="入库时间" name="inboundDateRange" style={{ marginBottom: 0 }}>
          <DatePicker.RangePicker 
            style={{ width: '100%' }} 
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
            allowClear
          />
        </Form.Item>
      </SearchFormLayout>
      
      {/* Status Summary Cards - 移动到搜索区域下方 */}
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
              border: !filterForm.getFieldValue('status') ? '1px solid #1890ff' : '1px solid #d9d9d9',
              background: !filterForm.getFieldValue('status') ? '#e6f7ff' : '#fff',
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
                border: filterForm.getFieldValue('status') === item.status ? `1px solid ${item.color}` : '1px solid #d9d9d9',
                background: filterForm.getFieldValue('status') === item.status ? '#fff' : '#fff',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: item.color, marginRight: 6 }}>{item.count}</span>
              <span style={{ fontSize: 13, color: '#666' }}>{item.label}</span>
            </span>
          ))}
        </Space>
      </div>
      
      <Card title="采购入库管理">
      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id" 
        loading={loading} 
        pagination={false}
      />
      <TablePagination
        total={total}
        pageSize={pageSize}
        current={page}
        onChange={handlePageChange}
        isLoading={loading}
      />

      {/* Adjustment Alert Modal */}
      <Modal
        title="调价提醒"
        open={adjustmentModalOpen}
        onOk={handleAdjustmentConfirm}
        onCancel={() => setAdjustmentModalOpen(false)}
        width={700}
        okText="确认入库"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
          <p style={{ margin: 0, color: '#d46b08', fontWeight: 500 }}>
            ⚠️ 该入库单对应的采购单存在已审批通过的调价单，入库成本将按调价后成本计算。
          </p>
        </div>
        {selectedOrder && (
          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
            <p><strong>入库单号:</strong> {selectedOrder.inboundNo || selectedOrder.id}</p>
            <p><strong>供应商:</strong> {selectedOrder.supplierName}</p>
          </div>
        )}
        <Table 
          dataSource={adjustmentInfo}
          pagination={false}
          rowKey={(record) => `${record.sheetNo}-${record.productId}`}
          size="small"
          columns={[
            { title: '调价单号', dataIndex: 'sheetNo', width: 120 },
            { title: '商品名称', dataIndex: 'productName', width: 150 },
            { title: '规格', dataIndex: 'specName', width: 100 },
            { title: '数量', dataIndex: 'quantity', width: 80, align: 'right' },
            { 
              title: '原成本', 
              dataIndex: 'oldCost', 
              width: 100, 
              align: 'right',
              render: (val) => val ? `¥${Number(val).toFixed(2)}` : '-'
            },
            { 
              title: '调价后成本', 
              dataIndex: 'newCost', 
              width: 110, 
              align: 'right',
              render: (val) => val ? `¥${Number(val).toFixed(2)}` : '-'
            },
            { 
              title: '调价差额', 
              dataIndex: 'totalDiff', 
              width: 110, 
              align: 'right',
              render: (val) => {
                if (!val) return '-';
                const num = Number(val);
                const color = num > 0 ? '#cf1322' : num < 0 ? '#389e0d' : '#666';
                return <span style={{ color, fontWeight: 500 }}>¥{num.toFixed(2)}</span>;
              }
            },
          ]}
        />
        <p style={{ color: '#999', fontSize: 12, marginTop: 12 }}>
          确认入库后，将按调价后成本生成库存批次和商品变动记录。
        </p>
      </Modal>

      {/* Shipping Status Check Modal */}
      <Modal
        title="发货状态确认"
        open={shippingStatusModalOpen}
        onOk={handleShippingStatusConfirm}
        onCancel={() => setShippingStatusModalOpen(false)}
        width={600}
        okText="确认入库"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
          <p style={{ margin: 0, color: '#d46b08', fontWeight: 500 }}>
            ⚠️ 该入库单对应采购单尚未收货，确认入库么？
          </p>
        </div>
        {selectedOrder && (
          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
            <p><strong>入库单号:</strong> {selectedOrder.inboundNo || selectedOrder.id}</p>
            <p><strong>供应商:</strong> {selectedOrder.supplierName}</p>
            <p>
              <strong>采购单发货状态:</strong>{' '}
              {shippingStatusInfo ? (
                <Tag color={getStatusColor(shippingStatusInfo.shippingStatus)}>
                  {getStatusText(shippingStatusInfo.shippingStatus)}
                </Tag>
              ) : '-'}
            </p>
          </div>
        )}
        <p style={{ color: '#666', marginTop: 12 }}>
          确认入库后，该采购单的发货状态及采购单状态将变更为"已收货"。
        </p>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        title="确认到货"
        open={confirmModalOpen}
        onOk={submitConfirm}
        onCancel={() => setConfirmModalOpen(false)}
        width={600}
      >
        <p>确认以下商品已实际到货并入库？</p>
        {selectedOrder && (
          <>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                <p><strong>入库单号:</strong> {selectedOrder.inboundNo || selectedOrder.id}</p>
                <p><strong>供应商:</strong> {selectedOrder.supplierName}</p>
            </div>
            <Table 
                dataSource={selectedOrder.items}
                pagination={false}
                rowKey="id"
                size="small"
                scroll={{ y: 200 }}
                columns={[
                    { title: '商品', dataIndex: 'productName' },
                    { title: '规格', dataIndex: 'specName' },
                    { title: '数量', dataIndex: 'quantity' },
                ]}
            />
          </>
        )}
        <p style={{ color: '#999', fontSize: 12, marginTop: 12 }}>确认后将自动生成库存批次。</p>
      </Modal>
      </Card>
    </div>
  );
};

export default InboundOrderList;
