import React, { useState, useEffect } from 'react';
import { Descriptions, Card, Steps, Button, Space, Tag, Image, Timeline, Breadcrumb, Divider, message, Modal, Input, Table, Avatar, Spin, Upload, Progress, Typography, Form } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PayCircleOutlined, UserOutlined, UploadOutlined, EyeOutlined, DownloadOutlined, FilePdfOutlined, FileImageOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import request from '../../utils/request';
import { formatTimeFull } from '../../utils/dateFormatter';
import { uploadFile } from '../../services/fileService';

const { Text } = Typography;

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

interface CostInvoiceFile {
  url: string;
  amount: number;
  invoiceCode?: string;
  type?: string;
  uploadTime?: string;
}

interface DetailData {
  id: string;
  numericId: number;
  supplierId: number;
  ownerType: string;
  logisticsProviderId: number;
  logisticsProviderName: string;
  supplierName: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'WITHDRAWN' | 'PARTIAL_PAID';
  businessType: string;
  payer: { name: string; bank: string; account: string };
  payee: { name: string; bank: string; account: string };
  contact: { name: string; phone: string };
  amount: { applied: number; actual: number; unpaid: number };
  attachments: { name: string; url: string }[];
  logs: { time: string; user: string; action: string; comment: string }[];
  paymentRecords: PaymentRecord[];
  costInvoiceAmount: number;
  costInvoiceReceived: number;
  costInvoiceStatus: string;
  costInvoiceFiles: CostInvoiceFile[];
}

const formatAmount = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '¥0.00';
  return `¥${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const mapApiToDetail = (api: any): DetailData => {
  let attachments: { name: string; url: string }[] = [];
  if (api.attachments) {
    try {
      const parsed = typeof api.attachments === 'string' ? JSON.parse(api.attachments) : api.attachments;
      if (Array.isArray(parsed)) {
        attachments = parsed;
      }
    } catch { /* ignore parse errors */ }
  }

  const logs: { time: string; user: string; action: string; comment: string }[] = [];
  if (api.createdAt) {
    logs.push({
      time: formatTimeFull(api.createdAt),
      user: api.createdBy || '-',
      action: '发起审批',
      comment: api.applyRemark || ''
    });
  }
  if (api.approvedAt) {
    logs.push({
      time: formatTimeFull(api.approvedAt),
      user: api.approvedBy || '-',
      action: api.status === 'REJECTED' ? '驳回' : '财务确认',
      comment: api.rejectReason || '同意'
    });
  }
  if (api.cashierAt) {
    logs.push({
      time: formatTimeFull(api.cashierAt),
      user: api.cashierBy || '-',
      action: '出纳付款',
      comment: '已完成支付'
    });
  }

  let paymentRecords: PaymentRecord[] = [];
  if (api.status === 'PAID' && api.bankReceiptNo) {
    let vouchers: PaymentVoucher[] = [];
    if (api.paymentVoucher) {
      try {
        const parsed = typeof api.paymentVoucher === 'string' ? JSON.parse(api.paymentVoucher) : api.paymentVoucher;
        if (Array.isArray(parsed)) {
          vouchers = parsed;
        }
      } catch { /* ignore parse errors */ }
    }
    paymentRecords = [{
      slipNo: api.bankReceiptNo,
      amount: api.actualAmount || api.appliedAmount,
      paymentTime: formatTimeFull(api.cashierAt),
      vouchers
    }];
  }

  let costInvoiceFiles: CostInvoiceFile[] = [];
  if (api.costInvoiceFiles) {
    try {
      const parsed = typeof api.costInvoiceFiles === 'string' ? JSON.parse(api.costInvoiceFiles) : api.costInvoiceFiles;
      if (Array.isArray(parsed)) {
        costInvoiceFiles = parsed;
      }
    } catch { /* ignore parse errors */ }
  }

  const appliedAmount = Number(api.appliedAmount) || 0;
  const actualAmount = Number(api.actualAmount) || 0;

  const isLogisticsOwner = api.ownerType === 'LOGISTICS';

  return {
    id: api.approvalNo || String(api.id),
    numericId: api.id,
    supplierId: api.supplier?.id || 0,
    ownerType: api.ownerType || 'SUPPLIER',
    logisticsProviderId: api.logisticsProvider?.id || 0,
    logisticsProviderName: api.logisticsProvider?.name || '',
    supplierName: api.supplier?.name || '',
    status: api.status,
    businessType: isLogisticsOwner ? '物流供应商预付款' : '供应商预付款',
    payer: { name: api.payerName || '-', bank: api.payerBank || '-', account: api.payerAccount || '-' },
    payee: { name: api.payeeName || '-', bank: api.payeeBank || '-', account: api.payeeAccount || '-' },
    contact: { name: api.contactName || '-', phone: api.contactPhone || '-' },
    amount: { applied: appliedAmount, actual: actualAmount, unpaid: appliedAmount - actualAmount },
    attachments,
    logs,
    paymentRecords,
    costInvoiceAmount: Number(api.costInvoiceAmount) || appliedAmount,
    costInvoiceReceived: Number(api.costInvoiceReceived) || 0,
    costInvoiceStatus: api.costInvoiceStatus || '未上传',
    costInvoiceFiles
  };
};

const SupplierPrepaymentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isLogistics = location.pathname.includes('/logistics-provider/prepayment') || searchParams.get('ownerType') === 'logistics';

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [isCostInvoiceModalOpen, setIsCostInvoiceModalOpen] = useState(false);
  const [costInvoiceAmount, setCostInvoiceAmount] = useState<number>(0);
  const [costInvoiceFileList, setCostInvoiceFileList] = useState<UploadFile[]>([]);
  const [costInvoiceCode, setCostInvoiceCode] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payBankReceiptNo, setPayBankReceiptNo] = useState<string>('');
  const [payVoucherFileList, setPayVoucherFileList] = useState<UploadFile[]>([]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await request.get(`/prepayment-approvals/by-no/${id}`);
      const data = res.data || res;
      setDetail(mapApiToDetail(data));
    } catch {
      message.error('获取预付款详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleApprove = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await request.put(`/prepayment-approvals/${detail.numericId}/approve`, {
        approvedBy: '当前用户'
      });
      message.success('审批通过，进入待付款状态');
      fetchData();
    } catch {
      message.error('审批操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!detail || !rejectReason.trim()) {
      message.warning('请输入驳回原因');
      return;
    }
    setActionLoading(true);
    try {
      await request.put(`/prepayment-approvals/${detail.numericId}/reject`, {
        rejectReason: rejectReason.trim()
      });
      setIsRejectModalOpen(false);
      setRejectReason('');
      message.error('审批已驳回');
      fetchData();
    } catch {
      message.error('驳回操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = () => {
    setPayBankReceiptNo('');
    setPayVoucherFileList([]);
    setIsPayModalOpen(true);
  };

  const handlePayConfirm = async () => {
    if (!detail) return;
    
    if (!payBankReceiptNo.trim()) {
      message.warning('请输入银行水单号');
      return;
    }
    
    setActionLoading(true);
    try {
      const voucherUrls: string[] = [];
      for (const fileItem of payVoucherFileList) {
        if (fileItem.originFileObj) {
          const uploadResult = await uploadFile(fileItem.originFileObj);
          voucherUrls.push(uploadResult.fileUrl);
        } else if (fileItem.url) {
          voucherUrls.push(fileItem.url);
        }
      }
      
      await request.put(`/prepayment-approvals/${detail.numericId}/pay`, {
        cashierBy: '当前用户',
        bankReceiptNo: payBankReceiptNo.trim(),
        paymentVoucher: voucherUrls.length > 0 ? JSON.stringify(voucherUrls.map(url => ({ name: url.split('/').pop() || '凭证', url }))) : undefined
      });
      message.success('付款完成');
      setIsPayModalOpen(false);
      fetchData();
    } catch {
      message.error('付款操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      await request.put(`/prepayment-approvals/${detail.numericId}/withdraw`);
      message.success('已撤回');
      fetchData();
    } catch {
      message.error('撤回操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadCostInvoice = async () => {
    if (!detail) return;
    
    const unreceivedAmount = detail.costInvoiceAmount - detail.costInvoiceReceived;
    
    if (costInvoiceAmount <= 0) {
      message.error('请输入有效的上传金额');
      return;
    }
    
    if (costInvoiceAmount > unreceivedAmount) {
      message.error(`上传金额不能大于未收金额 ${formatAmount(unreceivedAmount)}`);
      return;
    }
    
    if (costInvoiceFileList.length === 0) {
      message.error('请选择成本票文件');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      let fileUrl: string | undefined;
      
      const uploadItem = costInvoiceFileList[0];
      const file = uploadItem.originFileObj;
      if (file) {
        setUploadProgress(30);
        const uploadResult = await uploadFile(file);
        fileUrl = uploadResult.fileUrl;
        setUploadProgress(70);
      }
      
      setUploadProgress(90);
      await request.put(`/prepayment-approvals/${detail.numericId}/cost-invoice`, {
        amount: costInvoiceAmount,
        fileUrl,
        invoiceCode: costInvoiceCode || undefined,
        type: '成本票'
      });
      setUploadProgress(100);
      
      message.success('成本票上传成功');
      setIsCostInvoiceModalOpen(false);
      setCostInvoiceAmount(0);
      setCostInvoiceFileList([]);
      setCostInvoiceCode('');
      fetchData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || '上传失败，请重试';
      message.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStepCurrent = () => {
    if (!detail) return 0;
    if (detail.status === 'PENDING') return 1;
    if (detail.status === 'APPROVED') return 2;
    if (detail.status === 'PAID') return 3;
    if (detail.status === 'REJECTED') return 1;
    return 0;
  };

  const getFileIcon = (url: string) => {
    const ext = url?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
      return <FileImageOutlined style={{ fontSize: 18, color: '#1890ff' }} />;
    }
    if (ext === 'pdf') {
      return <FilePdfOutlined style={{ fontSize: 18, color: '#f5222d' }} />;
    }
    return <FileImageOutlined style={{ fontSize: 18 }} />;
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
        pageTitle={isLogistics ? "供应链管理 > 物流供应商管理 > 预付款详情" : "供应链管理 > 供应商管理 > 预付款详情"}
        description="查看预付款申请的完整详情及审批记录。系统实现了付款凭证与水单号的严格绑定，当状态为'已付款'或'部分付款'时，可查看每一笔水单对应的具体凭证（支持多张），确保财务数据的可追溯性。"
        fields={[]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: '供应链管理' },
        { title: <a onClick={() => navigate(isLogistics ? '/supply-chain/logistics-provider' : '/supply-chain/supplier')}>{isLogistics ? '物流供应商管理' : '供应商管理'}</a> },
        { title: <a onClick={() => navigate(-1)}>预付款审批列表</a> },
        { title: '详情' }
      ]} />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="基础信息" variant="borderless">
          <Descriptions column={{ xxl: 3, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
            <Descriptions.Item label="预付款单号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="审批状态">
              <Tag color={
                detail.status === 'PENDING' ? 'orange' : 
                detail.status === 'PAID' ? 'green' : 
                detail.status === 'PARTIAL_PAID' ? 'cyan' :
                detail.status === 'APPROVED' ? 'blue' : 
                detail.status === 'WITHDRAWN' ? 'default' : 'red'
              }>
                {detail.status === 'PENDING' ? '待审批' : 
                 detail.status === 'APPROVED' ? '待付款' : 
                 detail.status === 'PAID' ? '已付款' : 
                 detail.status === 'PARTIAL_PAID' ? '部分付款' :
                 detail.status === 'WITHDRAWN' ? '已撤回' : '已驳回'}
              </Tag>
            </Descriptions.Item>
            {detail.status === 'PAID' && (
              <Descriptions.Item label="付款水单号">
                {detail.paymentRecords && detail.paymentRecords.length > 0 ? (
                  <Space direction="vertical" size={0}>
                    {detail.paymentRecords.map((record, idx) => <span key={idx}>{record.slipNo}</span>)}
                  </Space>
                ) : '-'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="采购类型">{detail.businessType}</Descriptions.Item>
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
            <Descriptions.Item label={isLogistics ? '物流供应商联系人' : '供应商联系人'}>{detail.contact.name}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{detail.contact.phone}</Descriptions.Item>
            <Descriptions.Item label="申请预付金额">¥{detail.amount.applied.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="实际预付金额">¥{detail.amount.actual.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="未付金额">¥{detail.amount.unpaid.toLocaleString()}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="成本票" variant="borderless" extra={
          detail.costInvoiceStatus !== '已上传' ? (
            <Button type="primary" onClick={() => setIsCostInvoiceModalOpen(true)}>
              上传成本票
            </Button>
          ) : null
        }>
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="应收成本票金额">
              <Text strong>{formatAmount(detail.costInvoiceAmount)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="已收成本票金额">
              <Text strong style={{ color: '#52c41a' }}>{formatAmount(detail.costInvoiceReceived)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="未收成本票金额">
              <Text strong style={{ color: '#ff4d4f' }}>
                {formatAmount(detail.costInvoiceAmount - detail.costInvoiceReceived)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="成本票状态" span={3}>
              <Tag color={
                detail.costInvoiceStatus === '已上传' ? 'green' :
                detail.costInvoiceStatus === '部分上传' ? 'orange' : 'default'
              }>
                {detail.costInvoiceStatus || '未上传'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
          {detail.costInvoiceFiles && detail.costInvoiceFiles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>已上传文件</Text>
              <Table
                size="small"
                pagination={false}
                dataSource={detail.costInvoiceFiles.map((f, idx) => ({ key: idx, ...f }))}
                columns={[
                  {
                    title: '文件类型',
                    dataIndex: 'type',
                    width: 100,
                    render: (type: string) => (
                      <Tag color={type === '红冲票' ? 'red' : 'blue'}>
                        {type || '成本票'}
                      </Tag>
                    )
                  },
                  {
                    title: '发票代码',
                    dataIndex: 'invoiceCode',
                    width: 150,
                    render: (v: string) => v || '-'
                  },
                  {
                    title: '金额',
                    dataIndex: 'amount',
                    width: 120,
                    render: (v: number) => formatAmount(v)
                  },
                  {
                    title: '上传时间',
                    dataIndex: 'uploadTime',
                    width: 180,
                    render: (v: string) => v ? formatTimeFull(v) : '-'
                  },
                  {
                    title: '操作',
                    width: 200,
                    render: (_: any, record: CostInvoiceFile) => (
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => window.open(record.url, '_blank')}
                        >
                          预览
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = record.url;
                            a.download = record.url.split('/').pop() || 'download';
                            a.click();
                          }}
                        >
                          下载
                        </Button>
                      </Space>
                    )
                  }
                ]}
                locale={{ emptyText: '暂无文件' }}
              />
            </div>
          )}
        </Card>

        <Card title="附件信息" variant="borderless">
          <Space>
            {detail.attachments.length > 0 ? detail.attachments.map((file, index) => (
              <div key={index} style={{ border: '1px solid #d9d9d9', padding: 8, borderRadius: 4 }}>
                <Image width={100} src={file.url} alt={file.name} fallback="https://via.placeholder.com/150?text=File" />
                <div style={{ textAlign: 'center', marginTop: 4 }}>{file.name}</div>
              </div>
            )) : <span style={{ color: '#999' }}>暂无附件</span>}
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
            status={detail.status === 'REJECTED' ? 'error' : 'process'}
            items={[
              { title: "提交申请", description: detail.logs[0]?.time || '' },
              { title: "财务审核", description: detail.status !== 'PENDING' ? '已完成' : '进行中' },
              { title: "出纳付款", description: detail.status === 'PAID' ? '已完成' : '待处理' },
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
          {detail.status === 'PENDING' && (
            <>
              <Button onClick={handleWithdraw} disabled={actionLoading}>撤回</Button>
              <Button danger onClick={() => setIsRejectModalOpen(true)} disabled={actionLoading}>驳回</Button>
              <Button type="primary" onClick={handleApprove} loading={actionLoading}>财务确认</Button>
            </>
          )}
          {detail.status === 'APPROVED' && (
            <Button type="primary" icon={<PayCircleOutlined />} onClick={handlePay} disabled={actionLoading}>出纳付款</Button>
          )}
        </Space>
      </div>

      <Modal title="驳回原因" open={isRejectModalOpen} onOk={handleReject} onCancel={() => { setIsRejectModalOpen(false); setRejectReason(''); }} confirmLoading={actionLoading}>
        <Input.TextArea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请输入驳回原因" />
      </Modal>

      <Modal 
        title="出纳付款" 
        open={isPayModalOpen} 
        onOk={handlePayConfirm} 
        onCancel={() => { setIsPayModalOpen(false); setPayBankReceiptNo(''); setPayVoucherFileList([]); }}
        confirmLoading={actionLoading}
      >
        <Form layout="vertical">
          <Form.Item label="银行水单号" required>
            <Input 
              value={payBankReceiptNo}
              onChange={(e) => setPayBankReceiptNo(e.target.value)}
              placeholder="请输入银行水单号"
            />
          </Form.Item>
          <Form.Item label="付款凭证">
            <Upload
              fileList={payVoucherFileList}
              onChange={({ fileList }) => setPayVoucherFileList(fileList)}
              beforeUpload={(file) => {
                const isLt10M = file.size / 1024 / 1024 < 10;
                if (!isLt10M) {
                  message.error('文件大小不能超过 10MB');
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
              maxCount={5}
              accept=".pdf,.jpg,.jpeg,.png"
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>上传付款凭证</Button>
            </Upload>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              支持 PDF、JPG、PNG 格式，最大 10MB
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上传成本票"
        open={isCostInvoiceModalOpen}
        onOk={handleUploadCostInvoice}
        onCancel={() => {
          setIsCostInvoiceModalOpen(false);
          setCostInvoiceAmount(0);
          setCostInvoiceFileList([]);
          setCostInvoiceCode('');
        }}
        confirmLoading={uploading}
      >
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="应收成本票金额">
            <Text strong>{formatAmount(detail?.costInvoiceAmount)} 元</Text>
          </Descriptions.Item>
          <Descriptions.Item label="已收成本票金额">
            <Text strong style={{ color: '#52c41a' }}>{formatAmount(detail?.costInvoiceReceived)} 元</Text>
          </Descriptions.Item>
          <Descriptions.Item label="未收成本票金额">
            <Text strong style={{ color: '#ff4d4f' }}>
              {formatAmount((detail?.costInvoiceAmount || 0) - (detail?.costInvoiceReceived || 0))} 元
            </Text>
          </Descriptions.Item>
        </Descriptions>
        {uploading && uploadProgress > 0 && (
          <Progress percent={uploadProgress} style={{ marginBottom: 16 }} />
        )}
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <label>本次上传成本票金额 <span style={{ color: 'red' }}>*</span></label>
            <Input
              type="number"
              value={costInvoiceAmount || ''}
              onChange={(e) => setCostInvoiceAmount(Number(e.target.value))}
              placeholder={`最大可上传金额：${formatAmount((detail?.costInvoiceAmount || 0) - (detail?.costInvoiceReceived || 0))}`}
              suffix="元"
              disabled={uploading}
              style={{ marginTop: 4 }}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>发票代码</label>
            <Input
              value={costInvoiceCode}
              onChange={(e) => setCostInvoiceCode(e.target.value)}
              placeholder="请输入发票代码（选填）"
              disabled={uploading}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <label>成本票文件 <span style={{ color: 'red' }}>*</span></label>
            <div style={{ marginTop: 4 }}>
              <Upload
                fileList={costInvoiceFileList}
                onChange={({ fileList }) => setCostInvoiceFileList(fileList)}
                beforeUpload={(file) => {
                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    message.error('文件大小不能超过 10MB');
                    return Upload.LIST_IGNORE;
                  }
                  return false;
                }}
                maxCount={1}
                accept=".pdf,.jpg,.jpeg,.png"
              >
                <Button icon={<UploadOutlined />} disabled={uploading}>
                  选择文件
                </Button>
              </Upload>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                支持 PDF、JPG、PNG 格式，最大 10MB
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <div style={{ height: 60 }} />
    </div>
  );
};

export default SupplierPrepaymentDetail;
