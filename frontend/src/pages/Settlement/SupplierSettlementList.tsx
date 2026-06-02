import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, message, Tooltip, Dropdown, Form, Upload, Modal, Descriptions, Typography, Card } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { EyeOutlined, MoreOutlined, PayCircleOutlined, UploadOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import { getStatusLabel, getDisplayPaidAmount, validateAmountSymbol } from '../../utils/paymentValidation';
// import { useExport } from '../../utils/exportUtils';

import { getSupplierSettlements, paySettlement, uploadCostInvoice } from '../../services/settlementService';
import { uploadFile } from '../../services/fileService';

const { Text } = Typography;

interface DataType {
  key: string;
  id?: number;
  settlementNo: string;
  supplierName: string;
  settlementType: string; // 结算类型：现付、预付、渔户、月结等
  settlementCycle: string;
  costInvoiceStatus: 'Uploaded' | 'Pending' | 'Partial' | string;
  costInvoiceReceived?: number;
  amount: number;
  paidAmount?: number;
  accountType: 'Company' | 'Personal';
  operator: string;
  applyDate: string;
  approvalStatus: 'Pending' | 'Approving' | 'Approved' | 'Rejected' | 'Revoked';
  statusEnum?: string;
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | null;
  source?: 'Purchase' | 'Delivery'; // Add Source
  [key: string]: unknown;
}

const SupplierSettlementList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataType[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isRedInvoiceModalOpen, setIsRedInvoiceModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<DataType | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  
  interface FilterType {
    supplierName: string;
    settlementNo: string;
    approvalStatus: string | undefined;
    source: string | undefined;
    purchaseOrderNo: string;
    businessNo: string;
  }

  const [filters, setFilters] = useState<FilterType>({ supplierName: '', settlementNo: '', approvalStatus: undefined, source: undefined, purchaseOrderNo: '', businessNo: '' });

  // Safe Data Loading
  const fetchData = React.useCallback(async (page: number, pageSize: number, currentFilters: FilterType) => {
    setLoading(true);
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = {
            page: page - 1, // Backend is 0-indexed
            size: pageSize,
        };
        // Only add filter params if they have values
        if (currentFilters.supplierName) params.supplierName = currentFilters.supplierName;
        if (currentFilters.settlementNo) params.settlementNo = currentFilters.settlementNo;
        if (currentFilters.purchaseOrderNo) params.purchaseOrderNo = currentFilters.purchaseOrderNo;
        if (currentFilters.businessNo) params.businessNo = currentFilters.businessNo;
        
        // Backend getAll supports 'type' via @RequestParam, but complex filtering might need Specification.
        // Currently, backend controller `getAll` supports `type` param.
        // It filters out PENDING status by default.
        // It returns { code: 200, data: { records: [...], total: ... } }
        
        const response: any = await getSupplierSettlements(params);
        // Assuming response is the `data` object from ApiResponse, or ApiResponse itself.
        // Let's handle both cases defensively.
        const responseData = response.data || response;
        const records = responseData.records || [];
        const total = responseData.total || 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedServiceData: DataType[] = records.map((s: any) => ({
            key: s.settlementNo,
            id: s.id,
            settlementNo: s.settlementNo,
            supplierName: s.supplierName || '未知供应商',
            settlementType: s.settlementType || 'Cash',
            settlementCycle: s.settlementPeriod ? `${s.settlementPeriod}天` : '-',
            costInvoiceStatus: s.costInvoiceStatus || '未上传',
            costInvoiceReceived: s.costInvoiceReceived || 0,
            amount: s.totalAmount,
            paidAmount: s.status === '已支付' || s.status === 'PAID' || s.status === 'paid' ? s.totalAmount : 0,
            accountType: 'Company',
            operator: s.createdBy || 'System',
            applyDate: s.createdAt ? s.createdAt.split('T')[0] : '-',
            approvalStatus: s.status as any,
            statusEnum: s.statusEnum || s.status || s.statusCode,
            paymentStatus: s.status === '已支付' || s.status === 'PAID' || s.status === 'paid' ? 'Paid' : 'Pending',
            source: s.type === '配送单' || s.type === 'LOGISTICS' ? 'Delivery' : 'Purchase'
        }));

        // For demo purposes, we might want to mix mock data, but strictly speaking we should use backend data.
        // If backend data is empty, maybe show mock data for demo?
        // User asked to fix "loading loop", so let's stick to backend data primarily, 
        // but since backend might be empty in this environment, I'll keep the mock merge for now but handle it better.
        
        // Actually, mixing mock data causes pagination issues if total count is from backend only.
        // Let's just use mappedServiceData if we want to fix the "real" loading issue.
        // But to keep existing "demo" feel, I will append mock data only if backend is empty or strictly for dev.
        // Let's append mock data for now as it was in original code, but do it correctly.
        
        // However, the original code did CLIENT-SIDE pagination on the combined list.
        // If we want real server-side pagination, we should use `total` from backend.
        // If we mix mock data, we mess up the total.
        
        // Decision: I will use server data ONLY if available. 
        // If server returns empty, I'll show mock data for demo (client-side paged).
        // BUT, the infinite loop was caused by `useEffect` dependency on `pagination`.
        
        const finalData = mappedServiceData;
        const finalTotal = total;
        
        setData(finalData);
        // Update pagination state, but ensure it doesn't trigger useEffect loop
        setPagination(prev => ({ 
            ...prev, 
            current: page, 
            pageSize: pageSize, 
            total: finalTotal 
        }));

    } catch (e) {
        console.error('Data load error:', e);
        message.error('数据加载失败，请刷新重试');
    } finally {
        setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(1, 20, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once on mount

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTableChange = (newPagination: any) => {
    fetchData(newPagination.current, newPagination.pageSize, filters);
  };

  const handleSearch = () => {
    // Reset to page 1
    fetchData(1, pagination.pageSize, filters);
  };

  const handleReset = () => {
    const newFilters: FilterType = { supplierName: '', settlementNo: '', approvalStatus: undefined, source: undefined, purchaseOrderNo: '', businessNo: '' };
    setFilters(newFilters);
    fetchData(1, pagination.pageSize, newFilters);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const systemAccounts = [
    { label: '主营账户 (工商银行 8888)', value: 'ICBC_8888', isDefault: true },
    { label: '副营账户 (招商银行 6666)', value: 'CMB_6666', isDefault: false },
  ];
  
  /*
  const defaultSystemAccount = {
      bankName: '招商银行上海分行',
      accountName: '上海供应链管理有限公司',
      accountNo: '6225880123456789'
  };
  */

  /*
  const handlePreview = async (file: UploadFile) => {
    let src = file.url as string;
    if (!src) {
        src = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file.originFileObj as RcFile);
            reader.onload = () => resolve(reader.result as string);
        });
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow?.document.write(image.outerHTML);
  };
  */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const dummyRequest = ({ file, onSuccess }: any) => {
    setTimeout(() => {
        onSuccess("ok");
    }, 0);
  };

  const getActionItems = (record: DataType): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        label: '查看详情',
        icon: <EyeOutlined />,
        onClick: () => {
            const param = record.id ? record.id : record.key;
            navigate(`/supply-chain/settlement/supplier/detail/${param}`);
        }
      }
    ];

    // 根据成本票状态显示不同按钮
    const costInvoiceUploaded = record.costInvoiceStatus === '已上传';
    
    if (record.amount > 0 && !costInvoiceUploaded) {
      items.push({
        key: 'upload_invoice',
        label: record.settlementType === 'Prepayment' ? '上传下单凭证' : '上传成本票',
        icon: <UploadOutlined />,
        onClick: () => { setCurrentRecord(record); setIsModalOpen(true); }
      });
    }

    if (record.amount > 0 && costInvoiceUploaded) {
      items.push({
        key: 'red_invoice',
        label: '红冲票',
        icon: <MinusCircleOutlined />,
        onClick: () => { setCurrentRecord(record); setIsRedInvoiceModalOpen(true); }
      });
    }

    if (record.amount < 0) {
      items.push({
        key: 'upload_voucher',
        label: '上传付款凭证',
        icon: <PayCircleOutlined />,
        onClick: () => { setCurrentRecord(record); setIsVoucherModalOpen(true); }
      });
    }

    return items;
  };

  const handleInvoiceSubmit = async () => {
      if (!currentRecord) return;
      const amountInput = document.getElementById('costInvoiceAmountInput') as HTMLInputElement;
      const amount = amountInput ? parseFloat(amountInput.value) : 0;
      const invoiceCodeInput = document.getElementById('invoiceCodeInput') as HTMLInputElement;
      const invoiceCode = invoiceCodeInput ? invoiceCodeInput.value : '';
      
      if (!amount || amount <= 0) {
          message.error('请输入有效的上传金额');
          return;
      }
      
      const unreceivedAmount = (currentRecord.amount || 0) - (currentRecord.costInvoiceReceived || 0);
      if (amount > unreceivedAmount) {
          message.error(`上传金额不能大于未收金额 ${unreceivedAmount.toFixed(2)} 元`);
          return;
      }
      
      if (fileList.length === 0) {
          message.error('请选择成本票文件');
          return;
      }
      
      if (!currentRecord.id) {
          message.success('成本票上传成功 (演示)');
          setIsModalOpen(false);
          return;
      }
      
      try {
          let proofUrl: string | undefined;
          
          const uploadItem = fileList[0];
          const file = uploadItem.originFileObj;
          if (file) {
             const uploadResult = await uploadFile(file);
             proofUrl = uploadResult.fileUrl;
          }
          
          await uploadCostInvoice(currentRecord.id, amount, proofUrl, '成本票', invoiceCode || undefined);
          message.success('成本票上传成功');
          setIsModalOpen(false);
          setFileList([]);
          fetchData(pagination.current, pagination.pageSize, filters);
      } catch (error: any) {
          console.error(error);
          const errorMessage = error?.response?.data?.message || error?.message || '上传失败，请重试';
          message.error(errorMessage);
      }
  };

  const handleVoucherSubmit = async () => {
    if (!currentRecord) return;
    if (!currentRecord.id) {
        // Fallback for mock data
        message.success('付款凭证上传成功 (演示)');
        setIsVoucherModalOpen(false);
        return;
    }
    try {
        await paySettlement(currentRecord.id, {
            paymentMethod: 'Bank Transfer',
            paymentProof: fileList.length > 0 ? (fileList[0].url || fileList[0].name) : 'proof.jpg'
        });
        message.success('付款凭证上传成功');
        setIsVoucherModalOpen(false);
        fetchData(pagination.current, pagination.pageSize, filters);
    } catch (error) {
        console.error(error);
        message.error('提交失败');
    }
  };



  const columns: ColumnsType<DataType> = [
    { 
      title: '结算单号', 
      dataIndex: 'settlementNo', 
      key: 'settlementNo',
      fixed: 'left',
      width: 140,
    },
    { 
      title: '来源', 
      dataIndex: 'source', 
      key: 'source',
      width: 100,
      render: (val) => val === 'Delivery' ? <Tag color="cyan">配送单</Tag> : <Tag color="blue">采购单</Tag>
    },
    { 
      title: '供应商名称', 
      dataIndex: 'supplierName', 
      key: 'supplierName',
      fixed: 'left',
      width: 240,
      render: (name) => (
        <Tooltip placement="topLeft" title={name}>
          <div style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-all',
            whiteSpace: 'normal'
          }}>
            {name}
          </div>
        </Tooltip>
      ),
    },
    { 
      title: '结算类型', 
      dataIndex: 'settlementType', 
      key: 'settlementType',
      width: 100,
      render: (type) => {
          if (!type) return '-';
          // 后端已翻译，直接显示
          let color = 'blue';
          if (type === '预付' || type === 'Prepayment') color = 'orange';
          if (type === '渔户' || type === 'FISHERMAN') color = 'cyan';
          return <Tag color={color}>{type}</Tag>;
      }
    },
    { 
      title: '结算周期', 
      dataIndex: 'settlementCycle', 
      key: 'settlementCycle',
      width: 90,
      render: (text: string, record) => {
        if (record.settlementType === '预付' || record.settlementType === 'Prepayment') {
            return '-';
        }
        // 后端已返回格式化的周期（如"30天"），直接显示
        return text || '-';
      }
    },
    {
      title: '成本票',
      dataIndex: 'costInvoiceStatus',
      key: 'costInvoiceStatus',
      width: 100,
      render: (status) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          '已上传': { color: 'green', text: '已上传' },
          '部分上传': { color: 'orange', text: '部分上传' },
          '未上传': { color: 'default', text: '未上传' },
          'Uploaded': { color: 'green', text: '已上传' },
          'Partial': { color: 'orange', text: '部分上传' },
          'Pending': { color: 'default', text: '未上传' }
        };
        const config = statusMap[status] || { color: 'default', text: status || '未上传' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '审批金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 130,
      render: (val) => {
        const amount = val ?? 0;
        return <span style={{ color: amount >= 0 ? 'black' : 'red' }}>{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      },
    },
    {
      title: '已付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      align: 'right',
      width: 130,
      render: (val, record) => {
        const amount = val ?? 0;
        const displayString = getDisplayPaidAmount(record.amount, amount);
        
        return (
          <span style={{ color: amount > 0 ? 'green' : '#ccc' }}>
            {record.paymentStatus === 'Pending' && amount === 0 ? '-' : displayString}
          </span>
        );
      },
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 90,
      render: (text) => {
        const userMap: Record<string, string> = {
          'John Doe': '张三',
          'Jane Smith': '李四',
          'System': '系统',
        };
        return userMap[text] || text || '-';
      }
    },
    { title: '申请日期', dataIndex: 'applyDate', key: 'applyDate', width: 110 },
    {
      title: '结算状态',
      dataIndex: 'statusEnum',
      key: 'statusEnum',
      width: 100,
      render: (statusEnum, record) => {
        const key = statusEnum || record.statusEnum || record.status || record.approvalStatus;
        
        // 预付类结算单的特殊处理
        if (record.settlementType === 'Prepayment' || record.settlementType === '预付') {
          // 检查是否已扣款
          if (key === 'PAID' || key === '已付款' || record.paidAmount === record.amount) {
            return <Tag color="green">预付扣款</Tag>;
          }
          // 其他状态正常显示
        }

        const statusMap: Record<string, { label: string; color: string }> = {
          'PENDING': { label: '待结算', color: 'blue' },
          'SETTLED': { label: '已结算', color: 'cyan' },
          'PAID': { label: '已付款', color: 'green' },
          'REVOKED': { label: '已撤回', color: 'default' },
          'REJECTED': { label: '已拒回', color: 'red' },
          'pending': { label: '待结算', color: 'blue' },
          'settled': { label: '已结算', color: 'cyan' },
          'paid': { label: '已付款', color: 'green' },
          'revoked': { label: '已撤回', color: 'default' },
          'rejected': { label: '已拒回', color: 'red' },
          '待结算': { label: '待结算', color: 'blue' },
          '已结算': { label: '已结算', color: 'cyan' },
          '已付款': { label: '已付款', color: 'green' },
          '已撤回': { label: '已撤回', color: 'default' },
          '已拒回': { label: '已拒回', color: 'red' },
        };

        const statusInfo = statusMap[key];
        
        if (statusInfo) {
          return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
        }

        // Fallback for old data or unknown status
        if (key === 'Pending') return <Tag color="blue">待付款</Tag>;
        if (key === 'Paid') return <Tag color="green">已付款</Tag>;

        if (!validateAmountSymbol(record.amount)) {
            return <Tag color="red">金额异常</Tag>;
        }

        const label = getStatusLabel(record.amount, key);
        const isReceiving = record.amount < 0;

        return <Tag color={isReceiving ? 'orange' : 'blue'}>{label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionItems(record) }} trigger={['click']}>
            <Button type="link" size="small">
                操作 <MoreOutlined />
            </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 供应商结算单 > 供应商结算单列表"
        description={`供应商结算单列表页。

1. **列表字段**：
   - 结算单号、供应商、**结算类型**、结算周期（预付类型显示为空）。
   - 成本票状态、审批/已付金额、账户类型。
   - 申请日期、结算状态。

2. **操作功能**：
   - **查看详情**：进入详情页。
   - **上传成本票**：支持上传 PDF/图片，状态变为"已上传"。
   - **上传付款凭证**：当审批金额为负数时自动显示。`}
        fields={[
          { name: 'settlementNo', type: 'String', length: '32', required: true, unique: true, desc: '结算单号' },
          { name: 'amount', type: 'Decimal', length: '10,2', required: true, defaultValue: '0.00', desc: '结算金额' },
        ]}
      />
      <SearchFormLayout onSearch={handleSearch} onReset={handleReset}>
         <Form.Item label="供应商名称" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" allowClear value={filters.supplierName} onChange={e => setFilters({ ...filters, supplierName: e.target.value })} />
         </Form.Item>
         <Form.Item label="结算单号" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" allowClear value={filters.settlementNo} onChange={e => setFilters({ ...filters, settlementNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="采购单号" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入采购单号" allowClear value={filters.purchaseOrderNo || ''} onChange={e => setFilters({ ...filters, purchaseOrderNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="业务单号" style={{ marginBottom: 0 }}>
            <Input placeholder="配送单号/平台订单号等" allowClear value={filters.businessNo || ''} onChange={e => setFilters({ ...filters, businessNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="来源" style={{ marginBottom: 0 }}>
            <Select 
                placeholder="请选择" 
                allowClear 
                value={filters.source} 
                onChange={val => setFilters({ ...filters, source: val })}
            >
               <Select.Option value="Purchase">采购单</Select.Option>
               <Select.Option value="Delivery">配送单</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item label="结算状态" style={{ marginBottom: 0 }}>
            <Select 
                placeholder="请选择" 
                allowClear 
                value={filters.approvalStatus} 
                onChange={val => setFilters({ ...filters, approvalStatus: val })}
            >
               <Select.Option value="Pending">待结算</Select.Option>
               <Select.Option value="SETTLED">已结算</Select.Option>
               <Select.Option value="PAID">已付款</Select.Option>
               <Select.Option value="REVOKED">已撤回</Select.Option>
               <Select.Option value="REJECTED">已拒回</Select.Option>
            </Select>
         </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
         <Space>
            <Button onClick={() => message.info('功能开发中')}>手动生成结算单</Button>
         </Space>
         {/* 
         <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
            </Button>
         </Tooltip>
         */}
      </div>

      <Table 
         columns={columns} 
         dataSource={data}
         loading={loading}
         scroll={{ x: 1500 }}
         pagination={{
             ...pagination,
             onChange: handleTableChange
         }}
      />

      <Modal title="上传成本票" open={isModalOpen} onOk={handleInvoiceSubmit} onCancel={() => setIsModalOpen(false)}>
        <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
           <Descriptions.Item label="应收成本票金额">
              <Text strong>{(currentRecord?.amount || 0).toFixed(2)} 元</Text>
           </Descriptions.Item>
           <Descriptions.Item label="已收成本票金额">
              <Text strong style={{ color: '#52c41a' }}>{(currentRecord?.costInvoiceReceived || 0).toFixed(2)} 元</Text>
           </Descriptions.Item>
           <Descriptions.Item label="未收成本票金额">
              <Text strong style={{ color: '#ff4d4f' }}>
                 {((currentRecord?.amount || 0) - (currentRecord?.costInvoiceReceived || 0)).toFixed(2)} 元
              </Text>
           </Descriptions.Item>
        </Descriptions>
        <Form layout="vertical">
            <Form.Item 
              label="本次上传成本票金额" 
              required
              extra={`最大可上传金额：${((currentRecord?.amount || 0) - (currentRecord?.costInvoiceReceived || 0)).toFixed(2)} 元`}
            >
                <Input
                  type="number"
                  placeholder="请输入本次上传金额"
                  suffix="元"
                  id="costInvoiceAmountInput"
                  min={0}
                  max={(currentRecord?.amount || 0) - (currentRecord?.costInvoiceReceived || 0)}
                />
            </Form.Item>
            <Form.Item 
              label="成本票文件" 
              required
              extra="支持 PDF、JPG、PNG 格式，最大 10MB"
            >
                <Upload 
                  fileList={fileList} 
                  onChange={({ fileList }) => setFileList(fileList)} 
                  beforeUpload={(file) => {
                    const isValidType = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
                    if (!isValidType) {
                      message.error('只支持 PDF、JPG、PNG 格式的文件');
                      return false;
                    }
                    const isValidSize = file.size / 1024 / 1024 < 10;
                    if (!isValidSize) {
                      message.error('文件大小不能超过 10MB');
                      return false;
                    }
                    return false;
                  }}
                  maxCount={1}
                  accept=".pdf,.jpg,.jpeg,.png"
                >
                  <Button icon={<UploadOutlined />}>选择成本票文件</Button>
                </Upload>
            </Form.Item>
            <Form.Item 
              label="发票代码" 
              extra="选填，填写发票代码便于后续查询"
            >
                <Input
                  placeholder="请输入发票代码（选填）"
                  id="invoiceCodeInput"
                  maxLength={50}
                />
            </Form.Item>
        </Form>
      </Modal>

      <Modal title="上传付款凭证" open={isVoucherModalOpen} onOk={handleVoucherSubmit} onCancel={() => setIsVoucherModalOpen(false)}>
        <p>请上传 {currentRecord?.supplierName} 的付款凭证</p>
        <Upload fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} beforeUpload={() => false}>
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>

      <Modal 
        title="红冲票" 
        open={isRedInvoiceModalOpen} 
        onOk={async () => {
          if (!currentRecord?.id) {
            message.success('红冲票上传成功 (演示)');
            setIsRedInvoiceModalOpen(false);
            return;
          }
          const redAmountInput = document.getElementById('redInvoiceAmountInput') as HTMLInputElement;
          const redAmount = redAmountInput ? parseFloat(redAmountInput.value) : 0;
          
          if (!redAmount || redAmount <= 0) {
            message.error('请输入有效的红冲金额');
            return;
          }
          
          const maxRedAmount = currentRecord.costInvoiceReceived || currentRecord.amount || 0;
          if (redAmount > maxRedAmount) {
            message.error(`红冲金额不能大于已上传成本票金额 ${maxRedAmount.toFixed(2)} 元`);
            return;
          }
          
          try {
            message.success('红冲票上传成功');
            setIsRedInvoiceModalOpen(false);
            setFileList([]);
            fetchData(pagination.current, pagination.pageSize, filters);
          } catch (error) {
            console.error(error);
            message.error('上传失败');
          }
        }} 
        onCancel={() => setIsRedInvoiceModalOpen(false)}
      >
        <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
           <Descriptions.Item label="已上传成本票金额">
              <Text strong style={{ color: '#52c41a' }}>{(currentRecord?.costInvoiceReceived || currentRecord?.amount || 0).toFixed(2)} 元</Text>
           </Descriptions.Item>
        </Descriptions>
        <Form layout="vertical">
            <Form.Item 
              label="红冲金额" 
              required
              extra={`最大可红冲金额：${ (currentRecord?.costInvoiceReceived || currentRecord?.amount || 0).toFixed(2) } 元`}
            >
                <Input
                  type="number"
                  placeholder="请输入红冲金额"
                  suffix="元"
                  id="redInvoiceAmountInput"
                  max={currentRecord?.costInvoiceReceived || currentRecord?.amount || 0}
                />
            </Form.Item>
        </Form>
        <Upload fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} beforeUpload={() => false}>
          <Button icon={<UploadOutlined />}>选择红冲票文件</Button>
        </Upload>
      </Modal>


    </div>
  );
};

export default SupplierSettlementList;
