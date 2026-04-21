import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Timeline, Tag, Spin, Alert, Button, Empty, Space, Typography, Collapse, message, Tooltip, Table, Descriptions, Card } from 'antd';
import { ReloadOutlined, CarOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, ShopOutlined, SyncOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import { getLogisticsTrackByOrderId, getLogisticsTrackByTrackingNo, getLogisticsTrackByOutboundOrderId, LogisticsResponse, LogisticsTrace } from '../../../services/logisticsService';
import { getStatusText, getStatusColor } from '../../../utils/statusMapping';
import { debounce } from 'lodash';
import { Avatar } from 'antd';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

/**
 * LogisticsTracker Component
 * 
 * Displays logistics tracking information.
 * Supports fetching data via `trackingNo` (preferred) or `orderId` (legacy/fallback).
 * 
 * Update 2026-02-24: Added `trackingNo` support to fetch logistics data directly from the carrier/aggregator
 * using the tracking number, bypassing the need for internal order ID lookup when possible.
 * 
 * Update 2026-03-04: Added forwardRef to expose refresh method for parent components
 * to trigger data refresh after shipping or receiving operations.
 */
interface LogisticsTrackerProps {
  /**
   * Internal Purchase Order ID (Legacy/Fallback)
   */
  orderId?: number;
  /**
   * Outbound Order ID
   * If provided, the component will fetch logistics data for the outbound order.
   */
  outboundOrderId?: number;
  /**
   * Courier Tracking Number (Preferred)
   * If provided, the component will fetch logistics data using this tracking number.
   */
  trackingNo?: string;
  
  // New props for Self Delivery
  deliveryMethod?: string;
  deliverer?: string;
  contact?: string;
  plateNumber?: string;
  currentLocation?: string;
  hideRelatedOrders?: boolean;
}

interface ErrorDetails {
  message: string;
  url?: string;
  status?: number;
  timestamp?: string;
  params?: any;
}

export interface LogisticsTrackerRef {
  refresh: () => void;
}

const LogisticsTracker = forwardRef<LogisticsTrackerRef, LogisticsTrackerProps>(({ 
    orderId, 
    outboundOrderId,
    trackingNo, 
    deliveryMethod,
    deliverer,
    contact,
    plateNumber,
    currentLocation,
    hideRelatedOrders
}, ref) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<LogisticsResponse | null>(null);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const isSelfDelivery = deliveryMethod === 'SelfDelivery';

  const fetchData = async (force: boolean = false) => {
    if (!orderId && !outboundOrderId && !trackingNo) return;
    
    // [FIX 2026-03-10] 移除自配送模式下跳过API调用的逻辑
    // 后端LogisticsController已经正确处理自配送模式，会返回模拟数据和relatedOrders
    // 如果跳过API调用，将无法获取relatedOrders数据，导致采购单关联信息丢失
    
    // If not forcing, set loading.
    setLoading(true);
    
    setError(null);

    // Validation - 更新验证规则：允许字母、数字、横线，长度5-50字符
    // 自配送运单号可能包含横线，如"DD202611233155601-G1"
    if (trackingNo && !/^[A-Za-z0-9\-]{5,50}$/.test(trackingNo)) {
        setError({
            message: '物流单号格式不正确（需为5-50位字母、数字或横线）',
            status: 400
        });
        setLoading(false);
        return;
    }

    try {
      let response;
      // Prioritize orderId-based queries over trackingNo to ensure correct API endpoint
      if (outboundOrderId) {
          response = await getLogisticsTrackByOutboundOrderId(outboundOrderId, force);
      } else if (orderId) {
          response = await getLogisticsTrackByOrderId(orderId, force);
      } else if (trackingNo) {
          response = await getLogisticsTrackByTrackingNo(trackingNo, force);
      }
      
      if (!response) {
        throw new Error('无效的查询参数');
      }

      // Normalize response to handle both camelCase (Backend) and PascalCase (KuaidiNiao raw)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyRes = response as any;
      
      // Check for backend wrapped error (even with 200 status, though request interceptor handles non-200)
      // Update 2026-02-28: Do NOT throw for LOGISTICS_NOT_FOUND. Let it flow to setData so we can render friendly Alert.
      /* 
      if (anyRes.errorCode === 'LOGISTICS_NOT_FOUND' && !isSelfDelivery) {
          throw { 
              response: { 
                  status: 404, 
                  data: { 
                      errorCode: 'LOGISTICS_NOT_FOUND', 
                      message: anyRes.message 
                  } 
              } 
          };
      }
      */

      const rawTraces = anyRes.traces || anyRes.Traces || [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedTraces = rawTraces.map((t: any) => ({
          acceptTime: t.acceptTime || t.AcceptTime,
          acceptStation: t.acceptStation || t.AcceptStation,
          remark: t.remark || t.Remark
      })).sort((a: LogisticsTrace, b: LogisticsTrace) => {
          return new Date(b.acceptTime).getTime() - new Date(a.acceptTime).getTime();
      });

      if ((!normalizedTraces || normalizedTraces.length === 0) && !isSelfDelivery) {
          console.warn('[LogisticsTracker] No traces found for', { orderId, trackingNo });
      }

      const normalizedResponse: LogisticsResponse = {
          success: anyRes.success !== undefined ? anyRes.success : anyRes.Success,
          reason: anyRes.reason || anyRes.Reason,
          state: anyRes.state || anyRes.State,
          traces: normalizedTraces,
          shipperName: anyRes.shipperName || anyRes.ShipperName,
          logisticCode: anyRes.logisticCode || anyRes.LogisticCode,
          shipperCode: anyRes.shipperCode || anyRes.ShipperCode,
          eBusinessID: anyRes.eBusinessID || anyRes.EBusinessID,
          relatedOrders: anyRes.relatedOrders
      };

      setData(normalizedResponse);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to fetch logistics:', err);
      
      // For Self Delivery, we might expect failure from KuaidiNiao if tracking No is internal
      // But we still want relatedOrders if possible. 
      // Since API failed, we can't get relatedOrders easily unless we have a dedicated endpoint for it.
      // Assuming for now if it fails, we just show static info for Self Delivery.
      
      const errorDetails: ErrorDetails = {
        message: err.message || '获取物流信息失败',
        url: err.config?.url,
        status: err.response?.status,
        timestamp: new Date().toLocaleString(),
        params: err.config?.params || { orderId }
      };

      if (err.response?.status === 404) {
          const resData = err.response?.data;
          
          if (resData?.errorCode === 'LOGISTICS_NOT_FOUND') {
               errorDetails.message = resData.message || '物流单号不存在或尚未录入';
          } else if (typeof resData === 'string' && resData.includes('Whitelabel Error Page')) {
              errorDetails.message = '物流服务接口不可用 (404 Not Found)';
          } else if (resData?.message) {
              errorDetails.message = resData.message;
          }
      }

      setError(errorDetails);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: () => fetchData(true)
  }), [fetchData]);

  // Debounced retry handler
  const handleRetry = useCallback(
    debounce(() => {
      setRetryCount(prev => prev + 1);
      fetchData(true); // Retry implies forcing a fresh fetch usually, or at least trying again.
      message.info('正在刷新物流信息...');
    }, 500),
    [orderId, outboundOrderId, trackingNo]
  );

  // Initial load
  useEffect(() => {
    // [FIX 2026-02-28] Removed early return for SelfDelivery.
    // The backend LogisticsController now correctly handles SelfDelivery by returning a mock response
    // and enriched data (including relatedOrders).
    // If we skip fetching, `data` remains null and we miss relatedOrders info.
    
    /* 
    if (isSelfDelivery) {
      setLoading(false);
      return;
    }
    */
    
    if (orderId || outboundOrderId || trackingNo) {
      fetchData(false);
    }
    // Cleanup debounce
    return () => {
      handleRetry.cancel();
    };
  }, [orderId, outboundOrderId, trackingNo, isSelfDelivery]);

  const getStatusIcon = (state: string) => {
    switch (state) {
      case '0': // 无轨迹
        return <ClockCircleOutlined />;
      case '1': // 已揽收
        return <ShopOutlined />;
      case '2': // 在途中
        return <CarOutlined />;
      case '3': // 已签收
        return <CheckCircleOutlined />;
      case '4': // 问题件
        return <ExclamationCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const checkAbnormalStatus = (traces: LogisticsTrace[]) => {
    if (!traces || traces.length === 0) return null;
    
    // Check for "Returned" status
    const isReturned = traces.some(t => t.remark && (t.remark.includes('退回') || t.remark.includes('退件')));
    if (isReturned) return { type: 'error', message: '物流异常：包裹可能已被退回' };

    // Check for "Timeout" (No update for > 3 days)
    const latestTrace = traces[0];
    if (latestTrace && latestTrace.acceptTime) {
        const lastTime = new Date(latestTrace.acceptTime).getTime();
        const now = new Date().getTime();
        const diffDays = (now - lastTime) / (1000 * 3600 * 24);
        if (diffDays > 3 && data?.state !== '3') { // Not delivered yet
            return { type: 'warning', message: '物流异常：超过3天未更新轨迹' };
        }
    }
    
    return null;
  };

  const abnormalStatus = data ? checkAbnormalStatus(data.traces) : null;

  const renderStatusTag = (state: string) => {
    const text = getStatusText(state, 'logistics');
    const color = getStatusColor(state, 'logistics');
    const icon = getStatusIcon(state);
    
    return <Tag icon={icon} color={color}>{text}</Tag>;
  };

  if (loading && !data && !error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin tip="正在连接物流服务..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="获取物流信息失败"
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>{error.message}</Text>
            <Space>
                <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => fetchData(true)} loading={loading}>
                重试
                </Button>
                <Button size="small" href="https://www.kdniao.com/" target="_blank" rel="noopener noreferrer">
                    访问快递鸟官网查询
                </Button>
            </Space>
            
            <Collapse ghost size="small">
                <Panel header={<Space><InfoCircleOutlined /> 查看详细错误信息</Space>} key="1">
                    <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: 0 }}>
                        <pre style={{ overflow: 'auto', maxHeight: '150px' }}>
                            {JSON.stringify(error, null, 2)}
                        </pre>
                    </Paragraph>
                </Panel>
            </Collapse>
          </Space>
        }
        type="error"
        showIcon
      />
    );
  }

  if (!data) {
    return <Empty description="暂无物流数据" />;
  }

  if (data.traces.length === 0 && data.success) {
      return <Empty description="暂无物流信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const getFriendlyErrorMessage = (reason: string) => {
    if (!reason) return '未知原因，请稍后重试';
    if (reason.includes('Limit') || reason.includes('frequency')) return '查询过于频繁，请稍后再试';
    if (reason.includes('No Data') || reason.includes('无轨迹')) return '暂无轨迹信息，请核对单号';
    if (reason.includes('Validation') || reason.includes('校验')) return '单号或快递公司编码格式错误';
    return reason;
  };

  if (!data.success) {
    const friendlyMsg = getFriendlyErrorMessage(data.reason || '');
    return (
      <Alert
        message="物流查询失败"
        description={
          <Space direction="vertical">
             <Text>{friendlyMsg}</Text>
             {friendlyMsg !== data.reason && <Text type="secondary" style={{ fontSize: '12px' }}>原始信息: {data.reason}</Text>}
             <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => fetchData(true)} loading={loading}>
                重试
             </Button>
          </Space>
        }
        type="warning"
        showIcon
      />
    );
  }

  // Display abnormal status alert if detected
   const abnormalAlert = abnormalStatus ? (
       <Alert
         message={abnormalStatus.message}
         type={abnormalStatus.type as 'error' | 'warning'}
         showIcon
         style={{ marginBottom: 16 }}
       />
   ) : null;

   const traces = data.traces || [];

   if (!traces || traces.length === 0) {
       console.warn(`[LogisticsTracker] No traces found for orderId: ${orderId}, trackingNo: ${trackingNo}`);
   }

   const relatedOrders = data?.relatedOrders || [];
   const showRelatedOrders = !hideRelatedOrders && relatedOrders.length > 0;

   if (isSelfDelivery) {
       return (
           <div>
               <Descriptions title="自配送信息" bordered size="small" column={2} style={{ marginBottom: 24 }}>
                   <Descriptions.Item label="配送员">
                       <Space>
                           <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
                           <Text>{deliverer || '-'}</Text>
                       </Space>
                   </Descriptions.Item>
                   <Descriptions.Item label="联系电话">
                       {contact ? (
                           <a href={`tel:${contact}`}>
                               <Space>
                                   {contact}
                                   <PhoneOutlined />
                               </Space>
                           </a>
                       ) : '-'}
                   </Descriptions.Item>
                   <Descriptions.Item label="车牌号">{plateNumber || '-'}</Descriptions.Item>
                   <Descriptions.Item label="当前位置">{currentLocation || '-'}</Descriptions.Item>
                   <Descriptions.Item label="物流单号">{trackingNo || '-'}</Descriptions.Item>
               </Descriptions>
           </div>
       );
   }

   return (
     <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <Space size="middle" wrap>
          <Space>
            <Text type="secondary">运单号:</Text>
            <Text copyable strong>{data?.logisticCode || trackingNo}</Text>
          </Space>
          <Space>
            <Text type="secondary">快递公司:</Text>
            <Text strong>{data?.shipperName || '未知'}</Text>
          </Space>
          <Space>
            <Text type="secondary">当前状态:</Text>
            {renderStatusTag(data?.state || '0')}
          </Space>
        </Space>
        <Space>
            {lastUpdated && <Text type="secondary" style={{ fontSize: '12px' }}>更新于: {lastUpdated}</Text>}
            <Tooltip title="手动刷新获取最新物流信息">
                <Button 
                    icon={<SyncOutlined spin={loading} />} 
                    onClick={handleRetry} 
                    loading={loading}
                >
                    刷新
                </Button>
            </Tooltip>
        </Space>
      </div>

      {abnormalAlert}

      {(!traces || traces.length === 0) ? (
         <div style={{ padding: '20px', textAlign: 'center' }}>
            <Empty description="暂无物流轨迹" />
         </div>
      ) : (
        <Timeline mode="left">
            {traces.map((trace, index) => (
            <Timeline.Item 
                key={index} 
                color={index === 0 ? 'green' : 'gray'}
                label={<div style={{ minWidth: '80px', fontSize: '12px', lineHeight: '1.5' }}>{trace.acceptTime}</div>}
            >
                <p style={{ margin: 0, fontWeight: index === 0 ? 500 : 400 }}>{trace.acceptStation}</p>
                {trace.remark && <Text type="secondary" style={{ fontSize: '12px' }}>{trace.remark}</Text>}
            </Timeline.Item>
            ))}
        </Timeline>
      )}
    </div>
  );
});

export default LogisticsTracker;
