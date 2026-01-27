import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Timeline, Button, Space, message, Modal, Breadcrumb, Spin, Steps } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';

const PriceAdjustmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [currentAdjustItem, setCurrentAdjustItem] = useState<any>(null);
  const [currentPOList, setCurrentPOList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock Data State
  const [data, setData] = useState<any>({
      adjustNo: '',
      status: '',
      applicant: '',
      applyTime: '',
      items: [],
      history: []
  });

  const approvalSteps = [
      { title: '发起审批', description: '张三 (2023-10-27 10:00)' },
      { title: '部门审批', description: '李四 (待审批)' },
      { title: '财务审批', description: '待处理' }
  ];

  useEffect(() => {
     // Simulate API fetch
     setTimeout(() => {
        setData({
            adjustNo: 'RC23102701',
            status: 'Pending',
            applicant: '张三',
            applyTime: '2023-10-27 10:00:00',
            items: [
                { key: 1, name: '晨光A4打印纸', spec: '70g/500张/包', oldCost: 18.00, newCost: 19.00, diff: 1.00, count: 100, poCount: 1 }
            ],
            history: [
                { key: 1, time: '2023-10-27 10:00:00', operator: '张三', action: '发起申请', remark: '原材料价格上涨' },
                { key: 2, time: '2023-10-27 10:05:00', operator: '系统', action: '自动校验', remark: '校验通过' }
            ]
        });
        setLoading(false);
     }, 1000);
  }, [id]);
  
  const handleShowDetail = (record: any) => {
     setCurrentAdjustItem({
        ...record,
        reason: '原材料价格上涨', // Mock reason
        operator: data.applicant,
        time: data.applyTime
     });
     setIsDetailModalOpen(true);
  };

  const handleShowPOs = (record: any) => {
     // Mock PO list based on record
     const mockPOs = [
         {
             key: '1',
             poNo: 'PO2023102701',
             productName: record.name,
             specName: record.spec,
             count: 50,
             oldCost: record.oldCost,
             oldCostTotal: (50 * record.oldCost).toFixed(2)
         },
         {
             key: '2',
             poNo: 'PO2023102702',
             productName: record.name,
             specName: record.spec,
             count: 50,
             oldCost: record.oldCost,
             oldCostTotal: (50 * record.oldCost).toFixed(2)
         }
     ];
     setCurrentPOList(mockPOs);
     setIsPOModalOpen(true);
  };

  if (loading) {
     return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 采购调价单列表 > 采购调价单详情"
        description={`采购调价单详情页。

1. **页面布局**：
   - **头部信息**：调价单号、审批状态。
   - **调价信息**：商品/规格、数量（点击可查看调价详情弹窗）、原/现成本单价、差价。
   - **关联单据**：采购单数量（点击弹窗展示关联采购单列表，含数量及原成本合计）。
   - **审批流程**：竖向展示审批节点进度。
   - **操作记录**：表格展示完整操作历史。

2. **角色操作权限**：
   - **发起人**：
     - 待审批/审批中：可撤销申请。
     - 已拒回/已撤销：仅查看。
   - **审批人**：
     - 待审批/审批中：可通过或拒回。

3. **异常处理**：
   - **详情加载**：若调价单不存在或无权限，提示“无法加载调价单详情”。
   - **审批操作**：审批提交失败（如网络中断），提示“审批失败，请重试”。
   - **并发提示**：若调价单已被他人审批，提示“该单据已由其他用户处理”。`}
        fields={[
          { name: 'adjustNo', type: 'String', length: '32', required: true, desc: '调价单号' },
          { name: 'status', type: 'Enum', required: true, desc: '审批状态' },
          { name: 'applicant', type: 'String', required: true, desc: '申请人' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/price-adjustment')}>采购调价单列表</a> },
         { title: '调价单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
         {/* Actions */}
         <Card bordered={false}>
            <Space>
               <Button onClick={() => navigate(-1)}>返回</Button>
               <Button danger>撤销</Button>
               {/* Approval buttons would go here for approver role */}
            </Space>
         </Card>

         <Card title="基本信息" bordered={false}>
            <Descriptions column={2}>
               <Descriptions.Item label="调价单号">{data.adjustNo}</Descriptions.Item>
               <Descriptions.Item label="审批状态"><Tag color="blue">{data.status}</Tag></Descriptions.Item>
               <Descriptions.Item label="申请人">{data.applicant}</Descriptions.Item>
               <Descriptions.Item label="申请时间">{data.applyTime}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title="调价信息" bordered={false}>
            <Table 
               pagination={false}
               dataSource={data.items}
               columns={[
                  { title: '商品名称', dataIndex: 'name' },
                  { title: '规格名称', dataIndex: 'spec' },
                  { title: '原成本单价', dataIndex: 'oldCost', render: v => `¥${v}` },
                  { title: '现成本单价', dataIndex: 'newCost', render: v => `¥${v}` },
                  { title: '差价', dataIndex: 'diff', render: v => `¥${v}` },
                  { title: '商品数量', dataIndex: 'count', render: (v, record) => <a onClick={() => handleShowDetail(record)}>{v}</a> },
                  { title: '采购单数量', dataIndex: 'poCount', render: (v, record) => <a onClick={() => handleShowPOs(record)}>{v}</a> },
               ]}
            />
         </Card>

         <Card title="审批流程" bordered={false}>
            <Steps
               direction="vertical"
               current={1}
               items={approvalSteps}
            />
         </Card>

         <Card title="操作记录" bordered={false}>
            <Table 
               dataSource={data.history}
               pagination={false}
               columns={[
                  { title: '操作时间', dataIndex: 'time' },
                  { title: '操作人', dataIndex: 'operator' },
                  { title: '操作类型', dataIndex: 'action' },
                  { title: '备注', dataIndex: 'remark' }
               ]}
            />
         </Card>
      </Space>

      <Modal
         title="关联采购单列表"
         open={isPOModalOpen}
         onCancel={() => setIsPOModalOpen(false)}
         footer={null}
         width={800}
      >
          <Table
              dataSource={currentPOList}
              pagination={false}
              columns={[
                  { title: '采购单号', dataIndex: 'poNo' },
                  { title: '商品名称', dataIndex: 'productName' },
                  { title: '规格名称', dataIndex: 'specName' },
                  { title: '数量', dataIndex: 'count' },
                  { title: '原成本价', dataIndex: 'oldCost', render: v => `¥${v}` },
                  { title: '原成本合计', dataIndex: 'oldCostTotal', render: v => `¥${v}` },
              ]}
          />
      </Modal>

      <Modal
         title="调价详情"
         open={isDetailModalOpen}
         onCancel={() => setIsDetailModalOpen(false)}
         footer={null}
      >
         {currentAdjustItem && (
             <Descriptions column={1} bordered>
                <Descriptions.Item label="商品名称">{currentAdjustItem.name}</Descriptions.Item>
                <Descriptions.Item label="规格名称">{currentAdjustItem.spec}</Descriptions.Item>
                <Descriptions.Item label="原成本价">¥{currentAdjustItem.oldCost}</Descriptions.Item>
                <Descriptions.Item label="现成本价">¥{currentAdjustItem.newCost}</Descriptions.Item>
                <Descriptions.Item label="调价原因">{currentAdjustItem.reason}</Descriptions.Item>
                <Descriptions.Item label="操作人">{currentAdjustItem.operator}</Descriptions.Item>
                <Descriptions.Item label="操作时间">{currentAdjustItem.time}</Descriptions.Item>
             </Descriptions>
         )}
      </Modal>
    </div>
  );
};

export default PriceAdjustmentDetail;
