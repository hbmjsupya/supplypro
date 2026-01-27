import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Steps, Button, Space, Breadcrumb, Tag, Modal, Input, message, Timeline, Radio, Result, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, UserOutlined, CarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import { getInboundOrders, getWarehouses } from '../../services/warehouseService';
import { getPurchaseOrders } from '../../services/purchaseOrderService';

interface LogisticsTrackItem {
    time: string;
    status: string;
    statusType: string;
    location: string;
    description: string;
    operator: string;
}

const getStatusIcon = (status: string, statusType?: string) => {
    switch (status) {
        case '已签收': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        case '派送失败': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
        case '运输中': return <CarOutlined style={{ color: '#1890ff' }} />;
        default: return <ClockCircleOutlined />;
    }
};

const InboundOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [demoStatus, setDemoStatus] = useState<string>('InTransit');

  const detailedLogisticsMocks: Record<string, { status: string; color: string; tracks: LogisticsTrackItem[] }> = {
      InTransit: {
          status: '运输中',
          color: 'processing',
          tracks: [
              {
                  time: '2023-10-27 14:30',
                  status: '运输中',
                  statusType: 'processing',
                  location: '杭州转运中心',
                  description: '快件已到达 杭州转运中心',
                  operator: '王五'
              },
              {
                  time: '2023-10-27 09:15',
                  status: '已发出',
                  statusType: 'default',
                  location: '上海集散中心',
                  description: '快件已从 上海集散中心 发出',
                  operator: '李四'
              },
              {
                  time: '2023-10-26 18:20',
                  status: '已揽收',
                  statusType: 'default',
                  location: '上海市',
                  description: '顺丰速运 已收取快件',
                  operator: '张三'
              }
          ]
      },
      Delivered: {
          status: '已签收',
          color: 'success',
          tracks: [
              {
                  time: '2023-10-28 10:00',
                  status: '已签收',
                  statusType: 'success',
                  location: '杭州市',
                  description: '已签收，签收人：库管员',
                  operator: '赵六'
              },
              {
                  time: '2023-10-28 08:30',
                  status: '派送中',
                  statusType: 'processing',
                  location: '杭州市',
                  description: '快件正在派送中',
                  operator: '配送员A'
              },
              {
                  time: '2023-10-27 14:30',
                  status: '运输中',
                  statusType: 'default',
                  location: '杭州转运中心',
                  description: '快件已到达 杭州转运中心',
                  operator: '王五'
              }
          ]
      },
      Exception: {
          status: '异常',
          color: 'error',
          tracks: [
              {
                  time: '2023-10-28 10:00',
                  status: '派送失败',
                  statusType: 'error',
                  location: '杭州市',
                  description: '派送失败：收货人地址不详，正在联系发件人',
                  operator: '配送员A'
              },
              {
                  time: '2023-10-28 08:30',
                  status: '派送中',
                  statusType: 'processing',
                  location: '杭州市',
                  description: '快件正在派送中',
                  operator: '配送员A'
              },
              {
                  time: '2023-10-27 14:30',
                  status: '运输中',
                  statusType: 'default',
                  location: '杭州转运中心',
                  description: '快件已到达 杭州转运中心',
                  operator: '王五'
              }
          ]
      }
  };

  useEffect(() => {
    const loadData = async () => {
        if (!id) {
            message.error('参数错误：缺少入库单ID');
            navigate('/supply-chain/inbound');
            return;
        }
        setLoading(true);
        try {
            const inboundOrders = await getInboundOrders();
            const inbound = inboundOrders.find(o => o.id === id);
            
            if (inbound) {
                const [purchaseOrders, warehouses] = await Promise.all([
                    getPurchaseOrders(),
                    getWarehouses()
                ]);
                const po = purchaseOrders.find(p => p.poNo === inbound.poNo);
                const wh = warehouses.find(w => w.code === inbound.warehouseCode);
                
                setOrderInfo({
                    ...inbound,
                    supplier: inbound.supplierName || '未知供应商',
                    warehouseName: wh ? wh.name : inbound.warehouseCode,
                    warehouseAddress: wh ? `${wh.province}${wh.city}${wh.district}${wh.address}` : '未知地址',
                    warehouseContact: wh && wh.admins ? wh.admins.join(', ') : '未知',
                    creator: 'System', // Mock
                    logs: [
                        { time: inbound.createTime, user: 'System', action: '自动生成入库单' },
                        ...(inbound.confirmTime ? [{ time: inbound.confirmTime, user: inbound.confirmBy || 'Admin', action: '确认入库' }] : [])
                    ],
                    // Logistics from PO
                    logistics: po ? {
                        company: po.logisticsCompany || '暂无',
                        trackingNo: po.trackingNo || '暂无',
                        status: po.status === 'shipped' ? '运输中' : '待发货',
                        shippedTime: po.shippedTime,
                        fee: po.logisticsFee
                    } : null
                });
            } else {
                console.warn(`Inbound order not found: ${id}`);
                message.error('未找到入库单信息');
                // Keep on page or navigate? Navigate is safer for users.
                // navigate('/supply-chain/inbound');
            }
        } catch (error) {
            console.error('Failed to load inbound order detail:', error);
            message.error('数据加载失败');
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [id, navigate]);

  const handleApprove = () => {
    message.success('审批通过');
    // Mock status update logic
  };

  const handleReject = () => {
    message.success('已驳回');
    setRejectModalOpen(false);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${y}年${m}月${d}日 ${h}:${min}:${s}`;
  };

  if (loading) {
      return (
          <div style={{ padding: 100, textAlign: 'center' }}>
              <Spin size="large" tip="加载中..." />
          </div>
      );
  }

  if (error || !orderInfo) {
      return (
          <Result
            status={error === '未找到入库单信息' ? '404' : '500'}
            title={error === '未找到入库单信息' ? '404' : '出错了'}
            subTitle={error || '无法加载页面信息'}
            extra={<Button type="primary" onClick={() => navigate('/supply-chain/inbound')}>返回列表</Button>}
          />
      );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 采购入库 > 入库单详情"
        description={`入库单全屏详情页。
          1. **审批流程**：可视化展示当前审批进度。
          2. **审批操作**：支持通过、驳回、转审操作。
          3. **完整信息**：展示关联采购单、商品明细及操作日志。
          4. **物流追踪**：展示物流公司、单号及轨迹图。
        `}
        fields={[
          { name: 'id', type: 'String', desc: '入库单号' },
          { name: 'status', type: 'Enum', desc: '状态：待审批、已通过、已驳回、已完成' }
        ]}
      />

      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '仓储管理' },
         { title: <a onClick={() => navigate('/supply-chain/inbound')}>采购入库</a> },
         { title: '入库单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%', paddingBottom: 60 }} size="large">
        
        <Card title="基本信息" bordered={false}>
           <Descriptions column={3}>
              <Descriptions.Item label="入库单号">{orderInfo.id}</Descriptions.Item>
              <Descriptions.Item label="关联采购单">
                 <a onClick={() => navigate('/supply-chain/purchase-order')}>{orderInfo.poNo}</a>
              </Descriptions.Item>
              <Descriptions.Item label="入库仓库">{orderInfo.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="入库地址" span={2}>{orderInfo.warehouseAddress}</Descriptions.Item>
              <Descriptions.Item label="仓库联系人">{orderInfo.warehouseContact}</Descriptions.Item>
              <Descriptions.Item label="供应商">{orderInfo.supplier}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(orderInfo.createTime)}</Descriptions.Item>
              <Descriptions.Item label="创建人">{orderInfo.creator}</Descriptions.Item>
              <Descriptions.Item label="状态">
                 <Tag color="orange">{orderInfo.status}</Tag>
              </Descriptions.Item>
           </Descriptions>
        </Card>

        {/* Logistics Information */}
        <Card 
            title="物流信息" 
            bordered={false}
            extra={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 8, fontSize: 12, color: '#999' }}>示例状态切换:</span>
                    <Radio.Group 
                        size="small" 
                        value={demoStatus} 
                        onChange={e => setDemoStatus(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="InTransit">运输中</Radio.Button>
                        <Radio.Button value="Delivered">已签收</Radio.Button>
                        <Radio.Button value="Exception">异常</Radio.Button>
                    </Radio.Group>
                </div>
            }
        >
            {orderInfo.logistics ? (
                <>
                    <Descriptions column={3} style={{ marginBottom: 20 }}>
                        <Descriptions.Item label="物流公司">{orderInfo.logistics.company}</Descriptions.Item>
                        <Descriptions.Item label="物流单号">{orderInfo.logistics.trackingNo}</Descriptions.Item>
                        <Descriptions.Item label="当前状态">
                            <Tag color={detailedLogisticsMocks[demoStatus].color}>{detailedLogisticsMocks[demoStatus].status}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="发货时间">{formatDate(orderInfo.logistics.shippedTime)}</Descriptions.Item>
                        <Descriptions.Item label="物流费用">¥{orderInfo.logistics.fee || '0.00'}</Descriptions.Item>
                    </Descriptions>
                    
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: 16, fontWeight: 500, fontSize: 16 }}>物流轨迹：</div>
                            <Timeline 
                                mode="left"
                                items={detailedLogisticsMocks[demoStatus].tracks.map((item, index) => ({
                                    color: item.statusType === 'default' ? 'gray' : (item.statusType === 'error' ? 'red' : 'green'),
                                    dot: getStatusIcon(item.status, item.statusType),
                                    children: (
                                        <div style={{ paddingBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 'bold', fontSize: 14 }}>{item.status}</span>
                                                <span style={{ color: '#999', fontSize: 12 }}>{item.time}</span>
                                            </div>
                                            <div style={{ color: '#666' }}>{item.description}</div>
                                            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                                                <EnvironmentOutlined style={{ marginRight: 4 }} />
                                                {item.location}
                                                {item.operator && <span style={{ marginLeft: 10 }}><UserOutlined style={{ marginRight: 4 }}/>{item.operator}</span>}
                                            </div>
                                        </div>
                                    )
                                }))}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>地图轨迹：</div>
                            <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, textAlign: 'center', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d9d9d9' }}>
                                <Space direction="vertical">
                                    <CarOutlined style={{ fontSize: 40, color: '#1890ff' }} />
                                    <span style={{ color: '#999' }}>此处展示地图轨迹 (Mock Map View)</span>
                                    <span style={{ fontSize: 12 }}>{orderInfo.logistics.company} - {orderInfo.logistics.trackingNo}</span>
                                </Space>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ color: '#999', textAlign: 'center' }}>暂无物流信息</div>
            )}
        </Card>

        <Card title="入库明细" bordered={false}>
           <Table 
              dataSource={orderInfo.items}
              pagination={false}
              rowKey="skuId"
              columns={[
                 { title: '商品名称', dataIndex: 'productName' },
                 { title: '规格', dataIndex: 'specName' },
                 { title: '入库数量', dataIndex: 'quantity' },
                 { title: '成本单价', dataIndex: 'unitCost', render: (v: number) => `¥${v.toFixed(2)}` },
                 { title: '成本合计', render: (_, r: any) => `¥${(r.quantity * r.unitCost).toFixed(2)}` },
              ]}
           />
        </Card>


        {/* Approval Flow */}
        <Card title="审批流程" bordered={false}>
           <Steps
             direction="vertical"
             current={1}
             items={[
               { title: '提交申请', description: '张三 2023-10-27 10:05', icon: <UserOutlined /> },
               { title: '部门主管审批', description: '进行中', icon: <ClockCircleOutlined /> },
               { title: '仓库确认', icon: <CheckCircleOutlined /> },
               { title: '完成', icon: <CheckCircleOutlined /> },
             ]}
           />
        </Card>

        <Card title="操作日志" bordered={false}>
           <Timeline
              items={orderInfo.logs.map((log: any) => ({
                 children: `${log.time} ${log.user} ${log.action}`
              }))}
           />
        </Card>
      </Space>

      {/* Fixed Footer Buttons */}
      <div style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          left: 0, // Ensure it spans full width if inside a layout container, might need adjustment based on layout
          width: '100%',
          padding: '10px 24px',
          background: '#fff',
          borderTop: '1px solid #e8e8e8',
          textAlign: 'right',
          zIndex: 999,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
      }}>
         <Space>
           <Button onClick={() => navigate(-1)}>返回</Button>
           <Button danger onClick={() => setRejectModalOpen(true)}>驳回</Button>
           <Button type="primary" onClick={handleApprove}>审批通过</Button>
         </Space>
      </div>

      <Modal
        title="驳回审批"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => setRejectModalOpen(false)}
      >
         <Input.TextArea placeholder="请输入驳回理由..." rows={4} />
      </Modal>
    </div>
  );
};

export default InboundOrderDetail;
