import React, { useState, useEffect } from 'react';
import { Descriptions, Card, Steps, Button, Space, Tag, Image, Timeline, Breadcrumb, Divider, message, Modal, Input, Table, Avatar, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PayCircleOutlined, UserOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';

// Define types
interface PaymentVoucher {
  name: string;
  url: string;
}

interface PaymentRecord {
  slipNo: string;
  amount: number;
  paymentTime: string;
  vouchers: PaymentVoucher[];
}

interface DetailData {
  id: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected' | 'PartiallyPaid';
  businessType: string;
  payer: { name: string; bank: string; account: string };
  payee: { name: string; bank: string; account: string };
  contact: { name: string; phone: string };
  amount: { applied: number; actual: number; unpaid: number };
  attachments: { name: string; url: string }[];
  logs: { time: string; user: string; action: string; comment: string }[];
  paymentRecords: PaymentRecord[];
}

// Mock Database
const MOCK_DB: Record<string, DetailData> = {
  'YF20231001103001': {
    id: 'YF20231001103001',
    status: 'Paid',
    businessType: '供应商预付款',
    payer: { name: '我的企业', bank: '招商银行', account: '1234567890' },
    payee: { name: '上海晨光文具销售有限公司', bank: '中国工商银行', account: '6222020000000001' },
    contact: { name: '张经理', phone: '13800138000' },
    amount: { applied: 50000.00, actual: 50000.00, unpaid: 0.00 },
    attachments: [
      { name: 'contract_signed.pdf', url: 'https://via.placeholder.com/150?text=Contract' },
    ],
    logs: [
      { time: '2023-09-30 14:20:00', user: '张三', action: '发起审批', comment: '季度大额预付款' },
      { time: '2023-09-30 15:30:00', user: '王财务', action: '财务确认', comment: '同意' },
      { time: '2023-10-01 10:00:00', user: '李出纳', action: '出纳付款', comment: '全额支付完成' }
    ],
    paymentRecords: [
      {
        slipNo: 'SLIP20231001001',
        amount: 50000.00,
        paymentTime: '2023-10-01 10:00:00',
        vouchers: [
          { name: '银行回单-001.jpg', url: 'https://via.placeholder.com/300?text=BankSlip001' }
        ]
      }
    ]
  },
  'YF20231005142002': {
    id: 'YF20231005142002',
    status: 'Pending',
    businessType: '供应商预付款',
    payer: { name: '我的企业', bank: '招商银行', account: '1234567890' },
    payee: { name: '上海晨光文具销售有限公司', bank: '中国工商银行', account: '6222020000000002' },
    contact: { name: '李经理', phone: '13900139000' },
    amount: { applied: 20000.00, actual: 0.00, unpaid: 20000.00 },
    attachments: [
      { name: 'invoice_draft.jpg', url: 'https://via.placeholder.com/150?text=InvoiceDraft' }
    ],
    logs: [
      { time: '2023-10-05 09:15:30', user: '李四', action: '发起审批', comment: '日常采购预付' }
    ],
    paymentRecords: []
  }
};

const SupplierPrepaymentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    setLoading(true);
    setTimeout(() => {
      if (id && MOCK_DB[id]) {
        setDetail({ ...MOCK_DB[id] });
      } else {
        // Fallback or Not Found handling
        // For demo purposes, if ID not found, load a default Pending one or show error
        // Here we default to the Pending one if not found, but ideally we should be strict.
        // Let's create a dynamic default if ID is missing from DB to prevent crash
        setDetail({
            id: id || 'UNKNOWN',
            status: 'Pending',
            businessType: '供应商预付款',
            payer: { name: '我的企业', bank: '招商银行', account: '1234567890' },
            payee: { name: '未知供应商', bank: '未知银行', account: '000000' },
            contact: { name: '未知', phone: '-' },
            amount: { applied: 0, actual: 0, unpaid: 0 },
            attachments: [],
            logs: [],
            paymentRecords: []
        });
      }
      setLoading(false);
    }, 500);
  }, [id]);

  const handleApprove = () => {
    if (!detail) return;
    const newStatus = 'Approved';
    const newLog = { 
      time: new Date().toLocaleString(), 
      user: '当前用户', 
      action: '财务确认', 
      comment: '同意' 
    };
    setDetail({
      ...detail,
      status: newStatus,
      logs: [...detail.logs, newLog]
    });
    message.success('审批通过，进入待付款状态');
  };

  const handleReject = () => {
    if (!detail) return;
    const newStatus = 'Rejected';
    const newLog = { 
      time: new Date().toLocaleString(), 
      user: '当前用户', 
      action: '驳回', 
      comment: rejectReason 
    };
    setDetail({
        ...detail,
        status: newStatus,
        logs: [...detail.logs, newLog]
    });
    setIsRejectModalOpen(false);
    message.error('审批已驳回');
  };

  const handlePay = () => {
    if (!detail) return;
    const newStatus = 'Paid';
    const newLog = { 
      time: new Date().toLocaleString(), 
      user: '当前用户', 
      action: '出纳付款', 
      comment: '已完成支付' 
    };
    // Simulate creating a payment record
    const newRecord: PaymentRecord = {
        slipNo: `SLIP${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.floor(Math.random()*1000)}`,
        amount: detail.amount.applied,
        paymentTime: new Date().toLocaleString(),
        vouchers: [{ name: '模拟回单.jpg', url: 'https://via.placeholder.com/300?text=NewVoucher' }]
    };

    setDetail({
        ...detail,
        status: newStatus,
        amount: { ...detail.amount, actual: detail.amount.applied, unpaid: 0 },
        logs: [...detail.logs, newLog],
        paymentRecords: [...detail.paymentRecords, newRecord]
    });
    message.success('付款完成');
  };

  const getStepCurrent = () => {
    if (!detail) return 0;
    if (detail.status === 'Pending') return 1;
    if (detail.status === 'Approved') return 2;
    if (detail.status === 'Paid') return 3;
    if (detail.status === 'Rejected') return 1; 
    return 0;
  };

  if (loading) {
      return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  if (!detail) {
      return <div>数据加载失败</div>;
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5' }}>
      <PageDoc 
        pageTitle="供应链管理 > 供应商管理 > 预付款详情"
        description="查看预付款申请的完整详情及审批记录。系统实现了付款凭证与水单号的严格绑定，当状态为'已付款'或'部分付款'时，可查看每一笔水单对应的具体凭证（支持多张），确保财务数据的可追溯性。"
        fields={[]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/supplier')}>供应商管理</a> },
         { title: <a onClick={() => navigate(-1)}>预付款审批列表</a> },
         { title: '详情' }
      ]} />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="基础信息" variant="borderless">
          <Descriptions column={{ xxl: 3, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
            <Descriptions.Item label="预付款单号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="审批状态">
               <Tag color={detail.status === 'Pending' ? 'orange' : detail.status === 'Paid' ? 'green' : detail.status === 'Approved' ? 'blue' : detail.status === 'PartiallyPaid' ? 'cyan' : 'red'}>
                 {detail.status === 'Pending' ? '待审批' : detail.status === 'Approved' ? '待付款' : detail.status === 'Paid' ? '已付款' : detail.status === 'PartiallyPaid' ? '部分付款' : '已驳回'}
               </Tag>
            </Descriptions.Item>
            {(detail.status === 'Paid' || detail.status === 'PartiallyPaid') && (
              <Descriptions.Item label="付款水单号">
                {detail.paymentRecords && detail.paymentRecords.length > 0 ? (
                   <Space direction="vertical" size={0}>
                      {detail.paymentRecords.map((record, idx) => <span key={idx}>{record.slipNo}</span>)}
                   </Space>
                ) : '-'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="业务类型">{detail.businessType}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="收付款信息" variant="borderless">
          <Descriptions title="付款方信息" column={{ xxl: 3, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="名称">{detail.payer.name}</Descriptions.Item>
            <Descriptions.Item label="开户行">{detail.payer.bank}</Descriptions.Item>
            <Descriptions.Item label="银行账号">{detail.payer.account}</Descriptions.Item>
          </Descriptions>
          <Divider />
          <Descriptions title="收款方信息" column={3}>
            <Descriptions.Item label="名称">{detail.payee.name}</Descriptions.Item>
            <Descriptions.Item label="开户行">{detail.payee.bank}</Descriptions.Item>
            <Descriptions.Item label="银行账号">{detail.payee.account}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="联系与金额" variant="borderless">
           <Descriptions column={{ xxl: 3, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
             <Descriptions.Item label="供应商联系人">{detail.contact.name}</Descriptions.Item>
             <Descriptions.Item label="联系电话">{detail.contact.phone}</Descriptions.Item>
             <Descriptions.Item label="申请预付金额">¥{detail.amount.applied.toLocaleString()}</Descriptions.Item>
             <Descriptions.Item label="实际预付金额">¥{detail.amount.actual.toLocaleString()}</Descriptions.Item>
             <Descriptions.Item label="未付金额">¥{detail.amount.unpaid.toLocaleString()}</Descriptions.Item>
           </Descriptions>
        </Card>

        <Card title="附件信息" variant="borderless">
           <Space>
             {detail.attachments.map((file, index) => (
                <div key={index} style={{ border: '1px solid #d9d9d9', padding: 8, borderRadius: 4 }}>
                   <Image width={100} src={file.url} alt={file.name} fallback="https://via.placeholder.com/150?text=File" />
                   <div style={{ textAlign: 'center', marginTop: 4 }}>{file.name}</div>
                </div>
             ))}
           </Space>
        </Card>

        {detail.paymentRecords && detail.paymentRecords.length > 0 && (
           <Card title="付款凭证" variant="borderless">
              <Timeline>
                {detail.paymentRecords.map((record, index) => (
                  <Timeline.Item key={index} color="green">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                        <span>水单号：{record.slipNo}</span>
                        <Divider type="vertical" />
                        <span>金额：¥{record.amount.toLocaleString()}</span>
                        <Divider type="vertical" />
                        <span style={{ color: '#999', fontWeight: 'normal' }}>{record.paymentTime}</span>
                      </div>
                      <Space size="large" wrap>
                        {record.vouchers.map((v, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                              <Image width={200} src={v.url} alt={v.name} />
                              <div style={{ marginTop: 8, color: '#666' }}>{v.name}</div>
                            </div>
                        ))}
                      </Space>
                    </Space>
                  </Timeline.Item>
                ))}
              </Timeline>
           </Card>
        )}

        <Card variant="borderless">
          <Steps 
            direction="vertical" 
            current={getStepCurrent()} 
            status={detail.status === 'Rejected' ? 'error' : 'process'}
            items={[
                { title: "提交申请", description: detail.logs[0]?.time || '' },
                { title: "财务审核", description: detail.status !== 'Pending' ? '已完成' : '进行中' },
                { title: "出纳付款", description: detail.status === 'Paid' ? '已完成' : '待处理' },
                { title: "完成" }
            ]}
          />
        </Card>

        <Card title="操作记录" variant="borderless">
           <Table
              dataSource={[...detail.logs].reverse()}
              pagination={{ pageSize: 10 }}
              rowKey="time"
              columns={[
                  { title: '操作时间', dataIndex: 'time', key: 'time' },
                  { title: '操作人', key: 'user', render: (_, record) => (
                      <Space>
                        <Avatar icon={<UserOutlined />} size="small" />
                        <span>{record.user}</span>
                      </Space>
                  )},
                  { title: '操作类型', key: 'action', render: (_, record) => (
                      <Tag color="blue">{record.action}</Tag>
                  )},
                  { title: '备注', dataIndex: 'comment', key: 'comment' },
              ]}
           />
        </Card>
      </Space>

      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', background: '#fff', padding: '16px 24px', borderTop: '1px solid #e8e8e8', textAlign: 'right', zIndex: 999 }}>
         <Space>
            <Button onClick={() => navigate(-1)}>返回</Button>
            {detail.status === 'Pending' && (
               <>
                 <Button danger onClick={() => setIsRejectModalOpen(true)}>驳回</Button>
                 <Button type="primary" onClick={handleApprove}>财务确认</Button>
               </>
            )}
            {detail.status === 'Approved' && (
               <Button type="primary" icon={<PayCircleOutlined />} onClick={handlePay}>出纳付款</Button>
            )}
         </Space>
      </div>

      <Modal title="驳回原因" open={isRejectModalOpen} onOk={handleReject} onCancel={() => setIsRejectModalOpen(false)}>
         <Input.TextArea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请输入驳回原因" />
      </Modal>
      <div style={{ height: 60 }} /> {/* Spacer for fixed footer */}
    </div>
  );
};

export default SupplierPrepaymentDetail;