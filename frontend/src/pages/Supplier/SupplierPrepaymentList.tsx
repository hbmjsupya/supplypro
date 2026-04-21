import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Tag, message, Breadcrumb, Modal, Form, Upload, Row, Col, Select, Descriptions, Typography, Dropdown, Progress, InputNumber } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { PlusOutlined, FileTextOutlined, UploadOutlined, EyeOutlined, MoreOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import request from '../../utils/request';
import { getSupplierById } from '../../services/supplierService';
import { formatTimeFull } from '../../utils/dateFormatter';
import { uploadFile } from '../../services/fileService';

const { Text } = Typography;

interface PrepaymentApplyItem {
  key: string;
  id: string;
  numericId: number;
  appliedAmount: number;
  paidAmount: number;
  lastPaymentTime: string;
  applyTime: string;
  applicant: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'WITHDRAWN';
  costInvoiceAmount: number;
  costInvoiceReceived: number;
  costInvoiceStatus: string;
}

interface SupplierAccount {
  id: number;
  type: 'COMPANY' | 'PERSONAL';
  name: string;
  bank: string;
  account: string;
  isDefault: boolean;
  status: boolean;
}

const SupplierPrepaymentList: React.FC = () => {
  const navigate = useNavigate();
  const { id: supplierId } = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isLogistics = location.pathname.includes('/logistics-provider/prepayment') || searchParams.get('ownerType') === 'logistics';
  const [data, setData] = useState<PrepaymentApplyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [supplierName, setSupplierName] = useState('');
  const [accounts, setAccounts] = useState<SupplierAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  
  const [isCostInvoiceModalOpen, setIsCostInvoiceModalOpen] = useState(false);
  const [isRedInvoiceModalOpen, setIsRedInvoiceModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<PrepaymentApplyItem | null>(null);
  const [costInvoiceFileList, setCostInvoiceFileList] = useState<UploadFile[]>([]);
  const [costInvoiceAmount, setCostInvoiceAmount] = useState<number>(0);
  const [costInvoiceCode, setCostInvoiceCode] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const [newInvoiceFileList, setNewInvoiceFileList] = useState<UploadFile[]>([]);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState<number>(0);
  const [newInvoiceCode, setNewInvoiceCode] = useState<string>('');

  useEffect(() => {
    if (supplierId) {
      fetchData();
      fetchSupplierInfo();
    }
  }, [supplierId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = isLogistics 
        ? { logisticsProviderId: supplierId }
        : { supplierId };
      const res: any = await request.get('/prepayment-approvals', { params });
      const records = res.records || [];
      const mapped: PrepaymentApplyItem[] = records.map((item: any) => ({
        key: item.approvalNo,
        id: item.approvalNo,
        numericId: item.id,
        appliedAmount: item.appliedAmount,
        paidAmount: item.actualAmount ?? 0,
        lastPaymentTime: formatTimeFull(item.cashierAt),
        applyTime: formatTimeFull(item.createdAt),
        applicant: item.createdBy || '-',
        status: item.status,
        costInvoiceAmount: Number(item.costInvoiceAmount) || Number(item.appliedAmount) || 0,
        costInvoiceReceived: Number(item.costInvoiceReceived) || 0,
        costInvoiceStatus: item.costInvoiceStatus || '未上传',
      }));
      setData(mapped);
    } catch {
      message.error('获取预付款列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierInfo = async () => {
    if (!supplierId) return;
    try {
      if (isLogistics) {
        const res: any = await request.get(`/logistics/${supplierId}`);
        const lpData = res.data || res;
        setSupplierName(lpData.name || '');
        
        const accRes: any = await request.get(`/logistics/${supplierId}/accounts`);
        const accData = accRes.data || accRes;
        const accountList = Array.isArray(accData) ? accData : [];
        setAccounts(accountList);
        
        const defaultAccount = accountList.find((a: SupplierAccount) => a.isDefault);
        if (defaultAccount) {
          setSelectedAccountId(defaultAccount.id);
        } else if (accountList.length > 0) {
          setSelectedAccountId(accountList[0].id);
        }
      } else {
        const supplier: any = await getSupplierById(Number(supplierId));
        setSupplierName(supplier.name || '');
        
        const accRes: any = await request.get(`/suppliers/${supplierId}/accounts`);
        const accData = accRes.data || accRes;
        const accountList = Array.isArray(accData) ? accData : [];
        setAccounts(accountList);
        
        const defaultAccount = accountList.find((a: SupplierAccount) => a.isDefault);
        if (defaultAccount) {
          setSelectedAccountId(defaultAccount.id);
        } else if (accountList.length > 0) {
          setSelectedAccountId(accountList[0].id);
        }
      }
    } catch {
      console.error('获取供应商信息失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      payerName: '我的企业',
      payerAccount: '1234567890',
      payerBank: '招商银行',
    });
    if (accounts.length > 0) {
      const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
      setSelectedAccountId(defaultAccount.id);
    }
    setNewInvoiceFileList([]);
    setNewInvoiceAmount(0);
    setNewInvoiceCode('');
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const selectedAccount = accounts.find(a => a.id === selectedAccountId);
      
      if (!selectedAccount) {
        message.warning('请选择收款账户');
        return;
      }

      const hasInvoiceAmount = newInvoiceAmount > 0;
      const hasInvoiceCode = newInvoiceCode.trim() !== '';
      const hasInvoiceFile = newInvoiceFileList.length > 0;
      const hasAnyInvoiceInfo = hasInvoiceAmount || hasInvoiceCode || hasInvoiceFile;
      
      if (hasAnyInvoiceInfo) {
        if (!hasInvoiceAmount) {
          message.warning('填写了成本票信息时，成本票金额为必填项');
          return;
        }
        if (!hasInvoiceFile) {
          message.warning('填写了成本票信息时，成本票文件为必填项');
          return;
        }
      }

      let costInvoiceFiles: any[] = [];
      if (hasInvoiceFile && hasInvoiceAmount) {
        for (const fileItem of newInvoiceFileList) {
          if (fileItem.originFileObj) {
            const uploadResult = await uploadFile(fileItem.originFileObj);
            costInvoiceFiles.push({
              url: uploadResult.fileUrl,
              amount: newInvoiceAmount,
              invoiceCode: newInvoiceCode || '',
              type: '成本票',
              uploadTime: new Date().toISOString()
            });
          } else if (fileItem.url) {
            costInvoiceFiles.push({
              url: fileItem.url,
              amount: newInvoiceAmount,
              invoiceCode: newInvoiceCode || '',
              type: '成本票',
              uploadTime: new Date().toISOString()
            });
          }
        }
      }

      const payload: any = {
        appliedAmount: values.amount != null ? Number(values.amount) : 0,
        payerName: values.payerName,
        payerAccount: values.payerAccount,
        payerBank: values.payerBank,
        payeeName: selectedAccount.name,
        payeeAccount: selectedAccount.account,
        payeeBank: selectedAccount.bank,
        contactName: '-',
        contactPhone: '-',
        applyRemark: values.note || '',
        attachments: '[]',
        createdBy: '当前用户',
        costInvoiceAmount: values.amount != null ? Number(values.amount) : 0,
        costInvoiceFiles: costInvoiceFiles.length > 0 ? JSON.stringify(costInvoiceFiles) : undefined
      };
      
      if (isLogistics) {
        payload.logisticsProviderId = Number(supplierId);
      } else {
        payload.supplierId = Number(supplierId);
      }

      await request.post('/prepayment-approvals', payload);
      message.success('预付款申请已提交');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      message.error('提交失败，请检查表单');
    }
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
          PENDING: 'orange',
          APPROVED: 'blue',
          REJECTED: 'red',
          PAID: 'green',
          WITHDRAWN: 'default'
        };
        const textMap: Record<string, string> = {
          PENDING: '待审批',
          APPROVED: '待付款',
          REJECTED: '已驳回',
          PAID: '已付款',
          WITHDRAWN: '已撤回'
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
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
          '未上传': { color: 'default', text: '未上传' }
        };
        const config = statusMap[status] || { color: 'default', text: status || '未上传' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown menu={{ items: getActionItems(record) }} trigger={['click']}>
            <Button type="link" size="small">
              操作 <MoreOutlined />
            </Button>
          </Dropdown>
        </div>
      )
    }
  ];

  const getActionItems = (record: PrepaymentApplyItem): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        label: '查看详情',
        icon: <EyeOutlined />,
        onClick: () => navigate(isLogistics ? `/supply-chain/logistics-provider/prepayment-detail/${record.id}` : `/supply-chain/supplier/prepayment-detail/${record.id}${isLogistics ? '?ownerType=logistics' : ''}`)
      }
    ];

    const costInvoiceUploaded = record.costInvoiceStatus === '已上传';
    
    if (record.appliedAmount > 0 && !costInvoiceUploaded) {
      items.push({
        key: 'upload_invoice',
        label: '上传成本票',
        icon: <UploadOutlined />,
        onClick: () => { 
          setCurrentRecord(record); 
          setCostInvoiceAmount(0);
          setCostInvoiceFileList([]);
          setCostInvoiceCode('');
          setIsCostInvoiceModalOpen(true); 
        }
      });
    }

    if (record.appliedAmount > 0 && costInvoiceUploaded) {
      items.push({
        key: 'red_invoice',
        label: '红冲票',
        icon: <MinusCircleOutlined />,
        onClick: () => { 
          setCurrentRecord(record); 
          setCostInvoiceAmount(0);
          setCostInvoiceFileList([]);
          setIsRedInvoiceModalOpen(true); 
        }
      });
    }

    return items;
  };

  const handleUploadCostInvoice = async () => {
    if (!currentRecord) return;
    
    const unreceivedAmount = currentRecord.costInvoiceAmount - currentRecord.costInvoiceReceived;
    
    if (costInvoiceAmount <= 0) {
      message.error('请输入有效的上传金额');
      return;
    }
    
    if (costInvoiceAmount > unreceivedAmount) {
      message.error(`上传金额不能大于未收金额 ¥${unreceivedAmount.toFixed(2)}`);
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
      await request.put(`/prepayment-approvals/${currentRecord.numericId}/cost-invoice`, {
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

  const handleUploadRedInvoice = async () => {
    if (!currentRecord) return;
    
    const maxRedAmount = currentRecord.costInvoiceReceived || currentRecord.costInvoiceAmount || 0;
    
    if (costInvoiceAmount <= 0) {
      message.error('请输入有效的红冲金额');
      return;
    }
    
    if (costInvoiceAmount > maxRedAmount) {
      message.error(`红冲金额不能大于已上传成本票金额 ¥${maxRedAmount.toFixed(2)}`);
      return;
    }
    
    if (costInvoiceFileList.length === 0) {
      message.error('请选择红冲票文件');
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
      await request.put(`/prepayment-approvals/${currentRecord.numericId}/cost-invoice`, {
        amount: -costInvoiceAmount,
        fileUrl,
        invoiceCode: costInvoiceCode || undefined,
        type: '红冲票'
      });
      setUploadProgress(100);
      
      message.success('红冲票上传成功');
      setIsRedInvoiceModalOpen(false);
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

  const getSelectedAccount = () => {
    return accounts.find(a => a.id === selectedAccountId);
  };

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle={isLogistics ? "供应链管理 > 物流供应商管理 > 预付款审批列表" : "供应链管理 > 供应商管理 > 预付款审批列表"}
        description={isLogistics ? "管理物流供应商的预付款申请及审批流程。支持按单号、付款日期、申请人及审批状态进行组合搜索。" : "管理供应商的预付款申请及审批流程。支持按单号、付款日期、申请人及审批状态进行组合搜索。"}
        fields={[
           { name: 'id', type: 'String', desc: '预付款单号 (YF+年月日时分+两位顺序号)', required: false },
           { name: 'appliedAmount', type: 'Decimal', desc: '申请金额' },
           { name: 'lastPaymentTime', type: 'DateTime', desc: '最后付款时间：自动获取该单据关联的最近一次付款时间' },
           { name: 'status', type: 'Enum', desc: '状态：待审批、待付款、已付款、已驳回' }
        ]}
      />

      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate(isLogistics ? '/supply-chain/logistics-provider' : '/supply-chain/supplier')}>{isLogistics ? '物流供应商管理' : '供应商管理'}</a> },
         { title: '预付款审批列表' }
      ]} />

      <SearchFormLayout onSearch={() => {}} onReset={() => {}}>
         <Form.Item label="预付款单号" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" />
         </Form.Item>
         <Form.Item label="申请人" style={{ marginBottom: 0 }}>
            <Input placeholder="请输入" />
         </Form.Item>
         <Form.Item label="状态" style={{ marginBottom: 0 }}>
            <Select placeholder="全部" allowClear>
               <Select.Option value="PENDING">待审批</Select.Option>
               <Select.Option value="APPROVED">待付款</Select.Option>
               <Select.Option value="PAID">已付款</Select.Option>
               <Select.Option value="REJECTED">已驳回</Select.Option>
            </Select>
         </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增预付款</Button>
          <Button icon={<FileTextOutlined />} onClick={() => navigate(isLogistics ? `/supply-chain/logistics-provider/prepayment-log/${supplierId}` : `/supply-chain/supplier/prepayment-log/${supplierId}${isLogistics ? '?ownerType=logistics' : ''}`)}>查看资金流水</Button>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        onRow={(record) => {
          return {
            onClick: () => {
              navigate(isLogistics ? `/supply-chain/logistics-provider/prepayment-detail/${record.id}` : `/supply-chain/supplier/prepayment-detail/${record.id}`);
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

          <Form.Item label="收款账户" required>
            <Select
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="请选择收款账户"
              style={{ width: '100%' }}
            >
              {accounts.map(acc => (
                <Select.Option key={acc.id} value={acc.id}>
                  <div style={{ padding: '4px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>{acc.name}</span>
                      <Space size={4}>
                        <Tag color={acc.type === 'COMPANY' ? 'green' : 'orange'}>
                          {acc.type === 'COMPANY' ? '对公账户' : '对私账户'}
                        </Tag>
                        {acc.isDefault && <Tag color="blue">默认</Tag>}
                      </Space>
                    </div>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                      开户行：{acc.bank} | 账号：{acc.account}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
            {accounts.length === 0 && (
              <div style={{ color: '#999', marginTop: 8 }}>该供应商暂无可用结算账户</div>
            )}
          </Form.Item>

          <Form.Item name="amount" label="申请金额" rules={[{ required: true }]}>
             <InputNumber 
                prefix="¥" 
                min={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入申请金额" 
             />
          </Form.Item>
          
          <Form.Item label="成本票信息">
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 16, background: '#fafafa' }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>
                提示：成本票信息为选填。若填写任意一项，则成本票金额和成本票文件为必填项。
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="成本票金额" style={{ marginBottom: 8 }}>
                    <InputNumber 
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                      value={newInvoiceAmount || undefined}
                      onChange={(v) => setNewInvoiceAmount(v || 0)}
                      placeholder="请输入成本票金额"
                      suffix="元"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="发票代码" style={{ marginBottom: 8 }}>
                    <Input 
                      value={newInvoiceCode}
                      onChange={(e) => setNewInvoiceCode(e.target.value)}
                      placeholder="请输入发票代码（选填）"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="成本票文件" style={{ marginBottom: 0 }}>
                <Upload
                  fileList={newInvoiceFileList}
                  onChange={({ fileList }) => setNewInvoiceFileList(fileList)}
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
                >
                  <Button icon={<UploadOutlined />}>上传成本票文件</Button>
                </Upload>
                <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                  支持 PDF、JPG、PNG 格式，最大 10MB
                </div>
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item name="note" label="申请备注">
            <Input.TextArea rows={3} />
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
        <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="应收成本票金额">
            <Text strong>¥{(currentRecord?.costInvoiceAmount || 0).toFixed(2)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="已收成本票金额">
            <Text strong style={{ color: '#52c41a' }}>¥{(currentRecord?.costInvoiceReceived || 0).toFixed(2)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="未收成本票金额">
            <Text strong style={{ color: '#ff4d4f' }}>
              ¥{((currentRecord?.costInvoiceAmount || 0) - (currentRecord?.costInvoiceReceived || 0)).toFixed(2)}
            </Text>
          </Descriptions.Item>
        </Descriptions>
        {uploading && uploadProgress > 0 && (
          <Progress percent={uploadProgress} style={{ marginBottom: 16 }} />
        )}
        <Form layout="vertical">
          <Form.Item label="本次上传成本票金额" required>
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              value={costInvoiceAmount || undefined}
              onChange={(v) => setCostInvoiceAmount(v || 0)}
              placeholder={`最大可上传金额：¥${((currentRecord?.costInvoiceAmount || 0) - (currentRecord?.costInvoiceReceived || 0)).toFixed(2)}`}
              suffix="元"
              disabled={uploading}
            />
          </Form.Item>
          <Form.Item label="发票代码">
            <Input
              value={costInvoiceCode}
              onChange={(e) => setCostInvoiceCode(e.target.value)}
              placeholder="请输入发票代码（选填）"
              disabled={uploading}
            />
          </Form.Item>
          <Form.Item label="成本票文件" required>
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
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="红冲票"
        open={isRedInvoiceModalOpen}
        onOk={handleUploadRedInvoice}
        onCancel={() => {
          setIsRedInvoiceModalOpen(false);
          setCostInvoiceAmount(0);
          setCostInvoiceFileList([]);
          setCostInvoiceCode('');
        }}
        confirmLoading={uploading}
      >
        <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="已上传成本票金额">
            <Text strong style={{ color: '#52c41a' }}>¥{(currentRecord?.costInvoiceReceived || currentRecord?.costInvoiceAmount || 0).toFixed(2)}</Text>
          </Descriptions.Item>
        </Descriptions>
        {uploading && uploadProgress > 0 && (
          <Progress percent={uploadProgress} style={{ marginBottom: 16 }} />
        )}
        <Form layout="vertical">
          <Form.Item label="红冲金额" required>
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              value={costInvoiceAmount || undefined}
              onChange={(v) => setCostInvoiceAmount(v || 0)}
              placeholder={`最大可红冲金额：¥${(currentRecord?.costInvoiceReceived || currentRecord?.costInvoiceAmount || 0).toFixed(2)}`}
              suffix="元"
              disabled={uploading}
            />
          </Form.Item>
          <Form.Item label="发票代码">
            <Input
              value={costInvoiceCode}
              onChange={(e) => setCostInvoiceCode(e.target.value)}
              placeholder="请输入发票代码（选填）"
              disabled={uploading}
            />
          </Form.Item>
          <Form.Item label="红冲票文件" required>
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
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupplierPrepaymentList;
