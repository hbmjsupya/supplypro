import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, Breadcrumb, Modal, Form, Input, Typography, Avatar, message, Steps, Spin, Tooltip, Upload, Progress, Image } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UserOutlined, DownOutlined, UpOutlined, UploadOutlined, LoadingOutlined, EyeOutlined, DownloadOutlined, FilePdfOutlined, FileImageOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import { getDisplayPaidAmount } from '../../utils/paymentValidation';
import { getSettlementDetail, getSettlementDetailByNo, revokeSettlement, rejectSettlement, confirmSettlement, uploadCostInvoice, SettlementDetailData, DeliveryItem, ApprovalRecord } from '../../services/settlementService';
import { uploadFile } from '../../services/fileService';

const { TextArea } = Input;
const { Text } = Typography;

interface OperationRecord {
  id: string;
  operator: string;
  department: string;
  time: string;
  action: string;
  remark: string;
}

const SupplierSettlementDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'Approve' | 'Reject' | 'Revoke' | null>(null);
  const [expandHistory, setExpandHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [settlementData, setSettlementData] = useState<SettlementDetailData | null>(null);
  const [isCostInvoiceModalOpen, setIsCostInvoiceModalOpen] = useState(false);
  const [costInvoiceAmount, setCostInvoiceAmount] = useState<number>(0);
  const [costInvoiceFileList, setCostInvoiceFileList] = useState<UploadFile[]>([]);
  const [costInvoiceCode, setCostInvoiceCode] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isRedInvoiceModalOpen, setIsRedInvoiceModalOpen] = useState(false);
  const [redInvoiceAmount, setRedInvoiceAmount] = useState<number>(0);
  const [redInvoiceFileList, setRedInvoiceFileList] = useState<UploadFile[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState<{ success: boolean; message: string; settlementNo?: string; timestamp?: string; errorReason?: string }>({ success: false, message: '' });

  const [operationRecords, setOperationRecords] = useState<OperationRecord[]>([]);

  useEffect(() => {
    if (id) {
      loadSettlementDetail();
    }
  }, [id]);

  const loadSettlementDetail = async () => {
    setLoading(true);
    try {
      let data: SettlementDetailData;
      if (/^\d+$/.test(id || '')) {
        data = await getSettlementDetail(Number(id));
      } else {
        data = await getSettlementDetailByNo(id || '');
      }
      
      if (data) {
        setSettlementData(data);
        
        // 使用后端返回的操作日志数据
        const records: OperationRecord[] = [];
        
        // 添加创建记录
        records.push({
          id: '1',
          operator: '系统',
          department: '系统',
          time: data.createdAt || '',
          action: 'Create',
          remark: '创建结算单'
        });
        
        // 添加审批记录
        if (data.approvalRecords && data.approvalRecords.length > 0) {
          data.approvalRecords.forEach((record: ApprovalRecord, index: number) => {
            records.push({
              id: String(index + 2),
              operator: record.operator || '系统',
              department: '审批',
              time: record.time || '',
              action: record.title === '审批通过' ? 'Approve' : 'Submit',
              remark: record.description || record.title
            });
          });
        }
        
        // 添加后端返回的操作日志
        if (data.operationLogs && data.operationLogs.length > 0) {
          data.operationLogs.forEach((log, index) => {
            records.push({
              id: `log_${log.id}_${index}`,
              operator: log.operator || '系统',
              department: '操作',
              time: log.createdAt || '',
              action: log.operationType || '操作',
              remark: log.remark || `${log.oldStatus || ''} → ${log.newStatus || ''}`
            });
          });
        }
        
        setOperationRecords(records);
      }
    } catch (error) {
      console.error('获取结算单详情失败:', error);
      message.error('获取结算单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case '待结算':
      case 'PendingApproval': 
        return <Tag color="processing" icon={<ClockCircleOutlined />}>待审批</Tag>;
      case '已审核':
      case 'Approved': 
        return <Tag color="success" icon={<CheckCircleOutlined />}>已通过</Tag>;
      case '已拒回':
      case 'Rejected': 
        return <Tag color="error" icon={<CloseCircleOutlined />}>已驳回</Tag>;
      case '已撤回':
      case 'Revoked': 
        return <Tag color="default" icon={<CloseCircleOutlined />}>已撤销</Tag>;
      case '已支付':
      case 'Paid': 
        return <Tag color="green" icon={<CheckCircleOutlined />}>已付款</Tag>;
      case '已结算':
      case 'SETTLED':
        return <Tag color="blue" icon={<CheckCircleOutlined />}>已结算</Tag>;
      default: 
        return <Tag>{status}</Tag>;
    }
  };

  const getActionColor = (action: string) => {
      switch(action) {
          case 'Create': return 'default';
          case 'Upload': return 'purple';
          case 'Submit': return 'blue';
          case 'Approve': return 'green';
          case 'Reject': return 'red';
          case 'Revoke': return 'orange';
          case 'Pay': return 'cyan';
          default: return 'gray';
      }
  };

  const getActionText = (action: string) => {
      switch(action) {
          case 'Create': return '创建单据';
          case 'Upload': return '上传附件';
          case 'Submit': return '提交申请';
          case 'Approve': return '确认结算';
          case 'Reject': return '驳回结算';
          case 'Pay': return '确认付款';
          case 'Revoke': return '撤销申请';
          default: return action;
      }
  };

  const handleAction = (action: 'Approve' | 'Reject' | 'Revoke') => {
      if (action === 'Reject') {
        message.info('驳回申请功能将由审批模块实现，敬请期待');
        return;
      }
      if (action === 'Approve') {
        if (settlementData?.supplierSettlementType === '预付') {
          const amount = settlementData.totalAmount || 0;
          const isLogistics = settlementData.payeeType === 'logistics_provider';
          const providerLabel = isLogistics ? '物流供应商' : '供应商';
          Modal.confirm({
            title: '确认结算',
            content: `本次结算将从${providerLabel}预付款余额中扣除 ¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}，确认继续？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
              try {
                await confirmSettlement(settlementData.id);
                message.success('结算确认成功');
                loadSettlementDetail();
              } catch (error: any) {
                const errMsg = error?.response?.data?.message || error?.message || `${providerLabel}预付款余额不足，无法进行预付款扣款操作`;
                message.error(errMsg);
              }
            }
          });
        } else {
          message.info('确认结算功能将由财务模块实现，敬请期待');
        }
        return;
      }
      setCurrentAction(action);
      setActionModalOpen(true);
      form.resetFields();
  };

  const submitAction = async () => {
      const values = await form.validateFields();
      
      const settlementId = settlementData?.id;
      if (!settlementId) {
        message.error('结算单ID不存在');
        return;
      }
      
      try {
        if (currentAction === 'Revoke') {
          // 由于请求拦截器会返回res.data，所以我们需要检查响应是否存在（成功时会返回data对象）
          const response = await revokeSettlement(settlementId, values.remark);
          if (response) {
            // 撤销成功
            const sourceTypeText = settlementData?.sourceType === '采购单' ? '采购单业务' : '配送单';
            setResultData({
              success: true,
              message: `撤销成功，关联${sourceTypeText}已释放回待结算列表`,
              settlementNo: settlementData?.settlementNo,
              timestamp: new Date().toLocaleString('zh-CN')
            });
            setResultModalOpen(true);
          } else {
            // 撤销失败
            setResultData({
              success: false,
              message: '撤销失败',
              errorReason: '系统处理失败，请稍后重试'
            });
            setResultModalOpen(true);
          }
        } else if (currentAction === 'Reject') {
          const response = await rejectSettlement(settlementId, values.remark);
          if (response) {
            message.success('驳回成功，结算单已释放回待结算列表');
            // 驳回成功后返回结算单列表页
            navigate('/supply-chain/settlement/supplier');
          } else {
            message.error('驳回失败，请稍后重试');
          }
        } else if (currentAction === 'Approve') {
          message.success('结算确认成功');
          loadSettlementDetail();
        }
        
        setActionModalOpen(false);
      } catch (error: any) {
        console.error('操作失败:', error);
        // 显示错误结果
        setResultData({
          success: false,
          message: '撤销失败',
          errorReason: error?.message || '网络错误，请稍后重试'
        });
        setResultModalOpen(true);
      }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '¥0.00';
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatBankAccount = (account: string | null | undefined) => {
    if (!account) return '-';
    return account.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!settlementData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <p>结算单不存在或已被删除</p>
        <Button onClick={() => navigate('/supply-chain/settlement/supplier')}>返回列表</Button>
      </div>
    );
  }

  const approvalSteps = settlementData.approvalRecords && settlementData.approvalRecords.length > 0
    ? settlementData.approvalRecords.map((record: ApprovalRecord) => ({
        title: record.title,
        description: `${record.operator || '系统'} ${record.time || ''}`,
        status: record.status === 'finish' ? 'finish' as const : 'process' as const,
      }))
    : [
        {
          title: '发起审批',
          description: '待系统发起',
          status: 'process' as const,
        }
      ];

  const deliveryList: DeliveryItem[] = settlementData.deliveryList || [];

  const isPendingStatus = settlementData.statusEnum === 'PENDING';
  const isSettledStatus = settlementData.statusEnum === 'SETTLED';
  const isPaidStatus = settlementData.statusEnum === 'PAID';
  const isFinalStatus = settlementData.statusEnum === 'REVOKED' || settlementData.statusEnum === 'REJECTED';
  const isLockedStatus = isSettledStatus || isPaidStatus;

  const getDisabledButtonTooltip = () => {
    if (isSettledStatus) return '当前状态为"已结算"，不允许执行此操作';
    if (isPaidStatus) return '当前状态为"已付款"，不允许执行此操作';
    return '';
  };

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 供应商结算单 > 供应商结算单详情"
        description={`供应商结算单详情页。

1. **页面布局**：
   - **头部信息区**：展示当前状态和申请时间。
   - **基本信息**：展示结算单核心字段及金额信息。
   - **关联配送单列表**：展示本次结算包含的配送单明细。
   - **审批记录**：竖向展示标准审批流程。
   - **操作记录**：按时间倒序展示完整的操作历史。
   - **底部操作区**：提供审批通过、驳回、撤销及返回等操作按钮。

2. **业务规则说明**：
   - **状态流转**：
     - 待结算 (PENDING) -> 已结算 (SETTLED)
     - 待结算 (PENDING) -> 已撤回 (REVOKED)
     - 待结算 (PENDING) -> 已拒回 (REJECTED)
   - **流程控制**：
     - **单次流程**：审批流一旦被驳回或撤销，当前结算单流程终止，不可再次发起审批。
     - **数据释放**：关联的所有配送单自动返回"待结算配送单"列表，对应采购单可重新修改物流信息。

3. **操作说明**：
   - **审批操作**：通过/驳回需填写备注。
   - **撤销申请**：需填写备注。`}
        fields={[
          { name: 'settlementNo', type: 'String', length: '32', required: true, desc: '结算单号' },
          { name: 'settlementType', type: 'Enum', required: true, desc: '结算类型（现付/预付）' },
          { name: 'payee', type: 'String', required: true, desc: '收款方（供应商/物流商）' },
          { name: 'totalAmount', type: 'Decimal', length: '10,2', required: true, desc: '申请结算金额' },
          { name: 'status', type: 'Enum', required: true, desc: '审批状态' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/settlement/supplier')}>供应商结算单列表</a> },
         { title: '结算单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
         <Card variant="borderless" bodyStyle={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Space>
                    <span style={{ color: '#888' }}>当前状态：</span>
                    {getStatusTag(settlementData.status)}
                    <span style={{ color: '#ccc', margin: '0 8px' }}>|</span>
                    <span style={{ color: '#888' }}>申请时间：{formatDateTime(settlementData.createdAt)}</span>
                </Space>
            </div>
         </Card>

         <Card title="基本信息" variant="borderless">
            <Descriptions column={3}>
               <Descriptions.Item label="结算单号">{settlementData.settlementNo || '-'}</Descriptions.Item>
               <Descriptions.Item label="结算类型">
                  <Tag color={settlementData.settlementType === '预付' ? 'orange' : 'blue'}>
                    {settlementData.settlementType || '现付'}
                  </Tag>
               </Descriptions.Item>
               <Descriptions.Item label="付款方">{settlementData.payer || '平台运营主体'}</Descriptions.Item>
               <Descriptions.Item label="收款方">{settlementData.payee || '-'}</Descriptions.Item>
               <Descriptions.Item label="收款开户名">{settlementData.payeeAccountName || settlementData.payee || '-'}</Descriptions.Item>
               <Descriptions.Item label="收款账户类型">
                  {settlementData.payeeAccountType ? (
                      <Tag color="blue">{settlementData.payeeAccountType === 'COMPANY' ? '企业对公账户' : settlementData.payeeAccountType === 'PERSONAL' ? '个人账户' : settlementData.payeeAccountType}</Tag>
                  ) : (
                      <Text type="secondary" italic>未记录</Text>
                  )}
               </Descriptions.Item>
               <Descriptions.Item label="开户总行">
                  {settlementData.payeeBank ? (
                      settlementData.payeeBank
                  ) : (
                      <Text type="secondary" italic>未配置</Text>
                  )}
               </Descriptions.Item>
               <Descriptions.Item label="收款账号">
                  {settlementData.payeeAccount ? (
                      <Text copyable={{ text: settlementData.payeeAccount }}>
                          {formatBankAccount(settlementData.payeeAccount)}
                      </Text>
                  ) : (
                      <Text type="secondary" italic>未配置</Text>
                  )}
               </Descriptions.Item>
               <Descriptions.Item label="申请结算金额">
                 <Text strong>{formatAmount(settlementData.totalAmount)}</Text>
               </Descriptions.Item>
               <Descriptions.Item label="备注">{settlementData.remark || '-'}</Descriptions.Item>
               {settlementData.statusEnum === 'REVOKED' && (
                 <Descriptions.Item label="撤销备注">
                   <Text type="warning">{settlementData.revokeRemark || '无'}</Text>
                 </Descriptions.Item>
               )}
            </Descriptions>
         </Card>

         <Card title="成本票" variant="borderless" extra={
            settlementData.costInvoiceStatus !== '已上传' ? (
               <Button type="primary" onClick={() => setIsCostInvoiceModalOpen(true)}>
                  上传成本票
               </Button>
            ) : (
               <Button type="primary" danger onClick={() => setIsRedInvoiceModalOpen(true)}>
                  红冲票
               </Button>
            )
         }>
            <Descriptions column={3} bordered size="small">
               <Descriptions.Item label="应收成本票金额">
                  <Text strong>{formatAmount(settlementData.costInvoiceAmount || settlementData.totalAmount)}</Text>
               </Descriptions.Item>
               <Descriptions.Item label="已收成本票金额">
                  <Text strong style={{ color: '#52c41a' }}>{formatAmount(settlementData.costInvoiceReceived || 0)}</Text>
               </Descriptions.Item>
               <Descriptions.Item label="未收成本票金额">
                  <Text strong style={{ color: '#ff4d4f' }}>
                     {formatAmount((settlementData.costInvoiceAmount || settlementData.totalAmount || 0) - (settlementData.costInvoiceReceived || 0))}
                  </Text>
               </Descriptions.Item>
               <Descriptions.Item label="成本票状态" span={3}>
                  <Tag color={
                     settlementData.costInvoiceStatus === '已上传' ? 'green' :
                     settlementData.costInvoiceStatus === '部分上传' ? 'orange' : 'default'
                  }>
                     {settlementData.costInvoiceStatus || '未上传'}
                  </Tag>
               </Descriptions.Item>
            </Descriptions>
            {settlementData.costInvoiceFiles && (
               <div style={{ marginTop: 16 }}>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>已上传文件</Text>
                  <Table 
                     size="small"
                     pagination={false}
                     dataSource={(() => {
                        try {
                           const files = JSON.parse(settlementData.costInvoiceFiles || '[]');
                           return files.map((f: any, idx: number) => ({ key: idx, ...f }));
                        } catch {
                           return [];
                        }
                     })()}
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
                           render: (v: string) => v ? new Date(v).toLocaleString() : '-'
                        },
                        { 
                           title: '操作', 
                           width: 200,
                           render: (_: any, record: any) => {
                              const fileExt = record.url?.split('.').pop()?.toLowerCase() || '';
                              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
                              const isPdf = fileExt === 'pdf';
                              const fileName = record.url?.split('/').pop() || `成本票_${record.type || '文件'}.${fileExt || 'pdf'}`;
                              
                              return (
                                 <Space>
                                    <Button 
                                       type="link" 
                                       size="small"
                                       icon={<EyeOutlined />}
                                       onClick={() => {
                                          setPreviewFile({ url: record.url, type: record.type || '成本票', name: fileName });
                                          setPreviewModalOpen(true);
                                       }}
                                    >
                                       预览
                                    </Button>
                                    <Button 
                                       type="link" 
                                       size="small"
                                       icon={downloading === record.key ? <LoadingOutlined /> : <DownloadOutlined />}
                                       disabled={downloading === record.key}
                                       onClick={async () => {
                                          if (!record.url) {
                                             message.error('文件链接不存在');
                                             return;
                                          }
                                          setDownloading(record.key);
                                          try {
                                             const response = await fetch(record.url, { method: 'GET' });
                                             if (!response.ok) throw new Error('下载失败');
                                             
                                             const blob = await response.blob();
                                             const url = window.URL.createObjectURL(blob);
                                             const a = document.createElement('a');
                                             a.href = url;
                                             a.download = fileName;
                                             document.body.appendChild(a);
                                             a.click();
                                             document.body.removeChild(a);
                                             window.URL.revokeObjectURL(url);
                                             message.success('下载成功');
                                          } catch (error) {
                                             message.error('下载失败，请重试');
                                          } finally {
                                             setDownloading(null);
                                          }
                                       }}
                                    >
                                       {downloading === record.key ? '下载中...' : '下载'}
                                    </Button>
                                 </Space>
                              );
                           }
                        }
                     ]}
                     locale={{ emptyText: '暂无文件' }}
                  />
               </div>
            )}
         </Card>

         <Card title={settlementData.sourceType === '采购单' ? "关联采购单列表" : "关联配送单列表"} variant="borderless">
            <Table 
               pagination={false}
               dataSource={deliveryList.map((item, index) => ({ 
                 key: index, 
                 ...item 
               }))}
               columns={settlementData.sourceType === '采购单' ? [
                  {
                    title: '业务类型/单号',
                    key: 'bizInfo',
                    render: (_, record) => {
                      let label = record.bizType || '-';
                      let color = 'default';
                      if (record.bizType === 'PLATFORM') {
                          label = '平台单'; color = 'blue';
                      } else if (record.bizType === 'REPLENISHMENT') {
                          label = '补货单'; color = 'purple';
                      } else if (record.bizType === 'INBOUND') {
                          label = '入库单'; color = 'purple';
                      } else if (record.bizType === 'COST_ADJUSTMENT') {
                          label = '调价单'; color = 'green';
                      } else if (record.bizType === 'REFUND') {
                          label = '退款单'; color = 'red';
                      } else if (record.bizTypeLabel) {
                          label = record.bizTypeLabel; color = 'default';
                      }
                      
                      return (
                        <Space direction="vertical" size={0}>
                          <Tag color={color}>{label}</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {record.bizNo || '-'}
                          </Typography.Text>
                        </Space>
                      );
                    }
                  },
                  { 
                    title: '采购单号', 
                    dataIndex: 'relatedOrderNo', 
                    render: (v, record) => record.relatedOrderId ? (
                      <a 
                        href={`/supply-chain/purchase-order/detail/${record.relatedOrderId}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {v}
                      </a>
                    ) : (v || '-')
                  },
                  { 
                    title: '平台单号', 
                    dataIndex: 'platformOrderNo', 
                    render: (v) => v || '-'
                  },
                  { 
                    title: '应结算金额', 
                    dataIndex: 'amount', 
                    render: (v) => formatAmount(v) 
                  }
               ] : [
                  { 
                    title: '配送单号', 
                    dataIndex: 'deliveryNo', 
                    render: (v) => v ? (
                      <a 
                        href={`/supply-chain/delivery/detail/${v}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {v}
                      </a>
                    ) : '-'
                  },
                  { 
                    title: '关联业务类型', 
                    dataIndex: 'bizType', 
                    width: 100,
                    render: (v) => v || '-'
                  },
                  { 
                    title: '关联业务单号', 
                    dataIndex: 'bizNo',
                    render: (v, record) => {
                      if (!v) return '-';
                      const bizType = record.bizType;
                      if (bizType === '出库单' && record.relatedOrderId) {
                        return (
                          <a 
                            href={`/supply-chain/outbound-order/detail/${record.relatedOrderId}`} 
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {v}
                          </a>
                        );
                      } else if ((bizType === '采购单' || bizType === '物流配送' || !bizType) && record.relatedOrderId) {
                        return (
                          <a 
                            href={`/supply-chain/purchase-order/detail/${record.relatedOrderId}`} 
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {v}
                          </a>
                        );
                      }
                      return v;
                    }
                  },
                  { 
                    title: '配送方式', 
                    dataIndex: 'deliveryMethod', 
                    render: (v) => {
                      if (!v) return '-';
                      if (v === 'Logistics' || v === '物流配送') return '物流配送';
                      if (v === 'SelfDelivery' || v === '自配送') return '自配送';
                      return v;
                    }
                  },
                  { 
                    title: '发货时间', 
                    dataIndex: 'shippedAt', 
                    render: (v) => formatDateTime(v) 
                  },
                  { 
                    title: '应结算金额', 
                    dataIndex: 'amount', 
                    render: (v) => formatAmount(v) 
                  },
               ]}
               locale={{ emptyText: settlementData.sourceType === '采购单' ? '暂无关联采购单' : '暂无关联配送单' }}
            />
         </Card>

         {settlementData.settlementType !== '预付' && (
            <Card title="审批记录" variant="borderless">
               <Steps
                   direction="vertical"
                   items={approvalSteps}
               />
            </Card>
         )}

         <Card 
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>操作记录</span>
                    <Button 
                        type="link" 
                        icon={expandHistory ? <UpOutlined /> : <DownOutlined />}
                        onClick={() => setExpandHistory(!expandHistory)}
                    >
                        {expandHistory ? '收起' : '展开'}
                    </Button>
                </div>
            } 
            variant="borderless"
         >
            {expandHistory ? (
                <Table
                    dataSource={[...operationRecords].reverse()}
                    pagination={{ pageSize: 10 }}
                    rowKey="id"
                    columns={[
                        {
                            title: '操作时间',
                            dataIndex: 'time',
                            key: 'time',
                            width: 180,
                            render: (v) => formatDateTime(v)
                        },
                        {
                            title: '操作人',
                            key: 'operator',
                            width: 200,
                            render: (_, record) => (
                                <Space>
                                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} size="small" />
                                    <span>{record.operator}</span>
                                    <Tag>{record.department}</Tag>
                                </Space>
                            )
                        },
                        {
                            title: '操作类型',
                            key: 'action',
                            width: 150,
                            render: (_, record) => (
                                <Tag color={getActionColor(record.action)}>
                                    {getActionText(record.action)}
                                </Tag>
                            )
                        },
                        {
                            title: '备注',
                            dataIndex: 'remark',
                            key: 'remark',
                            width: 300,
                        }
                    ]}
                />
            ) : (
                <div style={{ color: '#999', textAlign: 'center', padding: '16px 0' }}>已收起操作记录</div>
            )}
         </Card>

         <Card variant="borderless" bodyStyle={{ padding: '16px 24px', textAlign: 'right' }}>
             <Space>
                <Button onClick={() => navigate(-1)}>返回列表</Button>
                {isPendingStatus && (
                    <>
                      <Button onClick={() => handleAction('Revoke')}>撤销申请</Button>
                      <Button danger onClick={() => handleAction('Reject')}>驳回结算</Button>
                      <Button type="primary" onClick={() => handleAction('Approve')}>确认结算</Button>
                    </>
                )}
                {isLockedStatus && (
                    <>
                      <Tooltip title={getDisabledButtonTooltip()}>
                        <Button disabled>撤销申请</Button>
                      </Tooltip>
                      <Tooltip title={getDisabledButtonTooltip()}>
                        <Button danger disabled>驳回结算</Button>
                      </Tooltip>
                    </>
                )}
                {isFinalStatus && (
                    <Tag color="warning" style={{ fontSize: 14, padding: '4px 12px' }}>
                        单据已锁定，关联{settlementData?.sourceType === '采购单' ? '采购单业务' : '配送单'}已释放
                    </Tag>
                )}
             </Space>
         </Card>
      </Space>

      <Modal
         title={getActionText(currentAction || '')}
         open={actionModalOpen}
         onOk={submitAction}
         onCancel={() => setActionModalOpen(false)}
      >
          <Form form={form} layout="vertical">
              <Form.Item 
                label="操作备注" 
                name="remark" 
                rules={currentAction === 'Revoke' ? [] : [{ required: true, message: '请输入操作备注' }]}
              >
                  <TextArea rows={4} placeholder={currentAction === 'Revoke' ? "请输入操作说明（选填）..." : "请输入操作说明..."} />
              </Form.Item>
          </Form>
      </Modal>

      <Modal
         title="上传成本票"
         open={isCostInvoiceModalOpen}
         onOk={async () => {
            if (!settlementData) return;
            
            const unreceivedAmount = (settlementData.costInvoiceAmount || settlementData.totalAmount || 0) - (settlementData.costInvoiceReceived || 0);
            
            if (costInvoiceAmount <= 0) {
               message.error('请输入有效的上传金额');
               return;
            }
            
            if (costInvoiceAmount > unreceivedAmount) {
               message.error(`上传金额不能大于未收金额 ${formatAmount(unreceivedAmount)} 元`);
               return;
            }
            
            if (costInvoiceFileList.length === 0) {
               message.error('请选择成本票文件');
               return;
            }
            
            setUploading(true);
            setUploadProgress(0);
            
            try {
               let proofUrl: string | undefined;
               
               const uploadItem = costInvoiceFileList[0];
               const file = uploadItem.originFileObj;
               if (file) {
                  setUploadProgress(30);
                  const uploadResult = await uploadFile(file);
                  proofUrl = uploadResult.fileUrl;
                  setUploadProgress(70);
               }
               
               setUploadProgress(90);
               await uploadCostInvoice(settlementData.id, costInvoiceAmount, proofUrl, '成本票', costInvoiceCode || undefined);
               setUploadProgress(100);
               
               message.success('成本票上传成功');
               setIsCostInvoiceModalOpen(false);
               setCostInvoiceAmount(0);
               setCostInvoiceFileList([]);
               setCostInvoiceCode('');
               loadSettlementDetail();
            } catch (error: any) {
               const errorMessage = error?.response?.data?.message || error?.message || '上传失败，请重试';
               message.error(errorMessage);
            } finally {
               setUploading(false);
               setUploadProgress(0);
            }
         }}
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
                <Text strong>{formatAmount(settlementData?.costInvoiceAmount || settlementData?.totalAmount || 0)} 元</Text>
             </Descriptions.Item>
             <Descriptions.Item label="已收成本票金额">
                <Text strong style={{ color: '#52c41a' }}>{formatAmount(settlementData?.costInvoiceReceived || 0)} 元</Text>
             </Descriptions.Item>
             <Descriptions.Item label="未收成本票金额">
                <Text strong style={{ color: '#ff4d4f' }}>
                   {formatAmount((settlementData?.costInvoiceAmount || settlementData?.totalAmount || 0) - (settlementData?.costInvoiceReceived || 0))} 元
                </Text>
             </Descriptions.Item>
          </Descriptions>
          {uploading && uploadProgress > 0 && (
             <Progress percent={uploadProgress} style={{ marginBottom: 16 }} />
          )}
          <Form layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item 
                label="本次上传成本票金额" 
                required
                extra={`最大可上传金额：${formatAmount((settlementData?.costInvoiceAmount || settlementData?.totalAmount || 0) - (settlementData?.costInvoiceReceived || 0))} 元`}
              >
                  <Input
                    type="number"
                    value={costInvoiceAmount || ''}
                    onChange={(e) => setCostInvoiceAmount(Number(e.target.value))}
                    placeholder="请输入本次上传金额"
                    suffix="元"
                    disabled={uploading}
                    min={0}
                    max={(settlementData?.costInvoiceAmount || settlementData?.totalAmount || 0) - (settlementData?.costInvoiceReceived || 0)}
                    status={costInvoiceAmount > ((settlementData?.costInvoiceAmount || settlementData?.totalAmount || 0) - (settlementData?.costInvoiceReceived || 0)) ? 'error' : undefined}
                  />
              </Form.Item>
              <Form.Item 
                label="成本票文件" 
                required
                extra="支持 PDF、JPG、PNG 格式，最大 10MB"
              >
                  <Upload 
                    fileList={costInvoiceFileList} 
                    onChange={({ fileList }) => setCostInvoiceFileList(fileList)} 
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
                    disabled={uploading}
                  >
                    <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
                      {uploading ? '上传中...' : '选择成本票文件'}
                    </Button>
                  </Upload>
              </Form.Item>
              <Form.Item 
                label="发票代码" 
                extra="选填，填写发票代码便于后续查询"
              >
                  <Input
                    value={costInvoiceCode}
                    onChange={(e) => setCostInvoiceCode(e.target.value)}
                    placeholder="请输入发票代码（选填）"
                    disabled={uploading}
                    maxLength={50}
                  />
              </Form.Item>
          </Form>
      </Modal>

      <Modal
         title="红冲票"
         open={isRedInvoiceModalOpen}
         onOk={async () => {
            if (!settlementData) return;
            if (redInvoiceAmount <= 0) {
               message.error('请输入有效的红冲金额');
               return;
            }
            const maxRedAmount = settlementData.costInvoiceReceived || settlementData.totalAmount || 0;
            if (redInvoiceAmount > maxRedAmount) {
               message.error(`红冲金额不能大于已上传成本票金额 ${formatAmount(maxRedAmount)} 元`);
               return;
            }
            
            setUploading(true);
            
            try {
               let proofUrl: string | undefined;
               
               if (redInvoiceFileList.length > 0) {
                  const uploadItem = redInvoiceFileList[0];
                  const file = uploadItem.originFileObj;
                  if (file) {
                     const uploadResult = await uploadFile(file);
                     proofUrl = uploadResult.fileUrl;
                  }
               }
               
               await uploadCostInvoice(settlementData.id, redInvoiceAmount, proofUrl, '红冲票');
               
               message.success('红冲票上传成功');
               setIsRedInvoiceModalOpen(false);
               setRedInvoiceAmount(0);
               setRedInvoiceFileList([]);
               loadSettlementDetail();
            } catch (error: any) {
               const errorMessage = error?.response?.data?.message || error?.message || '上传失败，请重试';
               message.error(errorMessage);
            } finally {
               setUploading(false);
            }
         }}
         onCancel={() => {
            setIsRedInvoiceModalOpen(false);
            setRedInvoiceAmount(0);
            setRedInvoiceFileList([]);
         }}
         confirmLoading={uploading}
      >
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
             <Descriptions.Item label="已上传成本票金额">
                <Text strong style={{ color: '#52c41a' }}>{formatAmount(settlementData?.costInvoiceReceived || settlementData?.totalAmount || 0)}</Text>
             </Descriptions.Item>
          </Descriptions>
          <Form layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item 
                label="红冲金额" 
                required
                extra={`最大可红冲金额：${formatAmount(settlementData?.costInvoiceReceived || settlementData?.totalAmount || 0)} 元`}
              >
                  <Input
                    type="number"
                    value={redInvoiceAmount}
                    onChange={(e) => setRedInvoiceAmount(Number(e.target.value))}
                    placeholder="请输入红冲金额"
                    suffix="元"
                    disabled={uploading}
                  />
              </Form.Item>
              <Form.Item label="红冲票文件" extra="支持 PDF、JPG、PNG 格式，最大 10MB">
                  <Upload 
                    fileList={redInvoiceFileList} 
                    onChange={({ fileList }) => setRedInvoiceFileList(fileList)} 
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
                    disabled={uploading}
                  >
                    <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
                      {uploading ? '上传中...' : '选择红冲票文件'}
                    </Button>
                  </Upload>
              </Form.Item>
          </Form>
      </Modal>

      <Modal
         title={
            <Space>
               <span>文件预览</span>
               {previewFile && (
                  <Tag color={previewFile.type === '红冲票' ? 'red' : 'blue'}>
                     {previewFile.type}
                  </Tag>
               )}
            </Space>
         }
         open={previewModalOpen}
         footer={[
            <Button key="close" onClick={() => setPreviewModalOpen(false)}>
               关闭
            </Button>,
            previewFile && (
               <Button 
                  key="download" 
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={async () => {
                     if (!previewFile.url) return;
                     try {
                        const response = await fetch(previewFile.url, { method: 'GET' });
                        if (!response.ok) throw new Error('下载失败');
                        
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = previewFile.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        message.success('下载成功');
                     } catch (error) {
                        message.error('下载失败，请重试');
                     }
                  }}
               >
                  下载文件
               </Button>
            )
         ]}
         onCancel={() => setPreviewModalOpen(false)}
         width={800}
         centered
      >
         {previewFile && (
            <div style={{ textAlign: 'center', minHeight: 400 }}>
               {previewFile.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <Image
                     src={previewFile.url}
                     alt={previewFile.name}
                     style={{ maxWidth: '100%', maxHeight: 500 }}
                     placeholder={<Spin tip="加载中..." />}
                     fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                     onError={() => message.error('图片加载失败')}
                  />
               ) : previewFile.url.match(/\.pdf$/i) ? (
                  <div>
                     <iframe
                        src={previewFile.url}
                        style={{ width: '100%', height: 500, border: 'none' }}
                        title="PDF预览"
                        onError={() => message.error('PDF加载失败')}
                     />
                  </div>
               ) : (
                  <div style={{ padding: 40 }}>
                     <FilePdfOutlined style={{ fontSize: 64, color: '#999', marginBottom: 16 }} />
                     <p>此文件类型不支持在线预览</p>
                     <p style={{ color: '#999' }}>{previewFile.name}</p>
                     <Button 
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                           try {
                              const response = await fetch(previewFile.url, { method: 'GET' });
                              if (!response.ok) throw new Error('下载失败');
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = previewFile.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                              message.success('下载成功');
                           } catch (error) {
                              message.error('下载失败，请重试');
                           }
                        }}
                     >
                        下载文件查看
                     </Button>
                  </div>
               )}
            </div>
         )}
      </Modal>

      {/* 操作结果反馈弹窗 */}
      <Modal
        title={resultData.success ? '操作成功' : '操作失败'}
        open={resultModalOpen}
        onOk={() => {
          setResultModalOpen(false);
          if (resultData.success) {
            // 成功后返回结算单列表页
            navigate('/supply-chain/settlement/supplier');
          }
        }}
        okText="确认"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={500}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {resultData.success ? (
            <div>
              <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 16 }}>{resultData.message}</h3>
              {resultData.settlementNo && (
                <p style={{ marginBottom: 8 }}><strong>结算单号：</strong>{resultData.settlementNo}</p>
              )}
              {resultData.timestamp && (
                <p style={{ marginBottom: 8 }}><strong>撤销时间：</strong>{resultData.timestamp}</p>
              )}
              <p style={{ color: '#666', marginTop: 16 }}>
                关联的{settlementData?.sourceType === '采购单' ? '采购单业务' : '配送单'}已释放回待结算{settlementData?.sourceType === '采购单' ? '采购单' : '配送单'}列表，您可以重新发起结算。
              </p>
            </div>
          ) : (
            <div>
              <CloseCircleOutlined style={{ fontSize: 64, color: '#ff4d4f', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 16 }}>{resultData.message}</h3>
              {resultData.errorReason && (
                <p style={{ marginBottom: 16, color: '#666' }}><strong>失败原因：</strong>{resultData.errorReason}</p>
              )}
              <p style={{ color: '#666' }}>请稍后重试，或联系系统管理员获取帮助。</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SupplierSettlementDetail;
