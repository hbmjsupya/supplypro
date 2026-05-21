import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Button, Space, Breadcrumb, Tag, Modal, message, Timeline, Result, Spin, Divider, Avatar } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircleOutlined, ClockCircleOutlined, UserOutlined, PaperClipOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import { getInboundOrder, getInboundOrderByNo, confirmInboundOrder } from '../../services/warehouseService';
import { getStatusText, getStatusColor } from '../../utils/statusMapping';
import LogisticsTracker, { LogisticsTrackerRef } from '../PurchaseOrder/components/LogisticsTracker';
import { useRef } from 'react';

const InboundOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orderInfo, setOrderInfo] = useState<any>(null);
  
  // Ref for LogisticsTracker component to enable refresh
  const logisticsTrackerRef = useRef<LogisticsTrackerRef>(null);

  const loadData = async () => {
        // 支持通过 ?no=INxxx 参数查询
        const no = searchParams.get('no');
        if (no) {
          setLoading(true);
          setLoadError(false);
          try {
              const res = await getInboundOrderByNo(no);
              if (res && res.id) {
                  navigate(`/supply-chain/inbound/detail/${res.id}`, { replace: true });
                  return;
              } else {
                  setLoadError(true);
                  setErrorMessage('入库单不存在');
                  setLoading(false);
                  return;
              }
          } catch (error) {
              console.error('Failed to load inbound order by no:', error);
              setLoadError(true);
              setErrorMessage('入库单不存在');
              setLoading(false);
              return;
          }
        }

        if (!id) {
            message.error('参数错误：缺少入库单ID');
            navigate('/supply-chain/inbound');
            return;
        }
        setLoading(true);
        setLoadError(false);
        setErrorMessage('');
        try {
            const inbound = await getInboundOrder(id);
            
            if (inbound) {
                // Determine step current based on status
                let stepCurrent = 0;
                if (inbound.status === 'PENDING') stepCurrent = 1;
                else if (inbound.status === 'RECEIVED') stepCurrent = 2;
                else if (inbound.status === 'COMPLETED') stepCurrent = 3;
                else if (inbound.status === 'CANCELLED') stepCurrent = 1; // Or special handling

                setOrderInfo({
                    ...inbound,
                    stepCurrent
                });
            } else {
                console.warn(`Inbound order not found: ${id}`);
                setLoadError(true);
                setErrorMessage('未找到入库单信息');
            }
        } catch (error) {
            console.error('Failed to load inbound order detail:', error);
            setLoadError(true);
            const err = error as Error;
            if (err.message === 'PERMISSION_DENIED') {
                setErrorMessage('无权访问该入库单信息');
            } else {
                setErrorMessage('数据加载失败，请检查网络或联系管理员');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id, navigate]);

  const handleConfirm = async () => {
    try {
        if (!id) return;
         
        await confirmInboundOrder(id, 'CurrentUser');
        message.success('确认到货成功');
        setConfirmModalOpen(false);
        // Refresh data
        window.location.reload();
    } catch (error) {
        message.error('确认失败');
        console.error(error);
    }
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

  if (loadError || !orderInfo) {
        return (
            <Result
                status={errorMessage === '未找到入库单信息' ? '404' : errorMessage === '无权访问该入库单信息' ? '403' : '500'}
                title={errorMessage === '未找到入库单信息' ? '404' : errorMessage === '无权访问该入库单信息' ? '403' : '出错了'}
                subTitle={errorMessage || '无法加载页面信息'}
                extra={[
                    <Button type="primary" key="back" onClick={() => navigate('/supply-chain/inbound')}>返回列表</Button>,
                    <Button key="retry" onClick={loadData}>重试</Button>
                ]}
            />
        );
    }

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 采购入库 > 入库单详情"
        description={`入库单全屏详情页。
          1. **基本信息**：展示关联采购单、商品明细及操作日志。
          2. **物流追踪**：展示物流公司、单号及轨迹图。
          3. **确认入库**：库管员核对实物后确认到货。
        `}
        fields={[
          { name: 'id', type: 'String', desc: '入库单号' },
          { name: 'status', type: 'Enum', desc: '状态：待确认、已完成、已取消' }
        ]}
      />

      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '仓储管理' },
         { title: <a onClick={() => navigate('/supply-chain/inbound')}>采购入库</a> },
         { title: '入库单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%', paddingBottom: 60 }} size="large">
        
        <Card title="基本信息" variant="borderless">
           <Descriptions column={3}>
              <Descriptions.Item label="入库单号">{orderInfo.inboundNo || orderInfo.id}</Descriptions.Item>
              <Descriptions.Item label="关联采购单">
                 <a 
                    href={`/supply-chain/purchase-order/detail/${orderInfo.purchaseOrder?.id || orderInfo.poId || ''}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                 >
                    {orderInfo.purchaseOrder?.orderNo || orderInfo.poNo}
                 </a>
              </Descriptions.Item>
              <Descriptions.Item label="入库仓库">{orderInfo.warehouse?.name || orderInfo.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="入库地址" span={2}>
                  {orderInfo.deliveryInfo ? (
                      `${orderInfo.deliveryInfo.province || ''} ${orderInfo.deliveryInfo.city || ''} ${orderInfo.deliveryInfo.district || ''} ${orderInfo.deliveryInfo.detailAddress || ''}`
                  ) : (
                      orderInfo.warehouse?.address || '-'
                  )}
              </Descriptions.Item>
              <Descriptions.Item label="联系人">{orderInfo.deliveryInfo?.contactName || orderInfo.warehouse?.contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{orderInfo.deliveryInfo?.contactPhone || '-'}</Descriptions.Item>
              <Descriptions.Item label="供应商">{orderInfo.purchaseOrder?.supplier?.name || orderInfo.supplierName}</Descriptions.Item>
              <Descriptions.Item label="供应商联系人">{orderInfo.purchaseOrder?.supplier?.contact || orderInfo.supplierContact || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(orderInfo.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="确认时间">{formatDate(orderInfo.inboundDate)}</Descriptions.Item>
              <Descriptions.Item label="确认人">{orderInfo.confirmedBy || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                 <Tag color={getStatusColor(orderInfo.status)}>{getStatusText(orderInfo.status)}</Tag>
              </Descriptions.Item>
           </Descriptions>
        </Card>

        <Card title="物流信息" variant="borderless">
            {orderInfo.status === 'CANCELLED' ? (
               <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>订单已取消，无需物流信息</div>
            ) : ['PENDING', 'CONFIRMED', '待处理', '待发货'].includes((orderInfo.logistics || orderInfo.logisticsInfo)?.status || orderInfo.purchaseOrder?.shippingStatus || orderInfo.status) ? (
               <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无物流信息</div>
            ) : (
               <>
                  <Descriptions column={3} style={{ marginBottom: 20 }}>
                     <Descriptions.Item label="商品信息" span={3}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(orderInfo.items || []).map((item: any) => `${item.productName} (${item.specName}) x ${item.quantity}`).join(', ')}
                     </Descriptions.Item>
                     <Descriptions.Item label="配送方式">{(orderInfo.logistics || orderInfo.logisticsInfo)?.deliveryMethod === 'SelfDelivery' ? '自配送' : '物流配送'}</Descriptions.Item>
                     <Descriptions.Item label="物流供应商">
                        {(orderInfo.logistics || orderInfo.logisticsInfo)?.logisticsSupplierName || 
                         (orderInfo.logistics || orderInfo.logisticsInfo)?.company || 
                         orderInfo.supplierName || '-'}
                     </Descriptions.Item>
                     
                     {(orderInfo.logistics || orderInfo.logisticsInfo)?.deliveryMethod === 'SelfDelivery' ? (
                        <>
                           <Descriptions.Item label="配送员">
                               <Space>
                                   <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} size="small" />
                                   {(orderInfo.logistics || orderInfo.logisticsInfo)?.deliverer}
                               </Space>
                           </Descriptions.Item>
                           <Descriptions.Item label="联系电话">{(orderInfo.logistics || orderInfo.logisticsInfo)?.delivererPhone}</Descriptions.Item>
                           <Descriptions.Item label="车牌号">{(orderInfo.logistics || orderInfo.logisticsInfo)?.plateNo || '-'}</Descriptions.Item>
                           <Descriptions.Item label="当前位置">{(orderInfo.logistics || orderInfo.logisticsInfo)?.currentLocation || '-'}</Descriptions.Item>
                           <Descriptions.Item label="物流单号">{(orderInfo.logistics || orderInfo.logisticsInfo)?.shipNo}</Descriptions.Item>
                        </>
                     ) : (
                        <>
                           <Descriptions.Item label="物流公司">{(orderInfo.logistics || orderInfo.logisticsInfo)?.shipCompany}</Descriptions.Item>
                           <Descriptions.Item label="物流单号">{(orderInfo.logistics || orderInfo.logisticsInfo)?.shipNo}</Descriptions.Item>
                           <Descriptions.Item label="辅助码">{(orderInfo.logistics || orderInfo.logisticsInfo)?.shipAuxCode || '-'}</Descriptions.Item>
                        </>
                     )}
                     <Descriptions.Item label="录入时间">{formatDate((orderInfo.logistics || orderInfo.logisticsInfo)?.shipTime)}</Descriptions.Item>
                      {(((orderInfo.logistics || orderInfo.logisticsInfo)?.deliveryMethod === 'SelfDelivery') || (orderInfo.logistics || orderInfo.logisticsInfo)?.shippingProof) && (
                         <Descriptions.Item label="发货凭证" span={3}>
                            {(() => {
                               try {
                                  // For SelfDelivery, fallback to attachments (legacy proof). 
                                  // For Logistics, ONLY use shippingProof (attachments is Contract).
                                  const attachments = (orderInfo.logistics || orderInfo.logisticsInfo)?.deliveryMethod === 'SelfDelivery' 
                                      ? ((orderInfo.logistics || orderInfo.logisticsInfo)?.shippingProof || (orderInfo.logistics || orderInfo.logisticsInfo)?.attachments)
                                      : (orderInfo.logistics || orderInfo.logisticsInfo)?.shippingProof;
                                      
                                  if (!attachments) return <span style={{ color: '#999' }}>暂无凭证</span>;
                                 
                                  const attachmentList = typeof attachments === 'string' 
                                    ? JSON.parse(attachments) 
                                    : attachments;
                                 
                                 if (!Array.isArray(attachmentList) || attachmentList.length === 0) {
                                    return <span style={{ color: '#999' }}>暂无凭证</span>;
                                 }

                                 // Re-use logic or duplicate for now
                                 return (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                       {attachmentList.map((file: string, index: number) => (
                                          <div key={index} onClick={() => {
                                             if (file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                                                Modal.info({
                                                   icon: null,
                                                   content: <img src={file} style={{ maxWidth: '100%', maxHeight: '70vh' }} alt="凭证" />,
                                                   width: '80%',
                                                   okText: '关闭',
                                                });
                                             } else {
                                                window.open(file, '_blank');
                                             }
                                          }} style={{ cursor: 'pointer' }}>
                                             {file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <img src={file} alt="凭证" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }} />
                                             ) : (
                                                <Button size="small" icon={<PaperClipOutlined />}>附件</Button>
                                             )}
                                          </div>
                                       ))}
                                    </div>
                                 );
                              } catch {
                                 return <span style={{ color: '#ff4d4f' }}>凭证解析失败</span>;
                              }
                           })()}
                        </Descriptions.Item>
                     )}
                  </Descriptions>
                  <Divider style={{ fontSize: 14 }}>物流跟踪</Divider>
                  {orderInfo.purchaseOrder?.id && <LogisticsTracker 
                      ref={logisticsTrackerRef}
                      orderId={Number(orderInfo.purchaseOrder.id)} 
                      trackingNo={(orderInfo.logistics || orderInfo.logisticsInfo)?.shipNo} 
                      deliveryMethod={(orderInfo.logistics || orderInfo.logisticsInfo)?.deliveryMethod}
                      deliverer={(orderInfo.logistics || orderInfo.logisticsInfo)?.deliverer}
                      contact={(orderInfo.logistics || orderInfo.logisticsInfo)?.delivererPhone}
                      plateNumber={(orderInfo.logistics || orderInfo.logisticsInfo)?.plateNo}
                      hideRelatedOrders={true}
                  />}
               </>
            )}
        </Card>

        <Card title="入库明细" variant="borderless">
           <Table 
              dataSource={orderInfo.items}
              pagination={false}
              rowKey="id"
              columns={[
                 { title: '商品名称', dataIndex: 'productName' },
                 { title: '规格', dataIndex: 'specName' },
                 { title: '入库数量', dataIndex: 'quantity' },
                 { title: '成本单价', dataIndex: 'unitCost', render: (v: number) => `¥${v ? v.toFixed(2) : '0.00'}` },
                 { title: '成本合计', dataIndex: 'totalCost', render: (v: number) => `¥${v ? v.toFixed(2) : '0.00'}` },
                 { title: '税率', dataIndex: 'taxRate', render: (v: number) => `${v ? (v * 100).toFixed(0) : 0}%` },
                 { title: '税额', dataIndex: 'taxAmount', render: (v: number) => `¥${v ? v.toFixed(2) : '0.00'}` },
              ]}
              summary={() => {
                  return (
                    <>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2}>合计</Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>{orderInfo.totalQuantity}</Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>¥{orderInfo.totalAmount?.toFixed(2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>-</Table.Summary.Cell>
                        <Table.Summary.Cell index={6}>¥{orderInfo.totalTax?.toFixed(2)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    </>
                  );
              }}
           />
        </Card>

        {/* Operation Logs */}
        {orderInfo.operationLogs && orderInfo.operationLogs.length > 0 && (
            <Card title="操作日志" variant="borderless">
                <Table
                    dataSource={orderInfo.operationLogs}
                    rowKey="time"
                    pagination={false}
                    size="small"
                    columns={[
                        { title: '操作类型', dataIndex: 'type', width: 150 },
                        { title: '操作人', dataIndex: 'operator', width: 150 },
                        { title: '操作时间', dataIndex: 'time', render: (t: string) => formatDate(t) },
                        { title: '备注', dataIndex: 'remark', render: (t: string) => t || '-' }
                    ]}
                />
            </Card>
        )}



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
           {orderInfo && (orderInfo.status === 'PENDING' || orderInfo.status === 'pending') && (
             <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setConfirmModalOpen(true)}>确认到货</Button>
           )}
         </Space>
      </div>

      <Modal
        title="确认到货"
        open={confirmModalOpen}
        onOk={handleConfirm}
        onCancel={() => setConfirmModalOpen(false)}
        width={600}
      >
        <p>确认以下商品已实际到货并入库？</p>
        <Card size="small" variant="borderless" style={{ background: '#f5f5f5' }}>
            <Descriptions column={1} size="small">
                <Descriptions.Item label="入库单号">{orderInfo?.id}</Descriptions.Item>
                <Descriptions.Item label="供应商">{orderInfo?.supplier}</Descriptions.Item>
            </Descriptions>
        </Card>
        <Table 
            dataSource={orderInfo?.items || []}
            pagination={false}
            rowKey="id"
            size="small"
            scroll={{ y: 200 }}
            columns={[
                { title: '商品', dataIndex: 'productName' },
                { title: '规格', dataIndex: 'specName' },
                { title: '数量', dataIndex: 'quantity' },
            ]}
            style={{ marginTop: 16 }}
        />
        <p style={{ marginTop: 16, color: '#999' }}>确认后将自动更新库存，此操作不可撤销。</p>
      </Modal>
    </div>
  );
};

export default InboundOrderDetail;
