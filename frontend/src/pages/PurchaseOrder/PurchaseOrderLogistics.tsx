import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Space, Breadcrumb, Tag, Timeline, Spin, Result, Row, Col, Grid, Empty, message } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircleOutlined, ClockCircleOutlined, UserOutlined, CarOutlined, ExclamationCircleOutlined, EnvironmentOutlined, UpOutlined, DownOutlined, CopyOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import { getPurchaseOrders, getLogisticsTracks, LogisticsTrack, PurchaseOrder } from '../../services/purchaseOrderService';

const PurchaseOrderLogistics: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [logisticsTracksMap, setLogisticsTracksMap] = useState<Record<string, LogisticsTrack[]>>({});
  const [tracksLoading, setTracksLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        if (!id) {
            setError('参数错误：缺少采购单号');
            return;
        }

        setLoading(true);
        try {
            let poData: any = null;

            // Try to get from location state first (passed from list page)
            if (location.state && location.state.record) {
                poData = location.state.record;
            } 
            
            // If not in state, fetch from service
            if (!poData || poData.poNo !== id) {
                const orders = await getPurchaseOrders();
                const found = orders.find(o => o.poNo === id || o.id === id);
                if (found) {
                    poData = found;
                }
            }

            // If still not found, and it looks like a legacy mock order (starts with C), mock it
            if (!poData && id.startsWith('C')) {
                // Fallback for legacy hardcoded mock data in PurchaseOrderList
                // We construct a minimal object based on what we might have or just generic
                 poData = {
                    poNo: id,
                    supplier: '未知供应商',
                    status: 'Shipped',
                    logisticsCompany: '顺丰速运', // Default for legacy mock
                    trackingNo: `SF${id.replace('C', '')}`,
                    logisticsList: []
                 };
            }

            if (poData) {
                // Normalize logistics list
                let logisticsList: any[] = [];
                if (poData.logisticsList && poData.logisticsList.length > 0) {
                    logisticsList = poData.logisticsList;
                } else if (poData.trackingNo || (poData.thirdPartyNo && poData.status === 'Completed')) {
                    // Construct single logistics entry
                    logisticsList = [{
                        company: poData.logisticsCompany || '顺丰速运',
                        trackingNo: poData.trackingNo || `SF${poData.poNo.replace(/[^0-9]/g, '').slice(0, 10)}`,
                        status: (poData.status === 'Completed' || poData.status === 'Received') ? '已签收' : '运输中',
                        shippedTime: poData.shippedTime,
                        expectTime: poData.expectTime || poData.expectedArrivalDate
                    }];
                }

                const info = {
                    ...poData,
                    logisticsList
                };
                setOrderInfo(info);
                
                // Set default expanded for all
                const allTrackingNos = logisticsList.map((l: any) => l.trackingNo);
                setExpandedKeys(allTrackingNos);

                // Load tracks
                if (logisticsList.length > 0) {
                    setTracksLoading(true);
                    const promises = logisticsList.map(async (log: any) => {
                        if (log.trackingNo) {
                            try {
                                const tracks = await getLogisticsTracks(log.trackingNo);
                                return { trackingNo: log.trackingNo, tracks };
                            } catch (e) {
                                console.error(e);
                                return { trackingNo: log.trackingNo, tracks: [] };
                            }
                        }
                        return null;
                    });
                    
                    const results = await Promise.all(promises);
                    const map: Record<string, LogisticsTrack[]> = {};
                    results.forEach(r => {
                        if (r) map[r.trackingNo] = r.tracks;
                    });
                    setLogisticsTracksMap(map);
                    setTracksLoading(false);
                }
            } else {
                setError('未找到采购单信息');
            }
        } catch (err) {
            console.error(err);
            setError('加载失败');
        } finally {
            setLoading(false);
        }
    };

    loadData();
  }, [id, location.state]);

  const toggleExpand = (trackingNo: string) => {
      const newKeys = expandedKeys.includes(trackingNo) 
          ? expandedKeys.filter(k => k !== trackingNo)
          : [...expandedKeys, trackingNo];
      setExpandedKeys(newKeys);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          message.success('复制成功');
      });
  };

  const getStatusIcon = (status: string, type?: string) => {
      if (type === 'error') return <ExclamationCircleOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />;
      if (status.includes('签收') || status.includes('已完成')) return <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />;
      if (status.includes('派送')) return <UserOutlined style={{ fontSize: 16, color: '#1890ff' }} />;
      if (status.includes('运输') || status.includes('发出') || status.includes('到达')) return <CarOutlined style={{ fontSize: 16, color: '#1890ff' }} />;
      if (status.includes('揽收') || status.includes('出库')) return <CarOutlined style={{ fontSize: 16, color: '#faad14' }} />;
      return <ClockCircleOutlined style={{ fontSize: 16, color: '#999' }} />;
  };

  const getStatusInfo = (status: string) => {
    const map: any = { 
        'Pending': { text: '待处理', color: 'orange' }, 
        'ToShip': { text: '待发货', color: 'cyan' }, 
        'Shipped': { text: '已发货', color: 'blue' }, 
        'Received': { text: '已收货', color: 'purple' }, 
        'Completed': { text: '已完成', color: 'green' } 
    };
    return map[status] || { text: status, color: 'default' };
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { hour12: false });
  };

  if (loading) {
      return (
          <div style={{ padding: 100, textAlign: 'center' }}>
              <Spin size="large" tip="加载物流信息中..." />
          </div>
      );
  }

  if (error) {
      return (
          <Result
            status="404"
            title="无法加载物流信息"
            subTitle={error}
            extra={<Button type="primary" onClick={() => navigate('/supply-chain/purchase-order')}>返回列表</Button>}
          />
      );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="供应链管理 > 采购订单 > 物流详情"
        description="采购单物流全屏详情页，展示多物流单号及详细轨迹。"
        fields={[]}
      />

      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/purchase-order')}>采购订单</a> },
         { title: '物流详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card title={`采购单号：${orderInfo?.poNo || id}`} extra={<Button onClick={() => navigate('/supply-chain/purchase-order')}>返回列表</Button>}>
             <Descriptions column={screens.md ? 3 : 1}>
                 <Descriptions.Item label="供应商">{orderInfo?.supplier || orderInfo?.supplierName}</Descriptions.Item>
                 <Descriptions.Item label="当前状态">
                    {(() => {
                        const info = getStatusInfo(orderInfo?.status);
                        return <Tag color={info.color}>{info.text}</Tag>;
                    })()}
                 </Descriptions.Item>
                 <Descriptions.Item label="发货时间">{formatDate(orderInfo?.shippedTime || orderInfo?.orderTime)}</Descriptions.Item>
             </Descriptions>
          </Card>

          <Card title="物流追踪">
            {orderInfo?.logisticsList && orderInfo.logisticsList.length > 0 ? (
                <div className="logistics-list">
                    {/* Header Row - Visible on Desktop */}
                    <Row className="logistics-header" style={{ fontWeight: 'bold', padding: '12px 0', borderBottom: '1px solid #f0f0f0', display: screens.md ? 'flex' : 'none' }}>
                        <Col flex="20%">物流公司</Col>
                        <Col flex="25%">物流单号</Col>
                        <Col flex="15%">当前状态</Col>
                        <Col flex="20%">预计送达</Col>
                        <Col flex="20%">操作</Col>
                    </Row>
                    
                    {orderInfo.logisticsList.map((item: any, index: number) => (
                        <div key={index} style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 0', minHeight: '48px' }}>
                            <Row align="middle" gutter={[16, 16]}>
                                <Col xs={24} md={0}><span style={{color:'#999'}}>物流公司：</span></Col>
                                <Col xs={24} md={{ flex: '20%' }} style={{ fontWeight: 'bold' }}>{item.company}</Col>
                                
                                <Col xs={24} md={0}><span style={{color:'#999'}}>物流单号：</span></Col>
                                <Col xs={24} md={{ flex: '25%' }}>
                                    <Space>
                                        {item.trackingNo}
                                        <Button type="text" icon={<CopyOutlined />} size="small" onClick={() => copyToClipboard(item.trackingNo)} />
                                    </Space>
                                </Col>
                                
                                <Col xs={24} md={0}><span style={{color:'#999'}}>当前状态：</span></Col>
                                <Col xs={24} md={{ flex: '15%' }}>
                                   <Tag color={item.status === '已签收' ? 'green' : 'blue'}>{item.status}</Tag>
                                </Col>
                                
                                <Col xs={24} md={0}><span style={{color:'#999'}}>预计送达：</span></Col>
                                <Col xs={24} md={{ flex: '20%' }}>{item.expectTime || '-'}</Col>
                                
                                <Col xs={24} md={{ flex: '20%' }}>
                                    <Button type="link" onClick={() => toggleExpand(item.trackingNo)} icon={expandedKeys.includes(item.trackingNo) ? <UpOutlined /> : <DownOutlined />}>
                                        {expandedKeys.includes(item.trackingNo) ? '收起详情' : '查看详情'}
                                    </Button>
                                </Col>
                            </Row>
                            
                            {/* Timeline Section */}
                            {expandedKeys.includes(item.trackingNo) && (
                                <div style={{ marginTop: 16, padding: '16px', background: '#fafafa', borderRadius: 4 }}>
                                    <div style={{ marginBottom: 16, fontWeight: 500, fontSize: 16 }}>物流轨迹：</div>
                                    {tracksLoading && !logisticsTracksMap[item.trackingNo] ? (
                                        <div style={{ textAlign: 'center', padding: 20 }}><Spin tip="加载物流轨迹..." /></div>
                                    ) : (logisticsTracksMap[item.trackingNo] && logisticsTracksMap[item.trackingNo].length > 0) ? (
                                        <Timeline 
                                            mode="left"
                                            items={logisticsTracksMap[item.trackingNo].map((track) => ({
                                                color: track.statusType === 'default' ? 'gray' : (track.statusType === 'error' ? 'red' : 'green'),
                                                dot: getStatusIcon(track.status, track.statusType),
                                                children: (
                                                    <div style={{ paddingBottom: 10 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: 14 }}>{track.status}</span>
                                                            <span style={{ color: '#999', fontSize: 12 }}>{track.time}</span>
                                                        </div>
                                                        <div style={{ color: '#666' }}>{track.description}</div>
                                                        <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                                                            <EnvironmentOutlined style={{ marginRight: 4 }} />
                                                            {track.location}
                                                            {track.operator && <span style={{ marginLeft: 10 }}><UserOutlined style={{ marginRight: 4 }}/>{track.operator}</span>}
                                                        </div>
                                                    </div>
                                                )
                                            }))}
                                        />
                                    ) : (
                                        <div style={{ color: '#999', padding: 20, border: '1px dashed #d9d9d9', borderRadius: 4, textAlign: 'center' }}>
                                            暂无物流轨迹信息
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <Empty description="暂无物流信息" />
            )}
          </Card>
      </Space>
    </div>
  );
};

export default PurchaseOrderLogistics;
