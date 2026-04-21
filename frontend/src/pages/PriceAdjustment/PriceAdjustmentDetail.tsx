import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, Modal, Breadcrumb, Spin, Steps, message, Input } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getAdjustmentById, getAdjustmentBySheetNo, getAdjustmentItemsBySheetId, approveAdjustment, rejectAdjustment, revokeAdjustment, CostAdjustmentSheet, CostAdjustmentItem } from '../../services/costAdjustmentService';

interface HistoryItem {
    key: number;
    time: string;
    operator: string;
    action: string;
    remark: string;
}

const PriceAdjustmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [data, setData] = useState<CostAdjustmentSheet | null>(null);
  const [items, setItems] = useState<CostAdjustmentItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
     fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      let result: CostAdjustmentSheet | null = null;
      
      // 判断id是数字还是字符串（调价单号）
      if (/^\d+$/.test(id)) {
        result = await getAdjustmentById(Number(id));
      } else {
        result = await getAdjustmentBySheetNo(id);
      }
      
      if (!result) {
        message.error('调价单不存在');
        return;
      }
      
      setData(result);
      
      // 后端已经返回了items数据，直接使用
      setItems(result.items || []);
      
      const historyData: HistoryItem[] = [
        { key: 1, time: result.createdAt || '-', operator: result.createdBy || '-', action: '发起申请', remark: result.reason || '-' }
      ];
      if (result.status === 'APPROVED') {
        historyData.push({ key: 2, time: result.approvedAt || '-', operator: result.approvedBy || '-', action: '审批通过', remark: '-' });
      } else if (result.status === 'REJECTED') {
        historyData.push({ key: 2, time: '-', operator: '-', action: '已驳回', remark: result.rejectReason || '-' });
      } else if (result.status === 'REVOKED') {
        historyData.push({ key: 2, time: '-', operator: result.createdBy || '-', action: '已撤销', remark: '-' });
      }
      setHistory(historyData);
    } catch (error) {
      message.error('获取调价单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!data) return;
    setActionLoading(true);
    try {
      await approveAdjustment(data.id);
      message.success('审批通过成功');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '审批失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!data || !rejectReason.trim()) {
      message.warning('请输入驳回原因');
      return;
    }
    setActionLoading(true);
    try {
      await rejectAdjustment(data.id, rejectReason);
      message.success('驳回成功');
      setIsRejectModalOpen(false);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '驳回失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!data) return;
    Modal.confirm({
      title: '确认撤销',
      content: '确定要撤销该调价单吗？',
      onOk: async () => {
        setActionLoading(true);
        try {
          await revokeAdjustment(data.id);
          message.success('撤销成功');
          fetchData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '撤销失败');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { text: string; color: string }> = {
      PENDING: { text: '待审批', color: 'blue' },
      APPROVED: { text: '已审批', color: 'green' },
      REJECTED: { text: '已驳回', color: 'red' },
      REVOKED: { text: '已撤销', color: 'default' }
    };
    return map[status] || { text: status, color: 'default' };
  };

  const getApprovalSteps = () => {
    if (!data) return [];
    const statusInfo = getStatusInfo(data.status);
    return [
      { title: '发起审批', description: `${data.createdBy} (${data.createdAt || '-'})`, status: 'finish' as const },
      { title: '审批状态', description: statusInfo.text, status: data.status === 'PENDING' ? 'process' as const : 'finish' as const },
      { title: '完成', description: data.status === 'APPROVED' ? '已通过' : data.status === 'REJECTED' ? '已驳回' : data.status === 'REVOKED' ? '已撤销' : '待处理', status: data.status === 'PENDING' ? 'wait' as const : 'finish' as const }
    ];
  };

  if (loading) {
     return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  if (!data) {
     return <div style={{ padding: 50, textAlign: 'center' }}><span>调价单不存在</span></div>;
  }

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 采购调价单列表 > 采购调价单详情"
        description={`采购调价单详情页。

1. **页面布局**：
   - **头部信息**：调价单号、审批状态。
   - **调价信息**：商品/规格、数量、原/现成本单价、差价。
   - **审批流程**：竖向展示审批节点进度。
   - **操作记录**：表格展示完整操作历史。

2. **审批操作**：
   - 待审批状态：可撤销、驳回、审批通过
   - 其他状态：仅可查看`}
        fields={[
          { name: 'sheetNo', type: 'String', length: '32', required: true, desc: '调价单号' },
          { name: 'status', type: 'Enum', required: true, desc: '审批状态' },
          { name: 'createdBy', type: 'String', required: true, desc: '申请人' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/price-adjustment')}>采购调价单列表</a> },
         { title: '调价单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
         {/* Actions */}
         <Card variant="borderless">
            <Space>
               <Button onClick={() => navigate(-1)}>返回</Button>
               {data.status === 'PENDING' && (
                 <>
                   <Button danger onClick={handleRevoke} loading={actionLoading}>撤销</Button>
                   <Button onClick={() => setIsRejectModalOpen(true)} loading={actionLoading}>驳回</Button>
                   <Button type="primary" onClick={handleApprove} loading={actionLoading}>审批通过</Button>
                 </>
               )}
            </Space>
         </Card>

         <Card title="基本信息" variant="borderless">
            <Descriptions column={2}>
               <Descriptions.Item label="调价单号">{data.sheetNo}</Descriptions.Item>
               <Descriptions.Item label="审批状态">
                 <Tag color={getStatusInfo(data.status).color}>{getStatusInfo(data.status).text}</Tag>
               </Descriptions.Item>
               <Descriptions.Item label="申请人">{data.createdBy}</Descriptions.Item>
               <Descriptions.Item label="申请时间">{data.createdAt}</Descriptions.Item>
               <Descriptions.Item label="商品供应商">{data.supplierName || '-'}</Descriptions.Item>
               <Descriptions.Item label="调价原因">{data.reason || '-'}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title="调价信息" variant="borderless">
            <Table 
               pagination={false}
               dataSource={items.map((item, index) => ({
                 key: item.id || index,
                 poNo: item.poNo || '-',
                 name: item.productName || '-',
                 spec: item.specName || '-',
                 quantity: item.quantity || 0,
                 oldCost: item.oldCost || 0,
                 newCost: item.newCost || 0,
                 unitDiff: item.unitDiff || 0,
                 totalDiff: item.totalDiff || 0
               }))}
               columns={[
                  { title: '采购单号', dataIndex: 'poNo', render: (v: string) => <a onClick={() => navigate(`/supply-chain/purchase-order/${v}`)}>{v}</a> },
                  { title: '商品名称', dataIndex: 'name' },
                  { title: '规格名称', dataIndex: 'spec' },
                  { title: '商品数量', dataIndex: 'quantity' },
                  { title: '调价前成本价', dataIndex: 'oldCost', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
                  { title: '调价后成本价', dataIndex: 'newCost', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
                  { title: '单价差额', dataIndex: 'unitDiff', render: (v: number) => {
                    const color = (v || 0) >= 0 ? '#cf1322' : '#52c41a';
                    return <span style={{ color }}>{(v || 0) >= 0 ? '+' : ''}¥{(v || 0).toFixed(2)}</span>;
                  }},
                  { title: '合计差额', dataIndex: 'totalDiff', render: (v: number) => {
                    const color = (v || 0) >= 0 ? '#cf1322' : '#52c41a';
                    return <span style={{ color }}>{(v || 0) >= 0 ? '+' : ''}¥{(v || 0).toFixed(2)}</span>;
                  }},
               ]}
            />
         </Card>

         <Card title="审批流程" variant="borderless">
            <Steps
               direction="vertical"
               current={1}
               items={getApprovalSteps()}
            />
         </Card>

         <Card title="操作记录" variant="borderless">
            <Table 
               dataSource={history}
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
         title="驳回原因"
         open={isRejectModalOpen}
         onCancel={() => {
           setIsRejectModalOpen(false);
           setRejectReason('');
         }}
         onOk={handleReject}
         confirmLoading={actionLoading}
         okText="确认驳回"
      >
         <Input.TextArea 
           rows={4} 
           value={rejectReason}
           onChange={e => setRejectReason(e.target.value)}
           placeholder="请输入驳回原因" 
         />
      </Modal>
    </div>
  );
};

export default PriceAdjustmentDetail;
