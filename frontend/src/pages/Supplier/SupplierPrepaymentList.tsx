import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, message, Breadcrumb, DatePicker, Select, Modal, Form, Upload, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, FileTextOutlined, UploadOutlined, UndoOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';

interface PrepaymentApplyItem {
  key: string;
  id: string; // YF+...
  appliedAmount: number;
  paidAmount: number;
  lastPaymentTime: string;
  applyTime: string;
  applicant: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
}

const mockData: PrepaymentApplyItem[] = [
  {
    key: '1',
    id: 'YF20231001103001',
    appliedAmount: 50000.00,
    paidAmount: 50000.00,
    lastPaymentTime: '2023-10-01 10:00:00',
    applyTime: '2023-09-30 14:20:00',
    applicant: '张三',
    status: 'Paid',
  },
  {
    key: '2',
    id: 'YF20231005142002',
    appliedAmount: 20000.00,
    paidAmount: 0.00,
    lastPaymentTime: '-',
    applyTime: '2023-10-05 09:15:30',
    applicant: '李四',
    status: 'Pending',
  }
];

const SupplierPrepaymentList: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<PrepaymentApplyItem[]>(mockData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Mock supplier info (In real app, fetch by id)
  const supplierInfo = {
    name: '上海晨光文具销售有限公司',
    account: '622202...',
    bank: '中国工商银行',
    payerName: '我的企业',
    payerAccount: '1234567890',
    payerBank: '招商银行'
  };

  const handleAdd = () => {
    setIsModalOpen(true);
    form.setFieldsValue({
      payerName: supplierInfo.payerName,
      payerAccount: supplierInfo.payerAccount,
      payerBank: supplierInfo.payerBank,
      payee: supplierInfo.name,
      account: supplierInfo.account,
      payeeBank: supplierInfo.bank,
    });
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      const newId = `YF${new Date().toISOString().slice(0,10).replace(/-/g,'')}${new Date().getHours()}${new Date().getMinutes()}0${data.length + 1}`;
      const newItem: PrepaymentApplyItem = {
        key: Date.now().toString(),
        id: newId,
        appliedAmount: values.amount,
        paidAmount: 0,
        lastPaymentTime: '-',
        applyTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        applicant: '当前用户',
        status: 'Pending',
      };
      setData([newItem, ...data]);
      setIsModalOpen(false);
      form.resetFields();
      message.success('预付款申请已提交');
    });
  };

  const columns: ColumnsType<PrepaymentApplyItem> = [
    { title: '预付款单号', dataIndex: 'id', key: 'id' },
    { 
      title: '申请金额', 
      dataIndex: 'appliedAmount', 
      key: 'appliedAmount',
      render: (val) => `¥${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    },
    { 
      title: '实付金额', 
      dataIndex: 'paidAmount', 
      key: 'paidAmount',
      render: (val) => `¥${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    },
    { title: '申请日期', dataIndex: 'applyTime', key: 'applyTime' },
    { title: '最后付款时间', dataIndex: 'lastPaymentTime', key: 'lastPaymentTime' },
    { title: '申请人', dataIndex: 'applicant', key: 'applicant' },
    { 
      title: '审批状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        const colorMap: Record<string, string> = {
          Pending: 'orange',
          Approved: 'blue',
          Rejected: 'red',
          Paid: 'green'
        };
        const textMap: Record<string, string> = {
          Pending: '待审批',
          Approved: '待付款',
          Rejected: '已驳回',
          Paid: '已付款'
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => navigate(`/supply-chain/supplier/prepayment-detail/${record.id}`)}>
          查看详情
        </Button>
      )
    }
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 供应商管理 > 预付款审批列表"
        description="管理供应商的预付款申请及审批流程。支持按单号、付款日期、申请人及审批状态进行组合搜索。"
        fields={[
           { name: 'id', type: 'String', desc: '预付款单号 (YF+年月日时分+两位顺序号)', required: false },
           { name: 'appliedAmount', type: 'Decimal', desc: '申请金额' },
           { name: 'lastPaymentTime', type: 'DateTime', desc: '最后付款时间：自动获取该单据关联的最近一次付款时间' },
           { name: 'status', type: 'Enum', desc: '状态：待审批、待付款、已付款、已驳回' }
        ]}
      />

      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/supplier')}>供应商管理</a> },
         { title: '预付款审批列表' }
      ]} />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增预付款</Button>
          <Button icon={<FileTextOutlined />} onClick={() => navigate(`/supply-chain/supplier/prepayment-log/${id}`)}>查看资金流水</Button>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        onRow={(record) => {
          return {
            onClick: () => {
              navigate(`/supply-chain/supplier/prepayment-detail/${record.id}`);
            },
            style: { cursor: 'pointer' }
          };
        }}
      />

      <Modal
        title="新增预付款申请"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
             <Col span={8}>
                <Form.Item name="payerName" label="付款方名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
             </Col>
             <Col span={8}>
                <Form.Item name="payerAccount" label="付款账号" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
             </Col>
             <Col span={8}>
                <Form.Item name="payerBank" label="开户行" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
             </Col>
          </Row>

          <Row gutter={16}>
             <Col span={8}>
                <Form.Item name="payee" label="收款方名称" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
             </Col>
             <Col span={8}>
                <Form.Item name="account" label="收款账号" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
             </Col>
             <Col span={8}>
                <Form.Item name="payeeBank" label="开户行" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
             </Col>
          </Row>

          <Form.Item name="amount" label="申请金额" rules={[{ required: true }]}>
             <Input 
                prefix="¥" 
                type="number"
                placeholder="请输入申请金额" 
             />
          </Form.Item>
          
          <Form.Item 
            name="invoice" 
            label="成本票/附件" 
            valuePropName="fileList"
            getValueFromEvent={(e) => {
                if (Array.isArray(e)) return e;
                return e?.fileList;
            }}
          >
            <Upload action="/upload.do" listType="picture" maxCount={5}>
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="note" label="申请备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupplierPrepaymentList;