import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, message, Tooltip, Dropdown, Grid, Form, Upload, Modal } from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { EyeOutlined, ExportOutlined, MoreOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, PayCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getStatusLabel, getDisplayPaidAmount, validateAmountSymbol } from '../../utils/paymentValidation';
import { useExport } from '../../utils/exportUtils';

import { getSupplierSettlements, paySettlement } from '../../services/settlementService';

interface DataType {
  key: string;
  id?: number;
  settlementNo: string;
  supplierName: string;
  settlementType: 'Cash' | 'Prepayment';
  settlementCycle: string;
  costInvoiceStatus: 'Uploaded' | 'Pending';
  amount: number;
  paidAmount?: number;
  accountType: 'Company' | 'Personal';
  operator: string;
  applyDate: string;
  approvalStatus: 'Pending' | 'Approving' | 'Approved' | 'Rejected' | 'Revoked';
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | null;
  source?: 'Purchase' | 'Delivery'; // Add Source
}

const mockData: DataType[] = [
  // 1. 预付类型数据
  {
    key: '1',
    settlementNo: 'JS20231027001',
    supplierName: '苹果公司',
    settlementType: 'Prepayment',
    settlementCycle: '', 
    costInvoiceStatus: 'Uploaded',
    amount: 12000.00,
    paidAmount: 12000.00,
    accountType: 'Company',
    operator: 'John Doe',
    applyDate: '2023-10-27',
    approvalStatus: 'Approved',
    paymentStatus: 'Paid',
    source: 'Purchase'
  },
  // ... (Other mock data needs source)
  {
    key: '2',
    settlementNo: 'JS20231027002',
    supplierName: '三星电子',
    settlementType: 'Prepayment',
    settlementCycle: '', 
    costInvoiceStatus: 'Pending',
    amount: -5000.00, // 负数在预付中通常不常见，但作为测试用例保留
    paidAmount: 0,
    accountType: 'Company',
    operator: 'Jane Smith',
    applyDate: '2023-10-26',
    approvalStatus: 'Rejected',
    paymentStatus: null,
  },
  {
    key: '3',
    settlementNo: 'JS20231027003',
    supplierName: '小米科技',
    settlementType: 'Prepayment',
    settlementCycle: '', 
    costInvoiceStatus: 'Uploaded',
    amount: 0.00,
    paidAmount: 0,
    accountType: 'Company',
    operator: 'System',
    applyDate: '2023-10-25',
    approvalStatus: 'Pending',
    paymentStatus: null,
  },
  // 2. 现付类型数据
  {
    key: '4',
    settlementNo: 'JS20231027004',
    supplierName: '华为技术有限公司（这是一个非常长的供应商名称用于测试换行显示效果）',
    settlementType: 'Cash',
    settlementCycle: 'Monthly', 
    costInvoiceStatus: 'Uploaded',
    amount: 8000.00,
    paidAmount: 8000.00,
    accountType: 'Company',
    operator: 'John Doe',
    applyDate: '2023-10-27',
    approvalStatus: 'Approved',
    paymentStatus: 'Paid',
  },
  {
    key: '5',
    settlementNo: 'JS20231027005',
    supplierName: 'OPPO移动',
    settlementType: 'Cash',
    settlementCycle: 'Weekly', 
    costInvoiceStatus: 'Pending',
    amount: -200.00, // 退款/抵扣
    paidAmount: 0,
    accountType: 'Company',
    operator: 'Jane Smith',
    applyDate: '2023-10-26',
    approvalStatus: 'Rejected',
    paymentStatus: null,
  },
  {
    key: '6',
    settlementNo: 'JS20231027006',
    supplierName: 'VIVO通信',
    settlementType: 'Cash',
    settlementCycle: 'Daily', 
    costInvoiceStatus: 'Pending',
    amount: 0.00,
    paidAmount: 0,
    accountType: 'Personal',
    operator: 'System',
    applyDate: '2023-10-25',
    approvalStatus: 'Pending',
    paymentStatus: null,
    source: 'Purchase'
  },
  // 3. 配送单来源数据
  {
    key: '7',
    settlementNo: 'SET20231028001',
    supplierName: '顺丰速运',
    settlementType: 'Cash',
    settlementCycle: 'Monthly',
    costInvoiceStatus: 'Pending',
    amount: 1250.00,
    paidAmount: 0,
    accountType: 'Company',
    operator: 'System',
    applyDate: '2023-10-28',
    approvalStatus: 'Pending',
    paymentStatus: 'Pending',
    source: 'Delivery'
  },
  {
    key: '8',
    settlementNo: 'JS20231028002',
    supplierName: '圆通速递',
    settlementType: 'Cash',
    settlementCycle: 'Weekly',
    costInvoiceStatus: 'Uploaded',
    amount: 580.00,
    paidAmount: 580.00,
    accountType: 'Company',
    operator: 'System',
    applyDate: '2023-10-28',
    approvalStatus: 'Approved',
    paymentStatus: 'Paid',
    source: 'Delivery'
  }
];

const SupplierSettlementList: React.FC = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DataType[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<DataType | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [filters, setFilters] = useState<any>({ supplierName: '', settlementNo: '', approvalStatus: undefined, source: undefined });

  const { handleExport, exporting, progress } = useExport<DataType>({
    filenamePrefix: '供应商结算单列表',
    fetchData: () => data,
    columns: [
        { title: '结算单号', dataIndex: 'settlementNo' },
        { title: '来源', dataIndex: 'source', render: (val) => val === 'Delivery' ? '配送单' : '采购单' },
        { title: '供应商名称', dataIndex: 'supplierName' },
        { title: '结算周期', dataIndex: 'settlementCycle', render: (val, r) => r.settlementType === 'Prepayment' ? '-' : (val === 'Monthly' ? '月结' : (val === 'Weekly' ? '周结' : '日结')) },
        { title: '成本票状态', dataIndex: 'costInvoiceStatus', render: (val) => val === 'Uploaded' ? '已上传' : '未上传' },
        { title: '审批/已付金额', dataIndex: 'amount', render: (val) => val.toFixed(2) },
        { title: '账户类型', dataIndex: 'accountType', render: (val) => val === 'Company' ? '公司' : '个人' },
        { title: '操作人', dataIndex: 'operator', render: (val) => val === 'John Doe' ? '张三' : (val === 'Jane Smith' ? '李四' : val) },
        { title: '申请日期', dataIndex: 'applyDate' },
        { title: '审批状态', dataIndex: 'approvalStatus', render: (val) => {
            const map: any = { 'Pending': '待审批', 'Approving': '审批中', 'Approved': '已审批', 'Rejected': '已拒回', 'Revoked': '已撤销' };
            return map[val] || val;
        } },
        { title: '付款状态', dataIndex: 'paymentStatus', render: (val) => {
            if (!val) return '-';
            // Use simple logic for export text
            return val; 
        } },
    ]
  });

  // Safe Data Loading
  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize, filters);
  }, []);

  const fetchData = (page: number, pageSize: number, currentFilters: any) => {
    setLoading(true);
    setTimeout(async () => {
       try {
         const response: any = await getSupplierSettlements();
         const serviceData = response.records || [];
         const mappedServiceData: DataType[] = serviceData.map((s: any) => ({
             key: s.id.toString(),
             id: s.id,
             settlementNo: s.settlementNo,
             supplierName: s.supplier?.name || 'Unknown',
             settlementType: 'Cash', // Need from supplier
             settlementCycle: 'Monthly',
             costInvoiceStatus: 'Pending',
             amount: s.totalAmount,
             paidAmount: s.status === 'PAID' ? s.totalAmount : 0,
             accountType: 'Company',
             operator: s.createdBy,
             applyDate: s.createTime ? s.createTime.split('T')[0] : '-',
             approvalStatus: s.status as any,
             paymentStatus: s.status === 'PAID' ? 'Paid' : 'Pending',
             source: 'Purchase'
         }));

         const allData = [...mappedServiceData, ...mockData.map(d => ({...d, source: d.source || 'Purchase'}))];

         // Defensive filtering
         const safeFilters = currentFilters || {};
         let filteredData = allData.filter(item => {
            if (!item) return false;
            let match = true;
            if (safeFilters.supplierName && !item.supplierName?.includes(safeFilters.supplierName)) match = false;
            if (safeFilters.settlementNo && !item.settlementNo?.includes(safeFilters.settlementNo)) match = false;
            if (safeFilters.approvalStatus && item.approvalStatus !== safeFilters.approvalStatus) match = false;
            if (safeFilters.source && item.source !== safeFilters.source) match = false;
            return match;
         });

         const startIndex = (page - 1) * pageSize;
         const endIndex = startIndex + pageSize;
         const pageData = filteredData.slice(startIndex, endIndex); 
         
         setData(pageData); 
         setPagination({ ...pagination, current: page, total: filteredData.length });
       } catch (e) {
         console.error('Data load error:', e);
         message.error('数据加载失败，请刷新重试');
       } finally {
         setLoading(false);
       }
    }, 300);
  };

  const handleTableChange = (newPagination: any) => {
    fetchData(newPagination.current, newPagination.pageSize, filters);
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
    fetchData(1, pagination.pageSize, filters);
  };

  const handleReset = () => {
    const newFilters = { supplierName: '', settlementNo: '', approvalStatus: undefined };
    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
    fetchData(1, pagination.pageSize, newFilters);
  };

  // Mock System Accounts
  const systemAccounts = [
    { label: '主营账户 (工商银行 8888)', value: 'ICBC_8888', isDefault: true },
    { label: '副营账户 (招商银行 6666)', value: 'CMB_6666', isDefault: false },
  ];
  
  const defaultSystemAccount = systemAccounts.find(acc => acc.isDefault);

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

  const dummyRequest = ({ onSuccess }: any) => {
    setTimeout(() => {
      onSuccess("ok");
    }, 1000);
  };

  const getActionItems = (record: DataType): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        label: '查看详情',
        icon: <EyeOutlined />,
        onClick: () => {
            if (record.settlementType === 'Prepayment') {
                navigate(`/supply-chain/supplier-settlement/prepayment-detail/${record.key}`);
            } else {
                navigate(`/supply-chain/supplier-settlement/detail/${record.key}`);
            }
        }
      }
    ];

    if (record.amount > 0) {
      items.push({
        key: 'upload_invoice',
        label: record.settlementType === 'Prepayment' ? '上传下单凭证' : '上传成本票',
        icon: <UploadOutlined />,
        onClick: () => { setCurrentRecord(record); setIsModalOpen(true); }
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

    items.push({
        key: 'delete',
        label: '删除',
        danger: true,
        icon: <DeleteOutlined />,
        onClick: () => { message.success('删除成功 (演示)'); }
    });

    return items;
  };

  const handleInvoiceSubmit = () => {
      message.success('成本票上传成功 (演示)');
      setIsModalOpen(false);
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
          const typeMap: Record<string, string> = {
              'Cash': '现付',
              'Prepayment': '预付'
          };
          let color = 'blue';
          if (type === 'Prepayment') color = 'orange';
          return <Tag color={color}>{typeMap[type] || type}</Tag>;
      }
    },
    { 
      title: '结算周期', 
      dataIndex: 'settlementCycle', 
      key: 'settlementCycle',
      width: 90,
      render: (text: string, record) => {
        if (record.settlementType === 'Prepayment') {
            return '-';
        }
        const cycleMap: Record<string, string> = {
          'Monthly': '月结',
          'Weekly': '周结',
          'Daily': '日结'
        };
        return cycleMap[text] || text || '-';
      }
    },
    {
      title: '成本票',
      dataIndex: 'costInvoiceStatus',
      key: 'costInvoiceStatus',
      width: 100,
      render: (status) => (
        <Tag color={status === 'Uploaded' ? 'green' : 'orange'}>
          {status === 'Uploaded' ? '已上传' : '未上传'}
        </Tag>
      ),
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
      title: '账户',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 80,
      render: (type) => type === 'Company' ? '公司' : '个人',
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
      title: '审批',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 90,
      render: (status, record) => {
        if (record.settlementType === 'Prepayment') {
           return <Tag color="green">已审批</Tag>;
        }
        const colors: Record<string, string> = {
          Pending: 'blue',
          Approving: 'cyan',
          Approved: 'green',
          Rejected: 'red',
          Revoked: 'default',
        };
        const labels: Record<string, string> = {
          Pending: '待审批',
          Approving: '审批中',
          Approved: '已审批',
          Rejected: '已拒回',
          Revoked: '已撤销',
        };
        const color = (status && colors[status]) ? colors[status] : 'default';
        const label = (status && labels[status]) ? labels[status] : (status || '-');
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '付款状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 100,
      render: (status, record) => {
        if (record.settlementType === 'Prepayment') {
           return <Tag color="green">预付扣款</Tag>;
        }
        if (record.approvalStatus !== 'Approved') return '-';
        if (!status) return '-';

        if (!validateAmountSymbol(record.amount)) {
            return <Tag color="red">金额异常</Tag>;
        }

        const label = getStatusLabel(record.amount, status);
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
   - 申请日期、审批状态、付款状态。
   - **操作人**：显示中文姓名（数据来源：用户管理系统）。

2. **操作功能**：
   - **查看详情**：进入详情页。
   - **上传成本票**：支持上传 PDF/图片，状态变为“已上传”。
   - **上传付款凭证**：当审批金额为负数时自动显示。`}
        fields={[
          { name: 'settlementNo', type: 'String', length: '32', required: true, unique: true, desc: '结算单号' },
          { name: 'amount', type: 'Decimal', length: '10,2', required: true, defaultValue: '0.00', desc: '结算金额' },
        ]}
      />
      <Form layout="inline" style={{ marginBottom: 24 }}>
         <Form.Item label="供应商名称">
            <Input placeholder="请输入" value={filters.supplierName} onChange={e => setFilters({ ...filters, supplierName: e.target.value })} />
         </Form.Item>
         <Form.Item label="结算单号">
            <Input placeholder="请输入" value={filters.settlementNo} onChange={e => setFilters({ ...filters, settlementNo: e.target.value })} />
         </Form.Item>
         <Form.Item label="来源">
            <Select 
                placeholder="请选择" 
                style={{ width: 120 }} 
                allowClear 
                value={filters.source} 
                onChange={val => setFilters({ ...filters, source: val })}
            >
               <Select.Option value="Purchase">采购单</Select.Option>
               <Select.Option value="Delivery">配送单</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item label="审批状态">
            <Select 
                placeholder="请选择" 
                style={{ width: 120 }} 
                allowClear 
                value={filters.approvalStatus} 
                onChange={val => setFilters({ ...filters, approvalStatus: val })}
            >
               <Select.Option value="Pending">待审批</Select.Option>
               <Select.Option value="Approved">已审批</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item>
            <Space>
               <Button type="primary" onClick={handleSearch}>查询</Button>
               <Button onClick={handleReset}>重置</Button>
            </Space>
         </Form.Item>
      </Form>

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
        <p>请上传 {currentRecord?.supplierName} 的成本发票</p>
        <Upload fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} beforeUpload={() => false}>
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>

      <Modal title="上传付款凭证" open={isVoucherModalOpen} onOk={handleVoucherSubmit} onCancel={() => setIsVoucherModalOpen(false)}>
        <p>请上传 {currentRecord?.supplierName} 的付款凭证</p>
        <Upload fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} beforeUpload={() => false}>
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>
    </div>
  );
};

export default SupplierSettlementList;
