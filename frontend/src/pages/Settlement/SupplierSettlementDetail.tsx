import React, { useState } from 'react';
import { Card, Descriptions, Table, Tag, Timeline, Button, Space, Breadcrumb, Divider, Modal, Form, Input, Typography, Avatar, Row, Col, message, Steps } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UserOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import { getDisplayPaidAmount } from '../../utils/paymentValidation';

const { TextArea } = Input;
const { Text, Title } = Typography;

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

  // Mock Detail Data
  const [settlementInfo, setSettlementInfo] = useState({
     settlementNo: 'JS20231027001',
     payer: '平台运营主体',
     payee: '晨光文具股份有限公司',
     payeeAccountName: '晨光文具股份有限公司',
     payeeBank: '中国工商银行上海分行',
     payeeAccount: '622202100111222333',
     settlementType: 'Cash', // Cash or Prepayment
     applyAmount: 12000.00,
     paidAmount: 0.00,
     unpaidAmount: 12000.00,
     status: 'PendingApproval', // PendingApproval, Approved, Rejected, Paid
     createTime: '2023-10-27 10:00:00'
  });

  const [approvalSteps, setApprovalSteps] = useState([
    {
      title: '发起审批',
      description: '张三 (采购部) 2023-10-27 10:00:00',
      status: 'finish' as const,
    },
    {
        title: '部门审批',
        description: '李四 (采购总监) 2023-10-27 14:00:00',
        status: 'finish' as const,
    },
    {
        title: '财务审批',
        description: '待财务经理确认',
        status: 'process' as const,
    }
  ]);

  const [operationRecords, setOperationRecords] = useState<OperationRecord[]>([
    { id: '1', operator: '张三', department: '采购部', time: '2023-10-27 09:30:00', action: 'Create', remark: '创建结算单' },
    { id: '2', operator: '张三', department: '采购部', time: '2023-10-27 09:45:00', action: 'Upload', remark: '上传发票' },
    { id: '3', operator: '张三', department: '采购部', time: '2023-10-27 10:00:00', action: 'Submit', remark: '提交审批' },
    { id: '4', operator: '李四', department: '财务部', time: '2023-10-27 14:00:00', action: 'Reject', remark: '退回修改：缺附件' },
    { id: '5', operator: '张三', department: '采购部', time: '2023-10-27 15:00:00', action: 'Upload', remark: '补充发票' },
    { id: '6', operator: '张三', department: '采购部', time: '2023-10-27 15:05:00', action: 'Submit', remark: '重新提交' },
    { id: '7', operator: '李四', department: '财务部', time: '2023-10-27 16:00:00', action: 'Approve', remark: '审批通过' },
  ]);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'PendingApproval': return <Tag color="processing" icon={<ClockCircleOutlined />}>待审批</Tag>;
      case 'Approved': return <Tag color="success" icon={<CheckCircleOutlined />}>已通过</Tag>;
      case 'Rejected': return <Tag color="error" icon={<CloseCircleOutlined />}>已驳回</Tag>;
      case 'Revoked': return <Tag color="default" icon={<CloseCircleOutlined />}>已撤销</Tag>;
      case 'Paid': return <Tag color="green" icon={<CheckCircleOutlined />}>已付款</Tag>;
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
          case 'Pay': return '确认付款';
          case 'Revoke': return '撤销申请';
          default: return action;
      }
  };

  const handleAction = (action: 'Approve' | 'Reject' | 'Revoke') => {
      setCurrentAction(action);
      setActionModalOpen(true);
      form.resetFields();
  };

  const submitAction = () => {
      form.validateFields().then(values => {
          const newRecord: OperationRecord = {
              id: Date.now().toString(),
              operator: '当前用户', // Mock current user
              department: '财务部',
              time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
              action: currentAction!,
              remark: values.remark
          };
          
          // Add to end (chronological)
          setOperationRecords(prev => [...prev, newRecord]); 
          
          let newStatus = settlementInfo.status;
          if (currentAction === 'Approve') newStatus = 'Approved';
          if (currentAction === 'Reject') newStatus = 'Rejected';
          if (currentAction === 'Revoke') newStatus = 'Revoked';

          setSettlementInfo(prev => ({
              ...prev,
              status: newStatus
          }));

          if (currentAction === 'Reject' || currentAction === 'Revoke') {
              message.warning(`${getActionText(currentAction!)}成功，关联采购单已自动退回“待结算”列表。`);
          } else {
              message.success(`${getActionText(currentAction!)}成功`);
          }
          
          setActionModalOpen(false);
      });
  };


  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 供应商结算单 > 供应商结算单详情"
        description={`供应商结算单详情页。

1. **页面布局**：
   - **头部信息区**：展示当前状态和申请时间。
   - **基本信息**：展示结算单核心字段及金额信息。
   - **关联单据**：展示本次结算包含的采购单及变动明细。
   - **审批记录**：竖向展示标准审批流程（发起审批 -> 部门审批 -> 财务审批）。
   - **操作记录**：按时间倒序展示完整的操作历史（含创建、上传、审批等）。
   - **底部操作区**：提供审批通过、驳回、撤销及返回等操作按钮。

2. **业务规则说明**：
   - **状态流转**：
     - 待审批 (PendingApproval) -> 审批通过 (Approved)
     - 待审批 (PendingApproval) -> 审批驳回 (Rejected)
     - 待审批 (PendingApproval) -> 已撤销 (Revoked)
   - **流程控制**：
     - **单次流程**：审批流一旦被驳回或撤销，当前结算单流程终止，不可再次发起审批。
     - **数据释放**：关联的所有采购单自动返回“待结算订单”列表，支持重新创建新的结算单。

3. **操作说明**：
   - **审批操作**：通过/驳回需填写备注。
   - **撤销申请**：仅发起人可操作，需填写备注。`}
        fields={[
          { name: 'settlementNo', type: 'String', length: '32', required: true, desc: '结算单号' },
          { name: 'settlementType', type: 'Enum', required: true, desc: '结算类型（现付/预付）' },
          { name: 'payee', type: 'String', required: true, desc: '收款方（供应商）' },
          { name: 'applyAmount', type: 'Decimal', length: '10,2', required: true, desc: '申请结算金额' },
          { name: 'status', type: 'Enum', required: true, desc: '审批状态' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/supplier-settlement')}>供应商结算单列表</a> },
         { title: '结算单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
         {/* Top Info */}
         <Card bordered={false} bodyStyle={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Space>
                    <span style={{ color: '#888' }}>当前状态：</span>
                    {getStatusTag(settlementInfo.status)}
                    <span style={{ color: '#ccc', margin: '0 8px' }}>|</span>
                    <span style={{ color: '#888' }}>申请时间：{settlementInfo.createTime}</span>
                </Space>
            </div>
         </Card>

         <Card title="基本信息" bordered={false}>
            <Descriptions column={3}>
               <Descriptions.Item label="结算单号">{settlementInfo.settlementNo}</Descriptions.Item>
               <Descriptions.Item label="结算类型">
                  <Tag color={settlementInfo.settlementType === 'Prepayment' ? 'orange' : 'blue'}>
                    {settlementInfo.settlementType === 'Prepayment' ? '预付' : '现付'}
                  </Tag>
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
                  { key: 1, poNo: 'C231027001', bizNo: 'SO2023...', type: '订单采购', spec: 'A4纸', time: '2023-10-27', amount: 5000.00 }
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

         {settlementInfo.settlementType !== 'Prepayment' && (
            <Card title="审批记录" bordered={false}>
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

         {/* Bottom Actions */}
         <Card bordered={false} bodyStyle={{ padding: '16px 24px', textAlign: 'right' }}>
             <Space>
                <Button onClick={() => navigate(-1)}>返回</Button>
                {settlementInfo.settlementType !== 'Prepayment' && settlementInfo.status === 'PendingApproval' && (
                    <>
                      <Button onClick={() => handleAction('Revoke')}>撤销申请</Button>
                      <Button danger onClick={() => handleAction('Reject')}>审批驳回</Button>
                      <Button type="primary" onClick={() => handleAction('Approve')}>审批通过</Button>
                    </>
                )}
                {settlementInfo.settlementType !== 'Prepayment' && (settlementInfo.status === 'Rejected' || settlementInfo.status === 'Revoked') && (
                    <Tag color="warning" style={{ fontSize: 14, padding: '4px 12px' }}>
                        单据已锁定，关联采购单已释放
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
                label="审批备注" 
                name="remark" 
                rules={[{ required: true, message: '请输入审批备注' }]}
              >
                  <TextArea rows={4} placeholder="请输入审批意见..." />
              </Form.Item>
          </Form>
      </Modal>
    </div>
  );
};

export default SupplierSettlementDetail;
