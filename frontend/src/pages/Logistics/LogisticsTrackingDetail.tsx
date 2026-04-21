import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Breadcrumb, Table, Spin, Result, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getLogisticsDetail } from '../../services/purchaseOrderService';
import LogisticsTracker from '../PurchaseOrder/components/LogisticsTracker';
import { formatBeijingTime, getStatusText, getStatusColor } from '../../utils/statusMapping';

const LogisticsTrackingDetail: React.FC = () => {
  const navigate = useNavigate();
  const { trackingNumber } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!trackingNumber) {
        setError('参数错误：缺少运单号');
        return;
      }

      setLoading(true);
      try {
        const res = await getLogisticsDetail(trackingNumber);
        
        // Standardize response handling: 
        // Backend always returns { code: 200, data: { trackingNumber, orders, totalFee } }
        // The request interceptor in `src/utils/request.ts` unwraps `res.data` when `code === 200`.
        // So `res` here is the `data` object directly.
        
        if (res && (res.trackingNumber || res.orders)) {
            setData(res);
        } else if (res && res.code === 200 && res.data) {
            // Handle case where interceptor might NOT have unwrapped it (defensive coding)
            setData(res.data);
        } else {
            // Fallback for unexpected structure or actual error
            setError('数据加载异常，请联系管理员');
        }
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.response?.data?.message || err.message || '加载失败，请稍后重试';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [trackingNumber]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
      { title: '采购单号', dataIndex: 'orderNo', width: 180 },
      { 
          title: '包含商品', 
          dataIndex: 'items', 
          render: (items: {productName: string, quantity: number}[]) => (
              <div style={{ fontSize: '12px', color: '#666' }}>
                  {items.map((i, idx) => (
                      <div key={idx}>{i.productName} x {i.quantity}</div>
                  ))}
              </div>
          ) 
      }
  ];

  // Helper to extract common info from first order (since they are identical for same tracking number)
  const commonInfo = data?.orders?.[0] || {};
  const isSelfDelivery = commonInfo.deliveryMethod === 'SelfDelivery';

  return (
    <>
      <PageDoc 
        pageTitle="供应链管理 > 物流追踪 > 配送单详情" 
        description="查看同一配送单号下的所有关联采购单及配送状态。"
      />
      <div style={{ padding: 24 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Breadcrumb items={[
            { title: <a onClick={() => navigate('/supply-chain/settlement/delivery')}>待结算配送单</a> },
            { title: '配送单详情' }
          ]} />

          {loading ? (
           <div style={{ textAlign: 'center', padding: '50px' }}>
             <Spin size="large" tip="加载中..." />
           </div>
        ) : error ? (
           <Result status="error" title="加载失败" subTitle={error} 
             extra={<Button type="primary" onClick={() => navigate(-1)}>返回</Button>} 
           />
        ) : data ? (
           <>
             <Card title="配送单概览" size="small">
                <Descriptions column={3} bordered size="small">
                    <Descriptions.Item label="配送单号">
                        <Typography.Text copyable>{data.trackingNumber}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="配送方式">
                        {isSelfDelivery ? '自配送' : '物流配送'}
                    </Descriptions.Item>
                    <Descriptions.Item label={isSelfDelivery ? '配送单号' : '第三方运单号'}>
                        <Typography.Text copyable>{data.trackingNumber}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="物流服务商">
                        {commonInfo.logisticsSupplierName || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="发货时间">
                        {commonInfo.shippedTime ? formatBeijingTime(commonInfo.shippedTime) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                        <Tag color={getStatusColor(commonInfo.status)}>{getStatusText(commonInfo.status)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="总物流费用">
                        <span style={{ fontWeight: 'bold', color: '#f50' }}>
                            ¥{Number(data.totalFee).toFixed(2)}
                        </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="收货地址" span={3}>
                        {commonInfo.receiverAddress || '-'}
                    </Descriptions.Item>
                </Descriptions>
             </Card>

             <Card title={`关联采购单 (${data.orders?.length || 0})`} size="small">
                 <Table 
                    dataSource={data.orders} 
                    columns={columns} 
                    rowKey="id" 
                    pagination={false} 
                    size="small"
                 />
             </Card>

             <Card title="物流追踪">
                <LogisticsTracker 
                    trackingNo={data.trackingNumber}
                    // Pass first order details as fallback context
                    deliveryMethod={commonInfo.deliveryMethod || 'Logistics'}
                    deliverer={commonInfo.deliverer}
                    contact={commonInfo.delivererPhone}
                    plateNumber={commonInfo.plateNumber}
                    currentLocation={commonInfo.currentLocation}
                />
            </Card>
           </>
        ) : (
            <Result status="info" title="暂无数据" />
        )}
      </Space>
      </div>
    </>
  );
};

export default LogisticsTrackingDetail;
