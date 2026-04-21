import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Breadcrumb, Tag, Spin, Result, Grid, Image } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getOutboundOrderById } from '../../services/warehouseService';
import LogisticsTracker from '../PurchaseOrder/components/LogisticsTracker';
import { getStatusText, getStatusColor, formatBeijingTime } from '../../utils/statusMapping';

const OutboundOrderLogistics: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);

  const getSourceTypeText = (sourceType: string) => {
    switch (sourceType) {
      case 'PURCHASE': return '分仓发货';
      case 'SALES': return '销售出库';
      case 'DROPSHIP': return '一件代发';
      default: return sourceType || '-';
    }
  };

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
      if (!id) {
        setError('参数错误：缺少出库单ID');
        return;
      }

      setLoading(true);
      try {
        let ooData: any = null;

        if (location.state && location.state.record) {
          ooData = location.state.record;
          updateOrderInfo(ooData);
        }

        if (id) {
          try {
            const res: any = await getOutboundOrderById(Number(id));
            if (res) {
              ooData = res;
              updateOrderInfo(ooData);
            }
          } catch (e) {
            console.warn("Failed to fetch outbound order by ID", e);
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

  const updateOrderInfo = (data: any) => {
    if (!data) return;
    const info = {
      ...data,
      outboundNo: data.outboundNo,
      sourceType: data.sourceType,
      sourceRefNo: data.sourceRefNo,
      warehouse: data.warehouse,
      logisticsSupplier: data.logisticsProvider?.name || data.logisticsCompany || '',
      freight: data.logisticsFee || 0,
      trackingNo: data.trackingNo,
      status: data.status,
      deliveryMethod: data.deliveryMethod,
      outboundDate: data.outboundDate,
      confirmedBy: data.confirmedBy,
    };
    setOrderInfo(info);
  };

  return (
    <>
      <PageDoc
        pageTitle="仓储管理 > 出库单管理 > 物流详情"
        description="查看出库单的物流追踪信息及状态。"
      />
      <div style={{ padding: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Breadcrumb items={[
            { title: <a onClick={() => navigate('/supply-chain/outbound')}>出库单列表</a> },
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
                <Card title="出库单信息" size="small">
                  <Descriptions column={screens.md ? 3 : 1} size="small">
                    <Descriptions.Item label="出库单号">{orderInfo.outboundNo}</Descriptions.Item>
                    <Descriptions.Item label="来源类型">{getSourceTypeText(orderInfo.sourceType)}</Descriptions.Item>
                    <Descriptions.Item label="来源单号">{orderInfo.sourceRefNo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="仓库">{orderInfo.warehouse?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="物流供应商">{orderInfo.logisticsSupplier || '-'}</Descriptions.Item>
                    <Descriptions.Item label="配送方式">{orderInfo.deliveryMethod === 'SelfDelivery' ? '自配送' : '物流配送'}</Descriptions.Item>
                    <Descriptions.Item label="物流费用">¥{Number(orderInfo.freight || 0).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="快递单号">{orderInfo.trackingNo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="出库状态">
                      <Tag color={getStatusColor(orderInfo.status?.toLowerCase(), 'outbound')}>
                        {getStatusText(orderInfo.status?.toLowerCase(), 'outbound')}
                      </Tag>
                    </Descriptions.Item>
                    {orderInfo.outboundDate && (
                      <Descriptions.Item label="发货时间">{formatBeijingTime(orderInfo.outboundDate)}</Descriptions.Item>
                    )}
                    {orderInfo.confirmedBy && (
                      <Descriptions.Item label="发货人">{orderInfo.confirmedBy}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              )}

              <Card title="物流追踪">
                {orderInfo?.id ? (
                  <LogisticsTracker
                    outboundOrderId={orderInfo.id}
                    trackingNo={orderInfo.trackingNo}
                    deliveryMethod={orderInfo.deliveryMethod}
                  />
                ) : (
                  <Result status="warning" title="无法加载物流信息" subTitle="缺少出库单信息" />
                )}
              </Card>
            </>
          )}
        </Space>
      </div>
    </>
  );
};

export default OutboundOrderLogistics;
