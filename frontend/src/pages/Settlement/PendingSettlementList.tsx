import React from 'react';
import { Table, Button, Input, Select, Space, Tag, Form, Row, Col, Modal, message, Tooltip, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, PayCircleOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';

interface PendingSettlementType {
  key: string;
  poNo: string;
  changeType: 'OrderPurchase' | 'Replenishment' | 'Refund' | 'PriceAdjust';
  bizNo: string;
  spec: string;
  changeTime: string;
  amount: number;
  supplier: string;
  settlementType: 'Cash' | 'Prepayment';
  cycle: string;
}

const mockData: PendingSettlementType[] = [
  {
    key: '1',
    poNo: 'C231027001001',
    changeType: 'OrderPurchase',
    bizNo: '-',
    spec: '晨光A4打印纸 70g',
    changeTime: '2023-10-27 10:00',
    amount: 1800.00,
    supplier: '晨光文具',
    settlementType: 'Cash',
    cycle: '月结',
  },
  {
    key: '2',
    poNo: 'C231027001001',
    changeType: 'Refund',
    bizNo: 'REF20231029001',
    spec: '晨光A4打印纸 70g',
    changeTime: '2023-10-29 14:00',
    amount: -180.00,
    supplier: '晨光文具',
    settlementType: 'Cash',
    cycle: '月结',
  },
  {
    key: '3',
    poNo: 'C231027002005',
    changeType: 'Replenishment',
    bizNo: 'REP20231030005',
    spec: '得力黑色中性笔 0.5mm',
    changeTime: '2023-10-30 09:30',
    amount: 500.00,
    supplier: '得力集团',
    settlementType: 'Cash',
    cycle: '周结',
  },
  {
    key: '4',
    poNo: 'C231027003008',
    changeType: 'PriceAdjust',
    bizNo: 'ADJ20231101002',
    spec: 'HP打印机 M126a',
    changeTime: '2023-11-01 11:15',
    amount: -50.00,
    supplier: '惠普中国',
    settlementType: 'Prepayment',
    cycle: '',
  },
  {
    key: '5',
    poNo: 'C231027004012',
    changeType: 'OrderPurchase',
    bizNo: '-',
    spec: '齐心文件夹 A4蓝',
    changeTime: '2023-11-02 14:20',
    amount: 2000.00,
    supplier: '齐心办公',
    settlementType: 'Prepayment',
    cycle: '',
  },
];

const PendingSettlementList: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = React.useState<PendingSettlementType[]>([]);
  const [dataSource, setDataSource] = React.useState<PendingSettlementType[]>(mockData);
  const [loading, setLoading] = React.useState(false);

  const handleSettle = () => {
     Modal.confirm({
        title: '确认发起结算?',
        content: '将为选中的记录生成结算单',
        onOk: () => {
           navigate('/supply-chain/supplier-settlement');
        }
     });
  };

  const { handleExport, exporting, progress } = useExport<PendingSettlementType>({
    filenamePrefix: '待结算采购单列表',
    fetchData: () => mockData,
    columns: [
        { title: '采购单号', dataIndex: 'poNo' },
        { title: '变动类型', dataIndex: 'changeType', render: (val) => {
            const map: Record<string, string> = {
                'OrderPurchase': '订单采购',
                'Replenishment': '补货采购',
                'Refund': '供应商退款',
                'PriceAdjust': '成本调价'
            };
            return map[val] || val;
        }},
        { title: '业务单号', dataIndex: 'bizNo' },
        { title: '商品规格', dataIndex: 'spec' },
        { title: '变动时间', dataIndex: 'changeTime' },
        { title: '应结算金额', dataIndex: 'amount', render: (val) => val.toFixed(2) },
        { title: '供应商名称', dataIndex: 'supplier' },
        { title: '结算类型', dataIndex: 'settlementType', render: (val) => val === 'Prepayment' ? '预付' : '现付' },
        { title: '结算周期', dataIndex: 'cycle', render: (val, record) => record.settlementType === 'Prepayment' ? '-' : val },
    ]
  });

  const columns: ColumnsType<PendingSettlementType> = [
    { title: '采购单号', dataIndex: 'poNo', key: 'poNo' },
    { 
       title: '变动类型', 
       dataIndex: 'changeType', 
       key: 'changeType',
       render: (val) => {
       const map: Record<string, string> = {
          'OrderPurchase': '订单采购',
          'Replenishment': '补货采购',
          'Refund': '供应商退款',
          'PriceAdjust': '成本调价'
       };
       return <Tag>{map[val] || val}</Tag>;
    }
    },
    { title: '业务单号', dataIndex: 'bizNo', key: 'bizNo' },
    { title: '商品规格', dataIndex: 'spec', key: 'spec' },
    { title: '变动时间', dataIndex: 'changeTime', key: 'changeTime' },
    { title: '应结算金额', dataIndex: 'amount', key: 'amount', render: (v) => <span style={{color: v>=0?'black':'red'}}>¥{v.toFixed(2)}</span> },
    { title: '供应商名称', dataIndex: 'supplier', key: 'supplier' },
    { 
      title: '结算类型', 
      dataIndex: 'settlementType', 
      key: 'settlementType',
      render: (val) => (
         <Tag color={val === 'Prepayment' ? 'orange' : 'blue'}>
            {val === 'Prepayment' ? '预付' : '现付'}
         </Tag>
      )
    },
    { 
      title: '结算周期', 
      dataIndex: 'cycle', 
      key: 'cycle',
      render: (val, record) => {
         if (record.settlementType === 'Prepayment') {
            return '-';
         }
         return val;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/supply-chain/purchase-order/detail/${record.key}`)}>采购单详情</Button>
          <Button type="link" size="small" icon={<PayCircleOutlined />} onClick={handleSettle}>发起结算</Button>
        </Space>
      ),
    },
  ];

  const [manualForm] = Form.useForm();
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [payeeAccountMode, setPayeeAccountMode] = React.useState<'default' | 'select' | 'manual'>('manual');

  // Mock System Accounts (Same as SupplierSettlementList)
  const systemAccounts = [
    { label: '主营账户 (工商银行 8888)', value: 'ICBC_8888', isDefault: true, bank: '中国工商银行', no: '88888888' },
    { label: '副营账户 (招商银行 6666)', value: 'CMB_6666', isDefault: false, bank: '招商银行', no: '66666666' },
  ];

  const handleManualSettleSubmit = () => {
     manualForm.validateFields().then(values => {
        console.log('Manual Settlement:', values);
        message.success('手动结算单已生成');
        setIsManualModalOpen(false);
        manualForm.resetFields();
     });
  };

  const handleManualSettle = () => {
     setIsManualModalOpen(true);
     setPayeeAccountMode('manual');
     // Reset with some defaults if needed, or clear
     manualForm.resetFields();
     manualForm.setFieldsValue({
        amount: 0
     });
  };

  const onPayeeModeChange = (mode: 'default' | 'select' | 'manual') => {
      setPayeeAccountMode(mode);
      if (mode === 'default') {
          const def = systemAccounts.find(a => a.isDefault);
          if (def) {
              manualForm.setFieldsValue({
                  accountName: def.label,
                  bankName: def.bank,
                  accountNo: def.no
              });
          }
      } else if (mode === 'select') {
          manualForm.setFieldsValue({
              accountName: undefined,
              bankName: undefined,
              accountNo: undefined
          });
      } else {
          manualForm.setFieldsValue({
              accountName: '',
              bankName: '',
              accountNo: ''
          });
      }
  };

  const onSystemAccountSelect = (val: string) => {
      const acc = systemAccounts.find(a => a.value === val);
      if (acc) {
          manualForm.setFieldsValue({
              accountName: acc.label,
              bankName: acc.bank,
              accountNo: acc.no
          });
      }
  };

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 待结算采购单列表 > 待结算采购单列表"
        description={`待结算采购单列表页。

1. **列表字段**：
   - 采购单号、变动类型（订单/补货/退款/调价）。
   - 业务单号（退款单/调价单号）。
   - 商品规格、变动时间、应结算金额。
   - 供应商名称、结算周期。

2. **操作功能**：
   - **查询**：支持采购单号、变动时间、供应商等筛选。
   - **采购单详情**：跳转查看详情。
   - **发起结算**：生成供应商结算单（支持批量）。
     - 批量时按供应商拆分结算单。
   - **手动生成结算单**：处理非业务流程产生的结算。
     - 需填写供应商、账户、金额（正负）、备注。

3. **异常处理**：
   - **发起失败**：若未选中任何记录，提示“请先选择待结算记录”。
   - **重复发起**：若选中的记录已生成结算单（并发场景），提示“部分记录已结算，请刷新页面”。
   - **金额校验**：手动生成结算单时，若金额格式错误或为0，提示“请输入有效的结算金额”。`}
        fields={[
          { name: 'poNo', type: 'String', length: '32', required: true, unique: true, desc: '采购单号' },
          { name: 'changeType', type: 'Enum', required: true, defaultValue: '-', desc: '变动类型：OrderPurchase, Replenishment, Refund, PriceAdjust' },
          { name: 'amount', type: 'Decimal', length: '10,2', required: true, defaultValue: '0.00', desc: '应结算金额' },
        ]}
        flowchart={`graph TD
    A[已确认采购订单] --> B[待结算列表]
    B -- 批量发起 --> C[生成供应商结算单]
    D[手动生成] --> C`}
      />
      <Form layout="inline" style={{ marginBottom: 24 }}>
         {/* ... existing filters ... */}
         <Row gutter={[16, 16]}>
            <Col>
              <Form.Item label="采购单号">
                 <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="供应商">
                 <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col>
               <Space>
                  <Button type="primary">查询</Button>
                  <Button>重置</Button>
               </Space>
            </Col>
         </Row>
      </Form>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
         <Space>
            <Button type="primary" onClick={handleSettle}>批量发起结算</Button>
            <Button onClick={handleManualSettle}>手动生成结算单</Button>
         </Space>
         <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
            <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
            </Button>
         </Tooltip>
      </div>

      <Table 
         rowSelection={{ 
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys, rows) => {
                setSelectedRowKeys(keys);
                setSelectedRows(rows);
            }
         }}
         columns={columns} 
         dataSource={dataSource} 
         loading={loading}
      />
      
      <Modal
         title="手动生成结算单"
         open={isManualModalOpen}
         onOk={handleManualSettleSubmit}
         onCancel={() => setIsManualModalOpen(false)}
         okText="提交"
         width={600}
      >
         <Form form={manualForm} layout="vertical">
            <Row gutter={16}>
               <Col span={12}>
                  <Form.Item name="poNo" label="采购单号" rules={[{ required: true, message: '请输入采购单号' }]}>
                     <Input placeholder="请输入采购单号" />
                  </Form.Item>
               </Col>
               <Col span={12}>
                  <Form.Item name="supplier" label="供应商名称" rules={[{ required: true, message: '请输入供应商' }]}>
                     <Input placeholder="请输入供应商" />
                  </Form.Item>
               </Col>
            </Row>
            <Row gutter={16}>
               <Col span={24}>
                  <Form.Item label="收款账户设置">
                     <Space>
                        <Select value={payeeAccountMode} onChange={onPayeeModeChange} style={{ width: 150 }}>
                            <Select.Option value="default">使用默认账户</Select.Option>
                            <Select.Option value="select">选择已有账户</Select.Option>
                            <Select.Option value="manual">手动填写</Select.Option>
                        </Select>
                        {payeeAccountMode === 'select' && (
                            <Select style={{ width: 200 }} placeholder="请选择账户" onChange={onSystemAccountSelect}>
                                {systemAccounts.map(a => <Select.Option key={a.value} value={a.value}>{a.label}</Select.Option>)}
                            </Select>
                        )}
                     </Space>
                  </Form.Item>
               </Col>
            </Row>
            <Row gutter={16}>
               <Col span={12}>
                  <Form.Item name="accountName" label="收款开户名" rules={[{ required: true }]}>
                     <Input disabled={payeeAccountMode !== 'manual'} />
                  </Form.Item>
               </Col>
               <Col span={12}>
                  <Form.Item name="bankName" label="开户行" rules={[{ required: true }]}>
                     <Input disabled={payeeAccountMode !== 'manual'} />
                  </Form.Item>
               </Col>
            </Row>
            <Row gutter={16}>
               <Col span={12}>
                  <Form.Item name="accountNo" label="收款账号" rules={[{ required: true }]}>
                     <Input disabled={payeeAccountMode !== 'manual'} />
                  </Form.Item>
               </Col>
               <Col span={12}>
                  <Form.Item name="amount" label="结算金额 (正数付款/负数收款)" rules={[{ required: true, message: '请输入金额' }]}>
                     <InputNumber 
                        style={{ width: '100%' }} 
                        formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value!.replace(/\¥\s?|(,*)/g, '')}
                     />
                  </Form.Item>
               </Col>
            </Row>
            <Form.Item name="remark" label="备注">
               <Input.TextArea rows={2} />
            </Form.Item>
         </Form>
      </Modal>
    </div>
  );
};

export default PendingSettlementList;
