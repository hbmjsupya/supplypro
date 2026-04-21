import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, Breadcrumb, Divider, Spin, Result, message, Tooltip, Modal } from 'antd';
import { EyeOutlined, CarOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getOutboundOrderById, shipOutboundOrder, receiveOutboundOrder } from '../../services/warehouseService';
import LogisticsTracker from '../PurchaseOrder/components/LogisticsTracker';
import ShipOrderModal from '../PurchaseOrder/components/ShipOrderModal';
import PageDoc from '../../components/PageDoc';
import { getStatusText, getStatusColor } from '../../utils/statusMapping';
import { formatTimeFull } from '../../utils/dateFormatter';

import { ExclamationCircleOutlined } from '@ant-design/icons';

import dayjs from 'dayjs';

const OutboundOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [modal, contextHolder] = Modal.useModal();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [shipModalOpen, setShipModalOpen] = useState(false);

  const logisticsTrackerRef = React.useRef<any>(null);

  const fetchOrder = async () => {
    if (id) {
      setLoading(true);
      setError(null);
      try {
        const res = await getOutboundOrderById(Number(id));
        if (res) {
          setOrderInfo(res);
        }
      } catch (err: any) {
        console.error("Failed to fetch outbound order", err);
        const errorMsg = err.response?.data?.message || err.message || "获取详情失败，请刷新重试";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const getSourceTypeText = (sourceType: string) => {
    switch (sourceType) {
      case 'PURCHASE': return '分仓发货';
      case 'SALES': return '销售出库';
      case 'DROPSHIP': return '一件代发';
      default: return sourceType || '-';
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'PURCHASE': return 'purple';
      case 'SALES': return 'blue';
      case 'DROPSHIP': return 'cyan';
      default: return 'default';
    }
  };

  const OperationTypeMap: Record<string, string> = {
    'CREATE': '创建出库单',
    'UPDATE': '更新出库单',
    'SHIP': '出库发货',
    'CANCEL': '取消出库单',
    'STATUS_UPDATE': '状态更新',
    'STATUS_CHANGE': '状态变更',
  };

  const parseOutboundItems = (itemsStr: string) => {
    if (!itemsStr) return [];
    try {
      return JSON.parse(itemsStr);
    } catch {
      return [];
    }
  };

  const handleShipSuccess = async (orderId: number, payload: any) => {
    message.success('发货成功，已生成待结算配送单');
    setShipModalOpen(false);
    fetchOrder();
  };

  
  const handleConfirmReceive = () => {
    modal.confirm({
      title: '确认收货',
      icon: <ExclamationCircleOutlined />,
      content: '确认收到货物？此操作将记录收货人与时间。',
      onOk: async () => {
        try {
          if (!id) {
            throw new Error('出库单ID无效');
          }
          const ooId = Number(id);
          if (isNaN(ooId)) {
            throw new Error('出库单ID无效');
          }
          setLoading(true);
          await receiveOutboundOrder(ooId);
          message.success('收货成功');
          await fetchOrder();
          logisticsTrackerRef.current?.refresh();
        } catch (error: any) {
          console.error(error);
          message.error(error.message || '操作失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (error) {
    return (
      <Result
        status="500"
        title="获取详情失败"
        subTitle={error}
        extra={[
          <Button type="primary" key="retry" onClick={fetchOrder}>
            重试
          </Button>,
          <Button key="back" onClick={() => navigate('/supply-chain/outbound')}>
            返回列表
          </Button>,
        ]}
      />
    );
  }

  return (
    <div>
      {contextHolder}
      <PageDoc 
        pageTitle="仓储管理 > 出库单详情"
        description={`出库单详情子页面。

1. **页面布局**：
   - **相关单号信息**：出库单号、来源类型、来源单号。
   - **基本信息**：状态、仓库、创建时间、发货时间。
   - **商品信息**：商品名称、规格、数量、批次号。
   - **物流信息**：物流公司、物流单号、配送方式、物流跟踪。
   - **操作记录**：操作时间、操作人、操作类型、操作备注。`}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: '仓储管理' },
        { title: <a onClick={() => navigate('/supply-chain/outbound')}>出库单列表</a> },
        { title: '出库单详情' }
      ]} />

      <Spin spinning={loading} tip="加载中...">
        {orderInfo ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card 
              title="相关单号信息" 
              variant="borderless"
              extra={
                <Space>
                  {orderInfo.status === 'PENDING' && (
                    <Button type="primary" icon={<CarOutlined />} onClick={() => setShipModalOpen(true)}>
                      发货
                    </Button>
                  )}
                  {orderInfo.status === 'SHIPPED' && (
                    <Button icon={<EditOutlined />} onClick={() => setShipModalOpen(true)}>
                      修改物流
                    </Button>
                  )}
                  {['PENDING', 'SHIPPED'].includes(orderInfo.status) && orderInfo.status !== 'CANCELLED' && (
                    <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirmReceive}>
                      确认收货
                    </Button>
                  )}
                </Space>
              }
            >
              <Descriptions column={3}>
                <Descriptions.Item label="出库单号">
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{orderInfo.outboundNo}</span>
                </Descriptions.Item>
                <Descriptions.Item label="来源类型">
                  <Tag color={getSourceTypeColor(orderInfo.sourceType)}>
                    {getSourceTypeText(orderInfo.sourceType)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="来源单号">
                  <span style={{ color: '#722ed1' }}>{orderInfo.sourceRefNo || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="基本信息" variant="borderless">
              <Descriptions column={4}>
                <Descriptions.Item label="出库单状态">
                  <Tag color={getStatusColor(orderInfo.status?.toLowerCase(), 'outbound')}>
                    {getStatusText(orderInfo.status?.toLowerCase(), 'outbound')}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="仓库">{orderInfo.warehouse?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatTimeFull(orderInfo.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="发货时间">{formatTimeFull(orderInfo.shippedAt || orderInfo.logisticsCreatedAt)}</Descriptions.Item>
                <Descriptions.Item label="发货人">{orderInfo.confirmedBy || '-'}</Descriptions.Item>
                <Descriptions.Item label="期望到货时间">{formatTimeFull(orderInfo.expectedArrival)}</Descriptions.Item>
                <Descriptions.Item label="订单备注">{orderInfo.remark || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="收货信息" variant="borderless">
              <Descriptions column={3}>
                <Descriptions.Item label="收货人">{orderInfo.consignee || '-'}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{orderInfo.consigneePhone || '-'}</Descriptions.Item>
                <Descriptions.Item label="收货地址">{orderInfo.consigneeAddress || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="商品信息" variant="borderless">
              <Table 
                dataSource={parseOutboundItems(orderInfo.outboundItems)} 
                pagination={false}
                rowKey={(record, index) => `item-${index}`}
                columns={[
                  { title: '商品名称', dataIndex: 'productName', render: (v) => v || '-' },
                  { title: '规格', dataIndex: 'specName', render: (v) => v || '-' },
                  { title: '数量', dataIndex: 'quantity', render: (v) => v || '-' },
                  { title: '批次号', dataIndex: 'batchNo', render: (v) => v || '-' },
                ]}
                locale={{ emptyText: '暂无商品信息' }}
              />
            </Card>

            {orderInfo.refundRecords && orderInfo.refundRecords.length > 0 && (
            <Card title="退款记录" variant="borderless">
              <Table 
                size="small"
                pagination={false}
                dataSource={orderInfo.refundRecords}
                rowKey="id"
                locale={{ emptyText: '暂无退款记录' }}
                columns={[
                  { title: '退款单号', dataIndex: 'refundNo', render: (v: string, r: any) => v ? (
                      <a onClick={() => navigate(`/supply-chain/refund-order/detail/${r.id}`)}>{v}</a>
                  ) : '-' },
                  { title: '退款类型', dataIndex: 'refundType', render: (v: string) => (
                      <Tag color={v === 'REFUND_ONLY' ? 'blue' : 'orange'}>{v === 'REFUND_ONLY' ? '仅退款' : '退款退货'}</Tag>
                  )},
                  { title: '承担方', dataIndex: 'bearer', render: (v: string) => (
                      <Tag color={v === 'SUPPLIER' ? 'gold' : 'cyan'}>{v === 'SUPPLIER' ? '供应商' : '平台'}</Tag>
                  )},
                  { title: '商品规格', dataIndex: 'specName', render: (v) => v || '-' },
                  { title: '数量', dataIndex: 'quantity', render: (v) => v || '-' },
                  { title: '退款金额', dataIndex: 'refundAmount', render: (v: number) => (
                      <span style={{ color: '#ff4d4f' }}>¥{(v || 0).toFixed(2)}</span>
                  )},
                  { title: '状态', dataIndex: 'status', render: (v: string) => {
                      const statusMap: Record<string, { text: string; color: string }> = {
                          'PENDING': { text: '待处理', color: 'default' },
                          'RETURNING': { text: '退货中', color: 'processing' },
                          'RECEIVED': { text: '已收货', color: 'success' },
                          'COMPLETED': { text: '已完成', color: 'green' },
                          'CANCELLED': { text: '已取消', color: 'red' },
                      };
                      const info = statusMap[v] || { text: v, color: 'default' };
                      return <Tag color={info.color}>{info.text}</Tag>;
                  }},
                  { title: '创建时间', dataIndex: 'createdAt', render: (v) => v || '-' },
                ]}
              />
            </Card>
            )}

            {orderInfo.status === 'SHIPPED' && (
              <Card title="物流信息" variant="borderless">
                <Descriptions column={3} style={{ marginBottom: 20 }}>
                  <Descriptions.Item label="配送方式">
                    {orderInfo.deliveryMethod === 'SelfDelivery' ? '自配送' : '物流配送'}
                  </Descriptions.Item>
                  <Descriptions.Item label="物流公司">{orderInfo.logisticsCompany || orderInfo.logisticsProvider?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="物流单号">{orderInfo.trackingNo || '-'}</Descriptions.Item>
                  <Descriptions.Item label="物流费用">{orderInfo.logisticsFee ? `¥${orderInfo.logisticsFee}` : '-'}</Descriptions.Item>
                </Descriptions>
                
                {orderInfo.id && (
                  <>
                    <Divider style={{ fontSize: 14 }}>物流跟踪</Divider>
                    <LogisticsTracker 
                      outboundOrderId={orderInfo.id}
                      trackingNo={orderInfo.trackingNo}
                      deliveryMethod={orderInfo.deliveryMethod}
                      hideRelatedOrders
                    />
                  </>
                )}
              </Card>
            )}

            <Card title="操作记录" variant="borderless">
              <Table 
                size="small"
                pagination={false}
                dataSource={orderInfo.orderLogs || []}
                rowKey="id"
                locale={{ emptyText: '暂无操作记录' }}
                columns={[
                  { 
                    title: '时间', 
                    dataIndex: 'createdAt',
                    width: 180,
                    render: (v) => formatTimeFull(v)
                  },
                  { 
                    title: '操作人', 
                    dataIndex: 'operator',
                    width: 100,
                    render: (v) => v || '系统'
                  },
                  { 
                    title: '操作类型', 
                    dataIndex: 'operationType', 
                    width: 120,
                    render: (v) => {
                      const typeText = OperationTypeMap[v] || v;
                      const colorMap: Record<string, string> = {
                        '创建出库单': 'green',
                        '更新出库单': 'blue',
                        '出库发货': 'orange',
                        '取消出库单': 'red',
                        '状态更新': 'geekblue',
                        '状态变更': 'geekblue',
                      };
                      const color = colorMap[typeText] || 'default';
                      return <Tag color={color}>{typeText}</Tag>;
                    }
                  },
                  { 
                    title: '操作详情', 
                    dataIndex: 'remark',
                    render: (v, record: any) => {
                      if (!v) return '-';
                      let detail = v;
                      if (record.oldValue && record.newValue) {
                        detail = `${v}（${record.oldValue} → ${record.newValue}）`;
                      }
                      return <span style={{ color: '#666' }}>{detail}</span>;
                    }
                  },
                ]}
              />
            </Card>
          </Space>
        ) : null}
      </Spin>

      <ShipOrderModal 
        open={shipModalOpen} 
        onCancel={() => setShipModalOpen(false)}
        onSuccess={handleShipSuccess}
        order={orderInfo ? {
            id: orderInfo.id,
            poNo: orderInfo.outboundNo,
            quantity: parseOutboundItems(orderInfo.outboundItems).reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0),
            items: parseOutboundItems(orderInfo.outboundItems),
            deliveryMethod: orderInfo.deliveryMethod,
            logisticsProviderId: orderInfo.logisticsProvider?.id || orderInfo.logisticsProviderId,
            shipCompany: orderInfo.logisticsCompany,
            shipNo: orderInfo.trackingNo,
            freight: orderInfo.logisticsFee,
            shippingStatus: orderInfo.status,
            attachments: undefined
        } : null}
        isOutboundOrder={true}
      />
    </div>
  );
};

export default OutboundOrderDetail;
