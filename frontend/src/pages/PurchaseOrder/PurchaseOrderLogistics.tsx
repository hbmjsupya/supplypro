import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Breadcrumb, Tag, Spin, Result, Grid, Image } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getPurchaseOrderById, getPurchaseOrders } from '../../services/purchaseOrderService';
import LogisticsTracker from './components/LogisticsTracker';
import { getShippingStatusInfo, formatBeijingTime } from '../../utils/statusMapping';

const PurchaseOrderLogistics: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  const renderAttachments = (attachmentsStr: string | undefined) => {
    if (!attachmentsStr) return <span style={{ color: '#999' }}>暂无凭证</span>;
    try {
      const urls: string[] = JSON.parse(attachmentsStr);
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
                fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZHk9Ii4zZW0iPui0pei0pTwvdGV4dD48L3N2Zz4=" 
              />
            ))}
          </div>
        </Image.PreviewGroup>
      );
    } catch (e) {
      return <span style={{ color: '#ff4d4f' }}>凭证数据解析失败</span>;
    }
  };

    useEffect(() => {
        const loadData = async () => {
            console.log('[PurchaseOrderLogistics] Loading data for id:', id);
            if (!id) {
                setError('参数错误：缺少采购单号');
                return;
            }

            setLoading(true);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let poData: any = null;
                let currentId: number | null = null;

                // 1. Optimistic Render: Use location state if available to show data immediately
                if (location.state && location.state.record) {
                    poData = location.state.record;
                    updateOrderInfo(poData);
                    // Don't stop here! We must fetch fresh data to ensure attachments and status are up-to-date.
                }

                // 2. Fetch Fresh Data from Server
                if (id) {
                    // Check if id is numeric (likely a PO ID or Snapshot ID)
                    if (!isNaN(Number(id))) {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const res: any = await getPurchaseOrderById(Number(id));
                            if (res) {
                                poData = res;
                                currentId = Number(id);
                                updateOrderInfo(poData); // Update with fresh data
                            }
                        } catch (e) {
                            console.warn("Failed to fetch by ID, trying search...", e);
                        }
                    }

                    // If direct fetch failed or ID is string (OrderNo) and we haven't confirmed fresh data yet
                    // Note: If we already got data from getPurchaseOrderById, currentId is set.
                    if (!currentId) {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const res: any = await getPurchaseOrders({ keyword: id, page: 0, size: 10 });
                            const list = res.records || res.content || [];
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const match = list.find((item: any) => item.orderNo === id || item.poNo === id || String(item.id) === id);
                            
                            if (match) {
                                poData = match;
                                currentId = match.purchaseOrderId || match.id;
                                updateOrderInfo(poData);
                            }
                        } catch (e) {
                            console.error(e);
                            // If fetch fails but we have location state, we rely on that (already rendered).
                            if (!poData && !location.state?.record) {
                                setError('无法加载最新数据');
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                if (!location.state?.record) {
                    setError('加载失败');
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, location.state]);

    // Helper to map API data to UI state
    const updateOrderInfo = (data: any) => {
        if (!data) return;
        const info = {
            ...data,
            poNo: data.orderNo || data.poNo,
            supplier: data.supplierName || (typeof data.supplier === 'string' ? data.supplier : data.supplier?.name) || '',
            shippedTime: data.shippedAt || data.shippedTime,
            logisticsSupplier: data.logisticsSupplierName || data.logisticsProvider?.name || data.supplierName || data.supplier?.name || '',
            freight: data.logisticsFee || data.freight || 0,
            expectedArrival: data.expectedArrival || data.expectTime,
            shipNo: data.shipNo || data.trackingNumber,
            status: data.status,
            shippingStatus: data.shippingStatus,
            deliveryMethod: data.deliveryMethod,
            deliverer: data.deliverer,
            delivererPhone: data.delivererPhone,
            plateNumber: data.plateNumber,
            // Only fallback to attachments if SelfDelivery (legacy proof). For Logistics, attachments is Contract.
            shippingProof: data.shippingProof || (data.deliveryMethod === 'SelfDelivery' ? data.attachments : undefined),
        };
        setOrderInfo(info);
        if (data.purchaseOrderId || data.id) {
             setResolvedId(Number(data.purchaseOrderId || data.id));
        }
    };

  return (
    <>
      <PageDoc 
        pageTitle="供应链管理 > 采购订单管理 > 物流详情" 
        description="查看采购单的物流追踪信息及状态。"
      />
      <div style={{ padding: 24 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Breadcrumb items={[
            { title: <a onClick={() => navigate('/supply-chain/purchase-order')}>采购单列表</a> },
            { title: '物流详情' }
          ]} />

          {loading ? (
           <div style={{ textAlign: 'center', padding: '50px' }}>
             <Spin size="large" tip="加载中..." />
           </div>
        ) : error ? (
           <Result status="error" title="加载失败" subTitle={error} 
             extra={<Button type="primary" onClick={() => navigate(-1)}>返回</Button>} 
           />
        ) : (
           <>
             {orderInfo && (
                <Card title="订单信息" size="small">
                    <Descriptions column={screens.md ? 3 : 1} size="small">
                        <Descriptions.Item label="采购单号">{orderInfo.poNo}</Descriptions.Item>
                        <Descriptions.Item label="供应商">{orderInfo.supplier}</Descriptions.Item>
                        <Descriptions.Item label="物流供应商">{orderInfo.logisticsSupplier || '-'}</Descriptions.Item>
                        <Descriptions.Item label="配送方式">{orderInfo.deliveryMethod === 'SelfDelivery' ? '自配送' : '物流配送'}</Descriptions.Item>
                        <Descriptions.Item label="物流费用">¥{Number(orderInfo.freight).toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label="预计到货时间">{orderInfo.expectedArrival || '-'}</Descriptions.Item>
                        <Descriptions.Item label="发货状态">
                             <Tag color={getShippingStatusInfo(orderInfo.shippingStatus).color}>
                                {getShippingStatusInfo(orderInfo.shippingStatus).text}
                             </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="快递单号">{orderInfo.shipNo || orderInfo.trackingNumber || '-'}</Descriptions.Item>
                        {orderInfo.shippedTime && (
                            <Descriptions.Item label="发货时间">{formatBeijingTime(orderInfo.shippedTime)}</Descriptions.Item>
                        )}
                        {(orderInfo.deliveryMethod === 'SelfDelivery' || orderInfo.shippingProof) && (
                            <Descriptions.Item label="发货凭证" span={screens.md ? 3 : 1}>
                                {renderAttachments(orderInfo.shippingProof)}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </Card>
             )}

             <Card title="物流追踪">
                {/* 
                  Update 2026-02-24: Prioritize `trackingNo` (courier tracking number) over `orderId`.
                  Directly fetching by tracking number reduces dependency on internal order ID lookup and aligns with standard logistics API practices.
                  Fallback to `orderId` is maintained for legacy records or cases where tracking number is missing.
                */}
                {resolvedId || orderInfo?.shipNo || orderInfo?.trackingNumber ? (
                    <LogisticsTracker 
                        orderId={resolvedId || undefined} 
                        trackingNo={orderInfo?.shipNo || orderInfo?.trackingNumber}
                        deliveryMethod={orderInfo.deliveryMethod}
                        deliverer={orderInfo.deliverer}
                        contact={orderInfo.delivererPhone}
                        plateNumber={orderInfo.plateNumber}
                    />
                ) : (
                    <Result status="warning" title="无法加载物流信息" subTitle="无效的订单号或缺少快递单号" />
                )}
            </Card>
           </>
        )}
      </Space>
      </div>
    </>
  );
};

export default PurchaseOrderLogistics;
