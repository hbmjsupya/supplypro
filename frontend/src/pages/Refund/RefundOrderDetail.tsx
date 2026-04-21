import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumb, Descriptions, Tag, Button, Card, Space, message, Modal } from 'antd';
import request from '../../utils/request';
import { formatTimeFull } from '../../utils/dateFormatter';
import { CheckCircleOutlined } from '@ant-design/icons';
import LogisticsTracker from '../PurchaseOrder/components/LogisticsTracker';

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待处理' },
  RETURNING: { color: 'processing', text: '退货中' },
  RECEIVED: { color: 'success', text: '已收货' },
  COMPLETED: { color: 'green', text: '已完成' },
  CANCELLED: { color: 'red', text: '已取消' },
};

const RefundOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res: any = await request.get(`/refund-orders/${id}`);
      const d = res.data || res;
      setDetail(d);
    } catch {
      message.error('加载退款单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    Modal.confirm({
      title: '确认收货',
      content: '确认已收到退货商品？确认后将自动完成退款流程。',
      onOk: async () => {
        try {
          await request.put(`/refund-orders/${id}/confirm-receipt`, { receivedBy: '当前用户' });
          message.success('确认收货成功');
          fetchDetail();
        } catch {
          message.error('确认收货失败');
        }
      },
    });
  };

  if (!detail) return null;

  const s = statusMap[detail.status] || { color: 'default', text: detail.status };

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: '供应链管理' },
        { title: <a onClick={() => navigate('/supply-chain/refund-order')}>退款单管理</a> },
        { title: '详情' },
      ]} />

      <Space style={{ marginBottom: 16 }}>
        {detail.refundType === 'REFUND_RETURN' && detail.status === 'RETURNING' && (
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleConfirmReceipt}>
            确认收货
          </Button>
        )}
        <Button onClick={() => navigate('/supply-chain/refund-order')}>返回列表</Button>
      </Space>

      <Card title="单号信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="退款单号">{detail.refundNo}</Descriptions.Item>
          <Descriptions.Item label="关联业务单号">
            {detail.relatedOrderNo ? (
              <a onClick={() => {
                if (detail.bizType === 'PURCHASE') navigate(`/supply-chain/purchase-order/detail/${detail.relatedOrderId}`);
              }}>{detail.relatedOrderNo}</a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="运营订单号">{detail.platformOrderNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="运营子订单号">{detail.platformSubOrderNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="运营退款单号">{detail.platformRefundNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={s.color}>{s.text}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="申请人">{detail.applicant || '-'}</Descriptions.Item>
          <Descriptions.Item label="退款类型">
            <Tag color={detail.refundType === 'REFUND_ONLY' ? 'blue' : 'orange'}>
              {detail.refundType === 'REFUND_ONLY' ? '仅退款' : '退款退货'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="承担方">
            <Tag color={detail.bearer === 'SUPPLIER' ? 'gold' : 'cyan'}>
              {detail.bearer === 'SUPPLIER' ? '供应商' : '平台'}
            </Tag>
          </Descriptions.Item>
          {detail.refundType === 'REFUND_RETURN' && (
            <Descriptions.Item label="退货地址" span={2}>
              {detail.returnConsignee || ''} {detail.returnPhone || ''} {detail.returnAddress || '-'}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="退款信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="商品名称">{detail.productName || '-'}</Descriptions.Item>
          <Descriptions.Item label="商品规格">{detail.specName || '-'}</Descriptions.Item>
          <Descriptions.Item label="退款数量">{detail.quantity || 0}</Descriptions.Item>
          <Descriptions.Item label="退款单价">¥{Number(detail.unitPrice || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="退款金额" span={2}>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 16 }}>
              ¥{Number(detail.refundAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {detail.refundType === 'REFUND_RETURN' && (
        <Card title="物流信息" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="物流公司">{detail.logisticsCompany || '-'}</Descriptions.Item>
            <Descriptions.Item label="运单号">{detail.trackingNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="发货时间">{detail.logisticsShippedAt ? formatTimeFull(detail.logisticsShippedAt) : '-'}</Descriptions.Item>
            <Descriptions.Item label="确认收货人">{detail.confirmReceivedBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="确认收货时间">{detail.confirmReceivedAt ? formatTimeFull(detail.confirmReceivedAt) : '-'}</Descriptions.Item>
          </Descriptions>
          {detail.trackingNo && (
            <LogisticsTracker trackingNo={detail.trackingNo} hideRelatedOrders />
          )}
        </Card>
      )}

      <Card title="审批信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="审批状态"><Tag color="green">已通过</Tag></Descriptions.Item>
          <Descriptions.Item label="审批备注">{detail.approvalRemark || '-'}</Descriptions.Item>
          <Descriptions.Item label="审批时间">{detail.approvalTime ? formatTimeFull(detail.approvalTime) : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default RefundOrderDetail;
