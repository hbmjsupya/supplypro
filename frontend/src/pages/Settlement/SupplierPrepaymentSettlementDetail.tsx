import React, { useState } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, Breadcrumb, Typography, Avatar } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UserOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import { getDisplayPaidAmount } from '../../utils/paymentValidation';

const { Text } = Typography;

interface OperationRecord {
  id: string;
  operator: string;
  department: string;
  time: string;
  action: string;
  remark: string;
}

const SupplierPrepaymentSettlementDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [expandHistory, setExpandHistory] = useState(true);

  // Mock Detail Data for Prepayment
  const [settlementInfo, setSettlementInfo] = useState({
     settlementNo: 'JS20231027002',
     payer: '平台运营主体',
     payee: '三星电子',
     payeeAccountName: '三星电子',
     payeeBank: '中国银行',
     payeeAccount: '622202100111222444',
     settlementType: 'Prepayment',
     applyAmount: 5400.50,
     paidAmount: 5400.50,
     unpaidAmount: 0.00,
     status: 'Paid', 
     createTime: '2023-10-26 10:00:00'
  });

  const [operationRecords, setOperationRecords] = useState<OperationRecord[]>([
    { id: '1', operator: 'Jane Smith', department: '采购部', time: '2023-10-26 09:30:00', action: 'Create', remark: '自动生成预付扣款单' },
    { id: '2', operator: 'System', department: '系统', time: '2023-10-26 10:00:00', action: 'Pay', remark: '预付款自动抵扣' },
  ]);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'PendingApproval': return <Tag color="processing" icon={<ClockCircleOutlined />}>待审批</Tag>;
      case 'Approved': return <Tag color="success" icon={<CheckCircleOutlined />}>已通过</Tag>;
      case 'Rejected': return <Tag color="error" icon={<CloseCircleOutlined />}>已驳回</Tag>;
      case 'Revoked': return <Tag color="default" icon={<CloseCircleOutlined />}>已撤销</Tag>;
      case 'Paid': return <Tag color="green" icon={<CheckCircleOutlined />}>已付款</Tag>; // Or "已抵扣" for prepayment
      default: return <Tag>未知</Tag>;
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
          case 'Approve': return '审批通过';
          case 'Reject': return '审批驳回';
          case 'Pay': return '确认付款'; // or 自动抵扣
          case 'Revoke': return '撤销申请';
          default: return action;
      }
  };

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 供应商结算单 > 预付结算单详情"
        description={`预付类型结算单详情页。

1. **页面特点**：
   - **无审批流程**：预付类型通常为自动扣款或即时交易，不涉及多级审批流。
   - **信息展示**：重点展示结算金额变动及关联的预付账户变动。
   
2. **页面布局**：
   - **头部信息区**：展示当前状态和创建时间。
   - **基本信息**：展示结算单核心字段及金额信息。
   - **关联单据**：展示本次结算包含的采购单及变动明细。
   - **操作记录**：按时间倒序展示系统自动处理或人工操作的历史记录。
   - **底部操作区**：仅提供返回按钮。`}
        fields={[
          { name: 'settlementNo', type: 'String', length: '32', required: true, desc: '结算单号' },
          { name: 'settlementType', type: 'Enum', required: true, desc: '结算类型（预付）' },
          { name: 'payee', type: 'String', required: true, desc: '收款方（供应商）' },
          { name: 'applyAmount', type: 'Decimal', length: '10,2', required: true, desc: '申请结算金额' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/supplier-settlement')}>供应商结算单列表</a> },
         { title: '预付结算单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
         {/* Top Info */}
         <Card bordered={false} bodyStyle={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Space>
                    <span style={{ color: '#888' }}>当前状态：</span>
                    {getStatusTag(settlementInfo.status)}
                    <span style={{ color: '#ccc', margin: '0 8px' }}>|</span>
                    <span style={{ color: '#888' }}>创建时间：{settlementInfo.createTime}</span>
                </Space>
            </div>
         </Card>

         <Card title="基本信息" bordered={false}>
            <Descriptions column={3}>
               <Descriptions.Item label="结算单号">{settlementInfo.settlementNo}</Descriptions.Item>
               <Descriptions.Item label="结算类型">
                  <Tag color="orange">预付</Tag>
               </Descriptions.Item>
               <Descriptions.Item label="付款方">{settlementInfo.payer}</Descriptions.Item>
               <Descriptions.Item label="收款方">{settlementInfo.payee}</Descriptions.Item>
               <Descriptions.Item label="收款开户名">{settlementInfo.payeeAccountName}</Descriptions.Item>
               <Descriptions.Item label="开户总行">{settlementInfo.payeeBank}</Descriptions.Item>
               <Descriptions.Item label="收款账号">{settlementInfo.payeeAccount}</Descriptions.Item>
               <Descriptions.Item label="申请结算金额"><Text strong style={{ fontSize: 16 }}>¥{settlementInfo.applyAmount.toLocaleString()}</Text></Descriptions.Item>
               <Descriptions.Item label="已付金额">
                   {getDisplayPaidAmount(settlementInfo.applyAmount, settlementInfo.paidAmount)}
               </Descriptions.Item>
               <Descriptions.Item label="未付金额">¥{settlementInfo.unpaidAmount.toLocaleString()}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title="关联采购单列表" bordered={false}>
            <Table 
               pagination={false}
               dataSource={[
                  { key: 1, poNo: 'C231026005', bizNo: 'SO2023...', type: '订单采购', spec: '显示器', time: '2023-10-26', amount: 5400.50 }
               ]}
               columns={[
                  { title: '采购单号', dataIndex: 'poNo' },
                  { title: '三方订单号/业务单号', dataIndex: 'bizNo' },
                  { title: '变动类型', dataIndex: 'type' },
                  { title: '商品规格', dataIndex: 'spec' },
                  { title: '变动时间', dataIndex: 'time' },
                  { title: '应结算金额', dataIndex: 'amount', render: (v) => `¥${v.toLocaleString()}` },
               ]}
            />
         </Card>

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
            bordered={false}
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

         {/* Bottom Actions - Only Back */}
         <Card bordered={false} bodyStyle={{ padding: '16px 24px', textAlign: 'right' }}>
             <Space>
                <Button onClick={() => navigate(-1)}>返回</Button>
             </Space>
         </Card>
      </Space>
    </div>
  );
};

export default SupplierPrepaymentSettlementDetail;
