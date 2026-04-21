import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Breadcrumb, Spin, Result, Tag, Typography, Row, Col, message, Image } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getDeliveryOrderDetail } from '../../services/settlementService';
import LogisticsTracker from '../PurchaseOrder/components/LogisticsTracker';
import { formatBeijingTime, getStatusText, getStatusColor } from '../../utils/statusMapping';

interface DeliveryOrderData {
  deliveryNo: string;
  settlementNo: string;
  relatedOrderNo: string;
  deliveryMethod: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  trackingNumber: string;
  logisticsCompany: string;
  shippedAt: string;
  deliverer: string;
  delivererPhone: string;
  plateNumber: string;
  currentLocation: string;
  receiverAddress: string;
  receiverProvince: string;
  receiverCity: string;
  receiverDistrict: string;
  logisticsSupplierName: string;
  supplierName: string;
  purchaseOrderStatus: string;
  attachments?: string;
}

const DeliveryOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { deliveryNo } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeliveryOrderData | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadData = async (isRetry = false) => {
    if (!deliveryNo) {
      setError('参数错误：缺少配送单号');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getDeliveryOrderDetail(deliveryNo);
      
      if (res) {
          setData(res);
          setRetryCount(0);
          if (isRetry) {
            message.success('数据加载成功');
          }
      } else {
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

  useEffect(() => {
    loadData();
  }, [deliveryNo]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadData(true);
  };

  const isSelfDelivery = data?.deliveryMethod === 'SelfDelivery';

  const getFullAddress = () => {
    if (!data) return '-';
    const parts = [
      data.receiverProvince,
      data.receiverCity,
      data.receiverDistrict,
      data.receiverAddress
    ].filter(Boolean);
    return parts.length > 0 ? parts.join('') : '-';
  };

  const getStatusDisplay = () => {
    if (!data) return '-';
    if (data.purchaseOrderStatus) {
      return <Tag color={getStatusColor(data.purchaseOrderStatus)}>{getStatusText(data.purchaseOrderStatus)}</Tag>;
    }
    return <Tag color={getStatusColor(data.status)}>{getStatusText(data.status)}</Tag>;
  };

  const renderField = (label: string, value: React.ReactNode, copyable = false) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: '40px' }}>
      <div style={{ 
        width: '120px', 
        padding: '10px 12px', 
        background: '#fafafa', 
        fontWeight: 500,
        color: '#666',
        flexShrink: 0
      }}>
        {label}
      </div>
      <div style={{ 
        padding: '10px 12px', 
        flex: 1,
        background: '#fff',
        overflow: 'hidden'
      }}>
        {copyable && typeof value === 'string' ? <Typography.Text copyable>{value || '-'}</Typography.Text> : value || '-'}
      </div>
    </div>
  );

  const renderAttachments = () => {
    if (!data?.attachments) return <span style={{ color: '#999' }}>暂无凭证</span>;
    try {
      const urls: string[] = JSON.parse(data.attachments);
      if (!Array.isArray(urls) || urls.length === 0) return <span style={{ color: '#999' }}>暂无凭证</span>;
      return (
        <Image.PreviewGroup>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
            {urls.map((url, idx) => (
              <Image 
                key={idx} 
                src={url} 
                width={80} 
                height={80} 
                style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }} 
                fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZHk9Ii4zZW0iPui0pei0pTwvdGV4dD48L3N2Zz4=" // svg with text "加载失败"
              />
            ))}
          </div>
        </Image.PreviewGroup>
      );
    } catch (e) {
      return <span style={{ color: '#ff4d4f' }}>凭证数据解析失败</span>;
    }
  };

  return (
    <>
      <PageDoc 
        pageTitle="供应链管理 > 待结算配送单 > 配送单详情" 
        description="查看配送单详情及配送状态。"
      />
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Breadcrumb items={[
              { title: <a onClick={() => navigate('/supply-chain/settlement/delivery')}>待结算配送单</a> },
              { title: '配送单详情' }
            ]} />
            {error && (
              <Button icon={<ReloadOutlined />} onClick={handleRetry} loading={loading}>
                重试 ({retryCount}/3)
              </Button>
            )}
          </div>

          {loading ? (
           <div style={{ textAlign: 'center', padding: '50px' }}>
             <Spin size="large" tip="加载中..." />
           </div>
        ) : error ? (
           <Result 
             status="error" 
             title="加载失败" 
             subTitle={error} 
             extra={[
               <Button key="retry" type="primary" onClick={handleRetry}>
                 重试
               </Button>,
               <Button key="back" onClick={() => navigate(-1)}>
                 返回
               </Button>
             ]} 
           />
        ) : data ? (
           <>
             <Card title="配送单概览" size="small" styles={{ body: { padding: 0 } }}>
                <Row gutter={0}>
                    <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                        {renderField('配送方式', isSelfDelivery ? '自配送' : '物流配送')}
                        {renderField('运单/物流单号', data.trackingNumber, true)}
                        {renderField('物流服务商', data.supplierName || data.logisticsSupplierName)}
                        {renderField('总物流费用', <span style={{ fontWeight: 500, color: '#f50' }}>¥{Number(data.totalAmount || 0).toFixed(2)}</span>)}
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                        {renderField('配送单号', data.deliveryNo, true)}
                        {renderField('关联采购单', data.relatedOrderNo, true)}
                        {renderField('状态', getStatusDisplay())}
                        {renderField('发货时间', data.shippedAt ? formatBeijingTime(data.shippedAt) : '-')}
                        {renderField('收货地址', getFullAddress())}
                    </Col>
                </Row>
                {(isSelfDelivery || data.attachments) && (
                  <Row gutter={0}>
                    <Col span={24}>
                      {renderField('发货凭证', renderAttachments())}
                    </Col>
                  </Row>
                )}
             </Card>

             <Card title="物流追踪">
                <LogisticsTracker 
                    trackingNo={data.trackingNumber}
                    deliveryMethod={data.deliveryMethod || 'Logistics'}
                    deliverer={data.deliverer}
                    contact={data.delivererPhone}
                    plateNumber={data.plateNumber}
                    currentLocation={data.currentLocation}
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

export default DeliveryOrderDetail;
