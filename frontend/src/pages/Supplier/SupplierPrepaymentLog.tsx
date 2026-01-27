import React, { useState } from 'react';
import { Table, Button, Input, Modal, Form, Tag, Descriptions, Space, message, Breadcrumb, Progress } from 'antd';
import { FileTextOutlined, PayCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';
import { PrepaymentLogItem } from '../../types/supplier';

const mockLogs: PrepaymentLogItem[] = [
  {
    key: '1',
    id: 'PRE20231001001',
    type: 'Income',
    approvedAmount: 50000,
    actualAmount: 50000,
    date: '2023-10-01 10:00:00',
    status: 'Approved',
    note: 'Initial deposit'
  },
  {
    key: '2',
    id: 'PAY20231005001',
    type: 'Expense',
    approvedAmount: 2000,
    actualAmount: -2000,
    date: '2023-10-05 14:30:00',
    status: 'Approved',
    note: 'Purchase Order #PO123'
  }
];

const SupplierPrepaymentLog: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<PrepaymentLogItem[]>(mockLogs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Mock export data generator
  const generateMockExportData = (count: number) => {
    const data = [];
    const baseDate = new Date();
    for (let i = 0; i < count; i++) {
        const poDate = new Date(baseDate.getTime() - i * 86400000);
        data.push({
            prepaymentSettlementNo: `PS${poDate.getFullYear()}${(poDate.getMonth()+1).toString().padStart(2, '0')}${i.toString().padStart(4, '0')}`,
            project: `Project ${String.fromCharCode(65 + (i % 26))}`,
            purchaseOrderNo: `PO${poDate.getFullYear()}${(poDate.getMonth()+1).toString().padStart(2, '0')}${poDate.getDate().toString().padStart(2, '0')}${i.toString().padStart(4, '0')}`,
            businessType: i % 10 === 0 ? '退款单' : (i % 20 === 0 ? '成本调价' : '订单采购'),
            relatedBusinessNo: `BIZ${i}`,
            thirdPartySubOrderNo: `TP${i}`,
            product: `Product Name ${i}`,
            spec: `Spec ${i}`,
            quantity: (Math.random() * 100).toFixed(2),
            costUnitPrice: (Math.random() * 50).toFixed(2),
            totalCost: (Math.random() * 5000).toFixed(2),
            poCreateDate: poDate.toLocaleString(),
            thirdPartyOrderDate: new Date(poDate.getTime() - 3600000).toLocaleString(),
            poCreator: `User ${i % 5}`
        });
    }
    return data;
  };

  const { handleExport, exporting, progress } = useExport({
    filenamePrefix: '预付款结算明细',
    fetchData: async () => generateMockExportData(1000), // Generate 1000 rows for export
    columns: [
        { title: '预付款结算单号', dataIndex: 'prepaymentSettlementNo' },
        { title: '归属项目', dataIndex: 'project' },
        { title: '采购单号', dataIndex: 'purchaseOrderNo' },
        { title: '业务类型', dataIndex: 'businessType' },
        { title: '对应业务单号', dataIndex: 'relatedBusinessNo' },
        { title: '三方子订单号', dataIndex: 'thirdPartySubOrderNo' },
        { title: '商品', dataIndex: 'product' },
        { title: '规格', dataIndex: 'spec' },
        { title: '数量', dataIndex: 'quantity' },
        { title: '成本单价', dataIndex: 'costUnitPrice' },
        { title: '成本合计', dataIndex: 'totalCost' },
        { title: '采购单生成日期', dataIndex: 'poCreateDate' },
        { title: '三方订单下单日期', dataIndex: 'thirdPartyOrderDate' },
        { title: '采购单下单人', dataIndex: 'poCreator' },
    ]
  });

  // Calculate statistics from logs
  const { totalPrepayment, totalSettlement, currentBalance } = React.useMemo(() => {
    let prepay = 0;
    let settle = 0;
    logs.forEach(log => {
      if (log.status === 'Approved') {
        if (log.type === 'Income') {
          prepay += log.actualAmount;
        } else if (log.type === 'Expense') {
          settle += Math.abs(log.actualAmount);
        }
      }
    });
    return {
      totalPrepayment: prepay,
      totalSettlement: settle,
      currentBalance: prepay - settle
    };
  }, [logs]);

  // Mock Supplier Info with Limits and Warning
  const supplierInfo = {
    name: '上海晨光文具销售有限公司',
    account: '6222021001122334455',
    bank: '中国工商银行',
    prepaymentWarning: 5000, // Balance warning threshold
    purchaser: '李采购',
    purchaserId: '10086' // Purchaser ID for notification
  };

  // Mock Platform Default Account
  const platformAccount = {
    name: '我的企业供应链管理部',
    account: '8800123456789001',
    bank: '招商银行上海分行营业部'
  };

  const handleSimulateSettlement = () => {
      const expenseAmount = 5000;
      const newBalance = currentBalance - expenseAmount;
      
      Modal.confirm({
          title: '模拟供应商结算',
          content: `将扣除 ¥${expenseAmount} 用于支付货款，当前余额 ¥${currentBalance} -> ¥${newBalance}`,
          onOk: () => {
              const newLog: PrepaymentLogItem = {
                  key: Date.now().toString(),
                  id: `PAY${new Date().toISOString().slice(0,10).replace(/-/g,'')}00${logs.length + 1}`,
                  type: 'Expense',
                  approvedAmount: expenseAmount,
                  actualAmount: -expenseAmount,
                  date: new Date().toLocaleString(),
                  status: 'Approved',
                  note: 'Simulated Settlement'
              };
              setLogs([newLog, ...logs]);
              message.success('结算成功');

              // Check Warning
              if (newBalance < supplierInfo.prepaymentWarning) {
                  message.warning({
                      content: '余额低于预警值，已自动发送企业微信提醒给采购负责人',
                      duration: 5
                  });
              }
          }
      });
  };

  const columns: ColumnsType<PrepaymentLogItem> = [
    { title: '单号', dataIndex: 'id', key: 'id' },
    { 
      title: '收支类型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type) => (
        <Tag color={type === 'Income' ? 'green' : 'blue'}>
          {type === 'Income' ? '新增预付款' : '供应商结算'}
        </Tag>
      )
    },
    { 
      title: '审批金额', 
      dataIndex: 'approvedAmount', 
      key: 'approvedAmount',
      render: (val) => `¥${val.toLocaleString()}`
    },
    { 
      title: '实际金额', 
      dataIndex: 'actualAmount', 
      key: 'actualAmount',
      render: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
          {val >= 0 ? '+' : ''}{val.toLocaleString()}
        </span>
      )
    },
    { title: '变动时间', dataIndex: 'date', key: 'date' },
    { 
        title: '状态', 
        dataIndex: 'status', 
        key: 'status',
        render: (status) => {
        const colors: Record<string, string> = { Pending: 'orange', Approved: 'green', Rejected: 'red' };
        const texts: Record<string, string> = { Pending: '待审批', Approved: '已生效', Rejected: '已驳回' };
        return <Tag color={colors[status]}>{texts[status]}</Tag>;
    }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" size="small" icon={<FileTextOutlined />}>查看详情</Button>
      )
    }
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
        <PageDoc 
        pageTitle="供应链管理 > 供应商管理 > 预付款流水"
        description={`供应商预付款资金流水记录页面。
1. **列表字段**：
   - **单号**：业务单据编号。
   - **收支类型**：
     - **新增预付款**：企业向供应商打款充值（收入，正数）。
     - **供应商结算**：使用预付款支付货款（支出，负数）。
   - **金额信息**：审批金额（申请时金额）、实际金额（实际发生金额）。
   - **变动时间**：资金实际变动的时间。

2. **操作功能**：
   - **余额预警**：当预付款余额低于设定阈值时，系统自动发送企业微信消息提醒采购负责人。
   - *注：新增预付款功能已迁移至[预付款管理]模块。*

3. **数据权限**：
   - 仅"预付"类型的供应商可见此页面。`}
        fields={[
          { name: 'amount', type: 'Decimal', required: true, desc: '充值金额' },
        ]}
      />
      
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/supplier')}>供应商管理</a> },
         { title: '预付款流水' }
      ]} />

      <Descriptions title="供应商信息" bordered column={3} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="供应商名称">{supplierInfo.name}</Descriptions.Item>
        <Descriptions.Item label="当前账户">{supplierInfo.account}</Descriptions.Item>
        <Descriptions.Item label="余额预警值">¥{supplierInfo.prepaymentWarning.toLocaleString()}</Descriptions.Item>
        
        <Descriptions.Item label="累计预付金额">
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                ¥{totalPrepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </Descriptions.Item>
        <Descriptions.Item label="累计结算金额">
            <span style={{ color: '#faad14', fontWeight: 'bold' }}>
                ¥{totalSettlement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </Descriptions.Item>
        <Descriptions.Item label="预付款余额">
            <span style={{ color: currentBalance < supplierInfo.prepaymentWarning ? '#ff4d4f' : '#1677ff', fontSize: 18, fontWeight: 'bold' }}>
                ¥{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {currentBalance < supplierInfo.prepaymentWarning && <Tag color="error" style={{ marginLeft: 8 }}>低于预警值</Tag>}
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginBottom: 16 }}>
        <Space>
            <Button icon={<PayCircleOutlined />} onClick={handleSimulateSettlement}>
                模拟结算(触发预警)
            </Button>
            <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport} 
                loading={exporting}
            >
                {exporting ? `正在导出 (${progress}%)` : '导出结算明细'}
            </Button>
        </Space>
      </div>

      {exporting && (
        <div style={{ marginBottom: 16 }}>
             <Progress percent={progress} status="active" />
        </div>
      )}

      <Table columns={columns} dataSource={logs} />
    </div>
  );
};

export default SupplierPrepaymentLog;
