import React, { useState, useEffect, useRef } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, Breadcrumb, Divider, Modal, Form, Input, Row, Col, message, Upload, Statistic, InputNumber, Radio, DatePicker, Select, Spin, Tooltip, Result, Avatar, Image } from 'antd';
import { UploadOutlined, UserOutlined, FileOutlined, DownloadOutlined, EyeOutlined, PaperClipOutlined, FilePdfOutlined, FileImageOutlined, FileWordOutlined, FileExcelOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { shipPurchaseOrder, getPurchaseOrderById, getPurchaseOrderByNo, receivePurchaseOrder, cancelPurchaseOrder } from '../../services/purchaseOrderService';
import { getLogisticsProviders, getLogisticsCompanies } from '../../services/logisticsService';
import { LogisticsProvider } from '../../types/logistics';
import LogisticsTracker, { LogisticsTrackerRef } from './components/LogisticsTracker';
import PageDoc from '../../components/PageDoc';
import { getShippingStatusInfo, getStatusText, getStatusColor, getStatusInfo } from '../../utils/statusMapping';
import { StatusTranslator } from '../../utils/statusTranslator';
import ShipOrderModal from './components/ShipOrderModal';
import { createSingleAdjustment, getAdjustmentItemsByPurchaseOrderId, CostAdjustmentSheet, CostAdjustmentItem } from '../../services/costAdjustmentService';

const PurchaseOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [form] = Form.useForm();
  // const [shipForm] = Form.useForm(); // Removed
  const [logisticsProviders, setLogisticsProviders] = useState<LogisticsProvider[]>([]);
  const [logisticsCompanies, setLogisticsCompanies] = useState<any[]>([]); // Keep for display if needed, but modal handles its own
  // const [shipType, setShipType] = useState('Logistics'); // Removed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, contextHolder] = Modal.useModal();

  const [orderInfo, setOrderInfo] = useState<any>(null);
  
  // Ref for LogisticsTracker component to enable refresh
  const logisticsTrackerRef = useRef<LogisticsTrackerRef>(null);

  // Validation states moved to ShipOrderModal
  // const [waybillWarning, setWaybillWarning] = useState<{ message: string; poNo: string; amount: number } | null>(null);
  // const [isLogisticsFeeLocked, setIsLogisticsFeeLocked] = useState(false);
  // const [isDriverInfoLocked, setIsDriverInfoLocked] = useState(false);
  // const [isLogisticsProviderLocked, setIsLogisticsProviderLocked] = useState(false);
  // const [isLogisticsCompanyLocked, setIsLogisticsCompanyLocked] = useState(false);
  
  // Removed shipNo/shipType watchers and effects as they are now in ShipOrderModal

  const [refundRecords, setRefundRecords] = useState<any[]>([]);
  const [orderLogs, setOrderLogs] = useState<any[]>([]);
  const [priceAdjustRecords, setPriceAdjustRecords] = useState<any[]>([]);
  const [settlementRecords, setSettlementRecords] = useState<any[]>([]);
  const [costAdjustModalOpen, setCostAdjustModalOpen] = useState(false);
  const [costAdjustForm] = Form.useForm();
  const [costAdjustRecords, setCostAdjustRecords] = useState<CostAdjustmentItem[]>([]);

  const OperationTypeMap: Record<string, string> = {
    'CREATE': '创建订单',
    'UPDATE': '更新订单',
    'SHIP': '订单发货',
    'CANCEL': '取消订单',
    'INBOUND': '入库操作',
    'PRICE_ADJUSTMENT': '成本调价',
    'STATUS_UPDATE': '状态更新',
    'STATUS_CHANGE': '状态变更',
    'SHIPPING_UPDATE': '发货更新',
    'LOGISTICS_UPDATE': '物流更新',
    'GET_BY_ID': '查看详情',
    'SNAPSHOT_BACKFILL': '快照回填',
    'AUTO_SNAPSHOT': '自动快照',
    'DELETE': '删除订单',
    'SUBMIT': '提交订单',
    'APPROVE': '审核通过',
    'REJECT': '审核拒绝',
    'CLOSE': '关闭订单',
    'COMPLETE': '完成订单',
    'CONFIRM': '确认订单',
    'RECEIVE': '订单收货',
    'REFUND': '退款操作',
    'ADJUST': '订单调整',
    'SYNC': '数据同步',
    'IMPORT': '数据导入',
    'EXPORT': '数据导出',
    'PRINT': '打印订单',
    'COPY': '复制订单',
    'SPLIT': '拆分订单',
    'MERGE': '合并订单',
    'RESTORE': '恢复订单',
    'FIRST_SHIP': '首次发货',
    'SETTLEMENT_CHANGE': '结算变更',
    'AUTO_RECEIVE': '自动收货'
  };

  const purchaseType = orderInfo ? (orderInfo.type === 'INBOUND' ? 'Inbound' : (orderInfo.type === 'JIT' ? 'SelfDistribute' : 'Dropship')) : '';

  const fetchOrder = async () => {
        // 支持通过 ?no=POxxx 或 ?no=Cxxx 参数查询
        const no = searchParams.get('no');
         if (no) {
             setLoading(true);
             setError(null);
             try {
                 const res: any = await getPurchaseOrderByNo(no);
                 if (res && res.id) {
                     navigate(`/supply-chain/purchase-order/detail/${res.id}`, { replace: true });
                     return true;
                 } else {
                     setError('采购单不存在');
                     setLoading(false);
                     return false;
                 }
             } catch (error: any) {
                 console.error("Failed to fetch purchase order by no", error);
                 setError('采购单不存在');
                 setLoading(false);
                 return false;
             }
         }

        if (id) {
            setLoading(true);
            setError(null);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res: any = await getPurchaseOrderById(Number(id));
                // Backend returns { code: 200, data: {...}, refundRecords: [], orderLogs: [] }
                // Adjust based on actual response structure (axios interceptor might return res directly or res.data)
                // Assuming request utility returns response body directly.
                
                if (res) {
                    // res contains the merged map of PO fields + extra records (refundRecords, etc.)
                    // because backend now returns a flat map in 'data', and request interceptor returns 'data'
                    console.log(`[Data Source Verification] PO ${id} loaded from: ${res.dataSource}`);
                    const order = res;

                    if (res.refundRecords) {
                        setRefundRecords(res.refundRecords);
                    }
                    
                    let totalAdjustDiff = 0;
                    if (res.orderLogs) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const logs = res.orderLogs.map((log: any) => ({ ...log, key: log.id }));
                        setOrderLogs(logs);
                        
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const priceLogs = logs.filter((log: any) => log.operationType === 'PRICE_ADJUSTMENT');
                        setPriceAdjustRecords(priceLogs);

                        // Calculate total price adjustment difference
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        totalAdjustDiff = priceLogs.reduce((acc: number, log: any) => {
                            const oldVal = parseFloat(log.oldValue || '0');
                            const newVal = parseFloat(log.newValue || '0');
                            return acc + (newVal - oldVal);
                        }, 0);
                    }

                    setOrderInfo({
                        ...order,
                        poNo: order.orderNo,
                        supplier: order.supplierName || (order.supplier ? order.supplier.name : ''),
                        purchaser: order.supplier?.purchaser?.fullName || order.supplier?.purchaser?.username || '-',
                        receiver: order.contactName || order.receiver,
                        phone: order.contactPhone || order.phone,
                        address: (order.province || order.city || order.district) 
                            ? `${order.province || ''} ${order.city || ''} ${order.district || ''} ${order.detailAddress || ''}`.trim()
                            : (order.detailAddress || order.address),
                        createTime: order.createdAt || order.createTime,
                        expectTime: order.deliveryDate || order.expectTime,
                        remarks: order.remark,
                        statusText: getStatusText(order.status),
                        // Logistics mapping
                        shipCompany: order.logisticsCompany || order.shipCompany,
                        shipNo: order.trackingNumber || order.shipNo,
                        shipTime: order.shippedAt,
                        deliverer: order.deliverer,
                        delivererPhone: order.delivererPhone,
                        plateNo: order.plateNumber || order.plateNo,
                        deliveryMethod: order.deliveryMethod,
                        logisticsSupplierName: order.logisticsSupplierName || order.logisticsProvider?.name || order.supplierName || order.supplier?.name || '',
                        logisticsProviderId: order.logisticsProvider ? order.logisticsProvider.id : (order.logisticsProviderId || undefined),
                        // Calculated fields
                        cost: order.totalAmount || 0,
                        freight: order.logisticsFee || order.freight,
                        refundAmt: res.supplierRefundTotal || (res.refundRecords ? res.refundRecords.reduce((sum: number, r: any) => {
                            if (r.bearer === 'SUPPLIER' && r.status === 'COMPLETED') return sum + (r.refundAmount || 0);
                            return sum;
                        }, 0) : 0),
                        adjustDiff: totalAdjustDiff,
                        dueAmt: order.payableAmount !== undefined && order.payableAmount !== null ? order.payableAmount : (order.totalAmount || 0),
                        paidAmt: order.settledAmount || 0,
                        costType: order.costType,
                        settlementStatus: order.settlementStatus,
                    });

                    if (res.settlementRecords) {
                        setSettlementRecords(res.settlementRecords);
                    }
                    return true;
                }
            } catch (error: any) {
                console.error("Failed to fetch order", error);
                const errorMsg = error.response?.data?.message || error.message || "获取详情失败，请刷新重试";
                setError(errorMsg);
                message.error(errorMsg);
                return false;
            } finally {
                setLoading(false);
            }
        }
        return false;
    };

  useEffect(() => {
    fetchOrder();
    getLogisticsProviders().then(setLogisticsProviders);
    getLogisticsCompanies().then(setLogisticsCompanies);
    
    const resolvedId = id ? Number(id) : null;
    if (resolvedId) {
      getAdjustmentItemsByPurchaseOrderId(resolvedId)
        .then((data) => {
          setCostAdjustRecords(data || []);
        })
        .catch((err: Error) => {
          console.error('获取调价记录失败', err);
          setCostAdjustRecords([]);
        });
    }
  }, [id]);

  const handleShipSuccess = async () => {
      // Refresh data instead of full page reload to ensure SPA experience
      const refreshSuccess = await fetchOrder();
      if (!refreshSuccess) {
          message.warning('发货信息已提交，但状态同步失败，请手动刷新页面');
      }
      setShipModalOpen(false);
      // Refresh logistics tracker to show updated related orders
      logisticsTrackerRef.current?.refresh();
  };

  const handleConfirmReceive = () => {
    modal.confirm({
      title: '确认收货',
      content: '确认收到货物？此操作将记录收货人与时间。',
      onOk: async () => {
        try {
          if (!id) {
            throw new Error('采购单ID无效');
          }
          const poId = Number(id);
          if (isNaN(poId)) {
            throw new Error('采购单ID无效');
          }
          setLoading(true);
          await receivePurchaseOrder(poId);
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

  const handleCancelOrder = () => {
    modal.confirm({
      title: '确认取消',
      content: '确定要取消该采购单吗？取消后关联的入库单也将被取消。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (!id) {
            throw new Error('采购单ID无效');
          }
          const poId = Number(id);
          if (isNaN(poId)) {
            throw new Error('采购单ID格式错误');
          }
          setLoading(true);
          await cancelPurchaseOrder(poId);
          message.success('取消成功');
          navigate('/supply-chain/purchase-order', { state: { refresh: true } });
        } catch (error: any) {
          console.error('Cancel error:', error);
          message.error(error.response?.data?.message || error.message || '取消失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Early return removed to allow Spin to handle loading state
  // if (!orderInfo) {
  //    return <Card loading={true} />;
  // }

  return (
    <div>
      {contextHolder}
      <PageDoc 
        pageTitle="供应链管理 > 采购订单管理 > 采购单详情"
        description={`采购单详情子页面。

1. **页面布局**：
   - **相关单号信息**：采购单号、平台订单/采购类型/业务单号。
   - **订单备注**：各类备注信息。
   - **基本信息**：发货状态、下单时间、供应商、采购负责人。
   - **收货信息**：收货人姓名/电话、地址、期望收货时间。
   - **费用信息**：成本、物流费、退款金额、调价差额、应结/已结金额。
   - **商品信息**：名称、规格、数量、成本单价、运费、合计。
   - **记录信息**：
     - **调价记录**：调价单号、商品、规格、数量、原/现成本单价、申请人、审批状态、审批时间。
     - **退款记录**：退款单号、商品、规格、数量、供应商承担退款金额、申请人、审批状态、审批时间。
     - **物流信息**：商品信息、录入时间、物流单号、物流公司、辅助码、物流跟踪信息、配送员、联系电话、车牌号。
     - **结算记录**：结算单号、付款方、收款方、收款账户、结算金额、备注、审批状态、审批时间。
     - **操作记录**：操作时间、操作人、操作类型、操作备注。

2. **功能按钮**：
   - **申请成本调价**：发起调价流程。
   - **订单发货**：录入发货信息。

3. **异常处理**：
   - **数据加载失败**：详情数据请求失败时，提示“获取详情失败，请刷新重试”。
   - **操作失败**：调价/发货操作失败时，提示具体错误信息。
   - **状态校验**：若订单状态已变更（如已发货），刷新页面显示最新状态。`}
        fields={[
          { name: 'poNo', type: 'String', length: '32', required: true, desc: '采购单号' },
          { name: 'bizInfo', type: 'Object', desc: '业务单据信息', required: false },
          { name: 'costInfo', type: 'Object', desc: '费用信息', required: false },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/purchase-order', { state: { refresh: true } })}>采购单列表</a> },
         { title: '采购单详情' }
      ]} />

      {error ? (
        <Result
            status="500"
            title="获取详情失败"
            subTitle={error}
            extra={[
                <Button type="primary" key="retry" onClick={fetchOrder}>
                    重试
                </Button>,
                <Button key="contact" onClick={() => window.location.href = 'mailto:admin@example.com'}>
                    联系管理员
                </Button>,
            ]}
        />
      ) : (
      <Spin spinning={loading} tip="加载中...">
        {orderInfo ? (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
             {/* Actions */}
             <Card variant="borderless">
                <Space>
                   {['PENDING', 'TO_SHIP', 'UNSHIPPED'].includes(orderInfo?.shippingStatus) && (
                      <Button type="primary" onClick={() => setShipModalOpen(true)} data-testid="ship-button">订单发货</Button>
                   )}
                   <Button icon={<DollarOutlined />} onClick={() => setCostAdjustModalOpen(true)}>成本调价</Button>
                   {['SHIPPED', 'RECEIVED'].includes(orderInfo?.shippingStatus) && orderInfo?.status !== 'CANCELLED' && (
                      <Tooltip title={(() => {
                          const logisticsSettlements = settlementRecords.filter((s: any) => s.type === 'LOGISTICS');
                          const hasNonPendingSettlement = logisticsSettlements.some((s: any) => !['PENDING'].includes(s.status));
                          if (hasNonPendingSettlement) {
                              return '运费已发起结算，不支持修改物流信息';
                          }
                          return '';
                      })()}>
                          <Button 
                              onClick={() => setShipModalOpen(true)}
                              disabled={(() => {
                                  const logisticsSettlements = settlementRecords.filter((s: any) => s.type === 'LOGISTICS');
                                  return logisticsSettlements.some((s: any) => !['PENDING'].includes(s.status));
                              })()}
                          >
                              修改物流
                          </Button>
                      </Tooltip>
                   )}
                   {['PENDING', 'CONFIRMED', 'SHIPPED'].includes(orderInfo?.status) && orderInfo?.status !== 'CANCELLED' && (
                       <Button onClick={handleConfirmReceive} type="primary">确认收货</Button>
                   )}
                   {(orderInfo?.shippingStatus === 'PENDING' || orderInfo?.shippingStatus === 'TO_SHIP') && 
                    orderInfo?.status !== 'CANCELLED' && (
                       <Button danger onClick={handleCancelOrder}>取消订单</Button>
                   )}
                </Space>
             </Card>
    
             <Card title="相关单号信息" variant="borderless">
               <Descriptions column={3}>
                  <Descriptions.Item label="采购单号">
                     <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{orderInfo.poNo}</span>
                  </Descriptions.Item>
                  
                  {purchaseType === 'Inbound' && orderInfo.inboundOrderNo && (
                     <Descriptions.Item label="入库单号">
                        <span style={{ color: '#52c41a' }}>{orderInfo.inboundOrderNo}</span>
                     </Descriptions.Item>
                  )}
                  
                  {purchaseType !== 'Inbound' && (
                     <>
                        <Descriptions.Item label="业务类型">
                           <Tag color="blue">
                               {orderInfo.bizType === 'INBOUND' ? '入库采购' : 
                                orderInfo.bizType === 'PLATFORM' ? '平台单' : 
                                orderInfo.bizType === 'REPLENISHMENT' ? '补货单' : 
                                (orderInfo.bizType || '-')}
                           </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="业务单号">
                           <span style={{ color: '#722ed1' }}>{orderInfo.bizNo || '-'}</span>
                        </Descriptions.Item>
                     </>
                  )}
                  
                  {purchaseType !== 'Inbound' && orderInfo.platformOrderNo && (
                     <Descriptions.Item label="平台订单号">
                        <Tooltip title="分销平台系统中生成的订单编号">
                           <span>{orderInfo.platformOrderNo}</span>
                        </Tooltip>
                     </Descriptions.Item>
                  )}
                  
                  {purchaseType !== 'Inbound' && orderInfo.thirdPartyPlatform && (
                     <Descriptions.Item label="第三方平台">{orderInfo.thirdPartyPlatform}</Descriptions.Item>
                  )}
                  
                  {purchaseType !== 'Inbound' && orderInfo.thirdPartyNo && (
                     <Descriptions.Item label="第三方单号">{orderInfo.platformName ? `${orderInfo.platformName}-${orderInfo.thirdPartyNo}` : orderInfo.thirdPartyNo}</Descriptions.Item>
                  )}
               </Descriptions>
            </Card>

         <Card title="基本信息" variant="borderless">
            <Descriptions column={4}>
               <Descriptions.Item label="采购单状态">
                  {(() => {
                     const statusInfo = getStatusInfo(orderInfo?.status);
                     return (
                       <Tag 
                         color={statusInfo.color} 
                         style={{ 
                           fontSize: '14px', 
                           padding: '4px 12px',
                           fontWeight: 'bold'
                         }}
                       >
                         {statusInfo.text}
                       </Tag>
                     );
                  })()}
               </Descriptions.Item>
               <Descriptions.Item label="发货状态">
                  {(() => {
                     const shippingInfo = getShippingStatusInfo(orderInfo?.shippingStatus, orderInfo?.status);
                     return <Tag color={shippingInfo.color}>{shippingInfo.text}</Tag>;
                  })()}
               </Descriptions.Item>
               <Descriptions.Item label="采购类型">
                  {(() => {
                     const typeMap: Record<string, { text: string; color: string }> = {
                        'INBOUND': { text: '入库采购', color: 'blue' },
                        'SELF_DISTRIBUTE': { text: '自发采购', color: 'green' },
                        'GENERAL': { text: '普通采购', color: 'orange' },
                        'STANDARD': { text: '订单采购', color: 'orange' },
                     };
                     const typeInfo = typeMap[orderInfo?.type] || { text: orderInfo?.type || '-', color: 'default' };
                     return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
                  })()}
               </Descriptions.Item>
               <Descriptions.Item label="下单时间">{orderInfo.createTime}</Descriptions.Item>
               <Descriptions.Item label={purchaseType === 'SelfDistribute' ? '发货分库' : '供应商'}>{orderInfo.supplier}</Descriptions.Item>
               <Descriptions.Item label="采购负责人">{orderInfo.purchaser}</Descriptions.Item>
               {purchaseType === 'Inbound' && (
                  <Descriptions.Item label="期望到货时间">
                     {orderInfo.deliveryDate ? (
                        typeof orderInfo.deliveryDate === 'string' 
                           ? orderInfo.deliveryDate.substring(0, 10)
                           : orderInfo.deliveryDate
                     ) : <span style={{ color: '#ccc' }}>-</span>}
                  </Descriptions.Item>
               )}
            </Descriptions>
         </Card>

         {purchaseType === 'Inbound' && (
            <Card title="报价单/合同" variant="borderless">
               {(() => {
                  try {
                     // Fix for legacy data: If SelfDelivery & Shipped, but no shippingProof, 
                     // then attachments is likely the shipping proof (from old logic).
                     // Hide it here to avoid duplication/confusion. It will be shown in Logistics section.
                     if (orderInfo.deliveryMethod === 'SelfDelivery' && 
                         ['SHIPPED', 'RECEIVED'].includes(orderInfo.shippingStatus) && 
                         !orderInfo.shippingProof && 
                         orderInfo.attachments) {
                        return <span style={{ color: '#999' }}>未上传</span>;
                     }

                     const attachments = orderInfo.attachments;
                     if (!attachments) {
                        return <span style={{ color: '#999' }}>未上传</span>;
                     }
                     
                     const attachmentList = typeof attachments === 'string' 
                        ? JSON.parse(attachments) 
                        : attachments;
                     
                     if (!Array.isArray(attachmentList) || attachmentList.length === 0) {
                        return <span style={{ color: '#999' }}>未上传</span>;
                     }

                     const getFileExtension = (url: string): string => {
                        return url.split('.').pop()?.toLowerCase() || '';
                     };

                     const getFileName = (url: string): string => {
                        const parts = url.split('/');
                        return parts[parts.length - 1] || '未知文件';
                     };

                     const isImageFile = (url: string): boolean => {
                        const ext = getFileExtension(url);
                        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
                     };

                     const isPdfFile = (url: string): boolean => {
                        return getFileExtension(url) === 'pdf';
                     };

                     const isWordFile = (url: string): boolean => {
                        const ext = getFileExtension(url);
                        return ['doc', 'docx'].includes(ext);
                     };

                     const isExcelFile = (url: string): boolean => {
                        const ext = getFileExtension(url);
                        return ['xls', 'xlsx'].includes(ext);
                     };

                     const getFileIcon = (url: string) => {
                        if (isImageFile(url)) return <FileImageOutlined style={{ fontSize: 32, color: '#52c41a' }} />;
                        if (isPdfFile(url)) return <FilePdfOutlined style={{ fontSize: 32, color: '#f5222d' }} />;
                        if (isWordFile(url)) return <FileWordOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
                        if (isExcelFile(url)) return <FileExcelOutlined style={{ fontSize: 32, color: '#52c41a' }} />;
                        return <FileOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />;
                     };

                     const handlePreview = (url: string) => {
                        if (isImageFile(url)) {
                           Modal.info({
                              icon: null,
                              content: (
                                 <div style={{ textAlign: 'center' }}>
                                    <img 
                                       src={url} 
                                       alt="预览" 
                                       style={{ maxWidth: '100%', maxHeight: '70vh' }}
                                    />
                                 </div>
                              ),
                              width: '80%',
                              okText: '关闭',
                           });
                        } else if (isPdfFile(url)) {
                           window.open(url, '_blank');
                        } else {
                           window.open(url, '_blank');
                        }
                     };

                     const handleDownload = (url: string, fileName: string) => {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        message.success('开始下载文件');
                     };

                     return (
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                           {attachmentList.map((file: string, index: number) => {
                              const fileName = getFileName(file);
                              const displayName = fileName.length > 15 
                                 ? fileName.substring(0, 12) + '...' + getFileExtension(file)
                                 : fileName;
                              
                              return (
                                 <div 
                                    key={index}
                                    style={{ 
                                       width: 140,
                                       border: '1px solid #e8e8e8', 
                                       borderRadius: 8,
                                       overflow: 'hidden',
                                       background: '#fff',
                                       transition: 'all 0.3s',
                                    }}
                                    onMouseEnter={(e) => {
                                       e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                       e.currentTarget.style.borderColor = '#1890ff';
                                    }}
                                    onMouseLeave={(e) => {
                                       e.currentTarget.style.boxShadow = 'none';
                                       e.currentTarget.style.borderColor = '#e8e8e8';
                                    }}
                                 >
                                    <div 
                                       style={{ 
                                          height: 80,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          background: '#fafafa',
                                          borderBottom: '1px solid #f0f0f0',
                                          cursor: 'pointer',
                                       }}
                                       onClick={() => handlePreview(file)}
                                    >
                                       {isImageFile(file) ? (
                                          <img 
                                             src={file} 
                                             alt={fileName}
                                             style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                          />
                                       ) : (
                                          getFileIcon(file)
                                       )}
                                    </div>
                                    <div style={{ padding: '8px 12px' }}>
                                       <Tooltip title={fileName}>
                                          <div style={{ 
                                             fontSize: 12, 
                                             color: '#333',
                                             overflow: 'hidden',
                                             textOverflow: 'ellipsis',
                                             whiteSpace: 'nowrap',
                                             marginBottom: 8,
                                          }}>
                                             <PaperClipOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                                             {displayName}
                                          </div>
                                       </Tooltip>
                                       <Space size="small" style={{ width: '100%', justifyContent: 'center' }}>
                                          <Tooltip title="预览">
                                             <Button 
                                                type="text" 
                                                size="small" 
                                                icon={<EyeOutlined />}
                                                onClick={() => handlePreview(file)}
                                             />
                                          </Tooltip>
                                          <Tooltip title="下载">
                                             <Button 
                                                type="text" 
                                                size="small" 
                                                icon={<DownloadOutlined />}
                                                onClick={() => handleDownload(file, fileName)}
                                             />
                                          </Tooltip>
                                       </Space>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     );
                  } catch {
                     return <span style={{ color: '#999' }}>未上传</span>;
                  }
               })()}
            </Card>
         )}

         <Card title="订单备注" variant="borderless">
            <Descriptions>
               <Descriptions.Item label="备注信息">{orderInfo.remarks}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title="收货信息" variant="borderless">
            <Descriptions column={2}>
               <Descriptions.Item label="联系人">{orderInfo.receiver}</Descriptions.Item>
               <Descriptions.Item label="联系电话">{orderInfo.phone}</Descriptions.Item>
               <Descriptions.Item label="收货地址" span={2}>{orderInfo.address}</Descriptions.Item>
               <Descriptions.Item label="期望收货时间">{orderInfo.expectTime}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title="费用信息" variant="borderless">
             <Descriptions column={3}>
                 <Descriptions.Item label="采购单成本">¥{(orderInfo.cost || 0).toFixed(2)}</Descriptions.Item>
                 <Descriptions.Item label="物流费用">¥{(orderInfo.freight || 0).toFixed(2)}</Descriptions.Item>
                 <Descriptions.Item label="供应商退款">¥{(orderInfo.refundAmt || 0).toFixed(2)}</Descriptions.Item>
                 <Descriptions.Item label="成本调价差额">¥{(orderInfo.adjustDiff || 0).toFixed(2)}</Descriptions.Item>
                 {purchaseType !== 'SelfDistribute' && (
                    <>
                       <Descriptions.Item label="商品应结金额"><span style={{ color: '#faad14', fontWeight: 'bold' }}>¥{(orderInfo.dueAmt || 0).toFixed(2)}</span></Descriptions.Item>
                       <Descriptions.Item label="商品已结金额"><span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{(orderInfo.paidAmt || 0).toFixed(2)}</span></Descriptions.Item>
                       <Descriptions.Item label="商品结算状态">
                          {(() => {
                             const statusMap: Record<string, { text: string; color: string }> = {
                                'UNSETTLED': { text: '未结算', color: 'default' },
                                'PARTIAL': { text: '部分结算', color: 'processing' },
                                'SETTLED': { text: '已结算', color: 'success' },
                             };
                             const status = orderInfo.settlementStatus || 'UNSETTLED';
                             const info = statusMap[status] || { text: status, color: 'default' };
                             return <Tag color={info.color}>{info.text}</Tag>;
                          })()}
                       </Descriptions.Item>
                    </>
                 )}
                 {orderInfo.freight > 0 && (
                    <>
                       <Descriptions.Item label="运费应结金额"><span style={{ color: '#faad14', fontWeight: 'bold' }}>¥{(orderInfo.freightPayable || orderInfo.freight || 0).toFixed(2)}</span></Descriptions.Item>
                       <Descriptions.Item label="运费已结金额"><span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{(orderInfo.freightSettled || 0).toFixed(2)}</span></Descriptions.Item>
                    </>
                 )}
             </Descriptions>
         </Card>

         <Card title="商品信息" variant="borderless">
            <Table 
               dataSource={orderInfo.items || []} 
               pagination={false}
               rowKey="id"
               columns={[
                  { title: '商品名称', dataIndex: 'productName' },
                  { title: '规格', dataIndex: 'specName' },
                  { title: '数量', dataIndex: 'quantity' },
                  { title: '成本单价', dataIndex: 'unitPrice', render: (v, r: any) => {
                     const unitPrice = orderInfo.costType === 'SUPPLIER' ? 0 : (v || 0);
                     return `¥${unitPrice.toFixed(2)}`;
                  }},
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  { title: '合计', render: (_, r: any) => {
                     const unitPrice = orderInfo.costType === 'SUPPLIER' ? 0 : (r.unitPrice || 0);
                     return `¥${((r.quantity || 0) * unitPrice).toFixed(2)}`;
                  }}
               ]}
            />
         </Card>
         
         {purchaseType !== 'SelfDistribute' && (
            <Card title="商品结算信息" variant="borderless">
                 {(() => {
                    // 商品应结金额：如果后端返回了 payableAmount 则使用后端值（供应商承担时为0），否则默认为采购单成本
                    const dueAmt = orderInfo.costType === 'SUPPLIER' ? 0 : (orderInfo.dueAmt !== undefined ? orderInfo.dueAmt : (orderInfo.cost || 0));
                    // 商品已结金额：排除运费结算单（type === 'LOGISTICS'）
                    // 只有已发起结算流程（有settlementNo）的结算单才计入统计
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const productSettlements = settlementRecords.filter((s: any) => s.type !== 'LOGISTICS' && s.settlementNo);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const paidAmt = productSettlements.filter((s: any) => ['PAID', 'SETTLED', 'COMPLETED'].includes(s.status))
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        .reduce((acc: number, cur: any) => acc + (cur.totalAmount || 0), 0);
                    // 只有已发起结算流程（有settlementNo）且状态为PENDING/APPROVED的结算单才计入"结算中金额"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const settlingAmt = productSettlements.filter((s: any) => ['PENDING', 'APPROVED'].includes(s.status))
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        .reduce((acc: number, cur: any) => acc + (cur.totalAmount || 0), 0);
                    const unsettledAmt = dueAmt - paidAmt - settlingAmt;

                    return (
                        <>
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                            <Col span={4}>
                                <Statistic title="成本承担方" value={orderInfo.costType === 'SUPPLIER' ? '供应商承担' : '平台承担'} valueStyle={{ fontSize: 14 }} />
                            </Col>
                            <Col span={5}>
                                <Statistic title="应结金额" value={dueAmt} precision={2} prefix="¥" valueStyle={{ fontSize: 14 }} />
                            </Col>
                            <Col span={5}>
                                <Statistic title="已结金额" value={paidAmt} precision={2} prefix="¥" valueStyle={{ fontSize: 14, color: '#3f8600' }} />
                            </Col>
                            <Col span={5}>
                                <Statistic title="结算中金额" value={settlingAmt} precision={2} prefix="¥" valueStyle={{ fontSize: 14, color: '#1890ff' }} />
                            </Col>
                            <Col span={5}>
                                <Statistic title="未结算金额" value={unsettledAmt} precision={2} prefix="¥" valueStyle={{ fontSize: 14, color: '#cf1322' }} />
                            </Col>
                        </Row>
                        
                        {productSettlements.length > 0 && (
                            <>
                                <Divider>结算单列表</Divider>
                                <Table 
                                    size="small"
                                    pagination={false}
                                    dataSource={productSettlements}
                                    rowKey="id"
                                    locale={{ emptyText: '暂无结算记录' }}
                                    columns={[
                                        { title: '结算单号', dataIndex: 'settlementNo' },
                                        { title: '付款方', dataIndex: 'payerName', render: (v: string) => v || '平台' },
                                        { title: '收款方', render: () => orderInfo.supplier },
                                        { title: '发起结算时间', dataIndex: 'createdAt' },
                                         
                                        { title: '结算金额', dataIndex: 'totalAmount', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
                                        { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
                                        { title: '审批状态', dataIndex: 'status', render: (text: string) => (
                                            <Tag color={getStatusColor(text, 'audit')}>{getStatusText(text, 'audit')}</Tag>
                                        )},
                                        { title: '审批时间', dataIndex: 'createdAt' },
                                    ]}
                                />
                            </>
                        )}
                        </>
                    );
                 })()}
             </Card>
         )}

         {/* 运费结算信息模块 - 独立于商品结算 */}
         {purchaseType !== 'SelfDistribute' && orderInfo.logisticsFee > 0 && (
             <Card title="运费结算信息" variant="borderless">
                 {(() => {
                    const freightPayable = orderInfo.freightPayable || orderInfo.logisticsFee || 0;
                    
                    // [FIX 2026-03-10] 业务规则说明：
                    // - 待结算配送单（PS开头）：系统自动生成，记录待结算的运费信息，不计入结算统计
                    // - 结算单（JS开头）：手动操作发起，完成结算流程，计入结算统计
                    // 只有JS开头的结算单才计入结算统计
                    
                    // 过滤出运费结算单（类型为LOGISTICS）
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const logisticsRecords = settlementRecords.filter((s: any) => s.type === 'LOGISTICS' && s.settlementNo);
                    
                    // 只有JS开头的才是真正的结算单，计入结算统计
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const freightSettlements = logisticsRecords.filter((s: any) => s.settlementNo && s.settlementNo.startsWith('JS'));
                    
                    // PS开头的是待结算配送单，不计入结算统计
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pendingDeliveryOrders = logisticsRecords.filter((s: any) => s.settlementNo && s.settlementNo.startsWith('PS'));
                    
                    // 已结算金额：状态为PAID/SETTLED/COMPLETED的结算单
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const freightSettled = freightSettlements.filter((s: any) => ['PAID', 'SETTLED', 'COMPLETED'].includes(s.status))
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        .reduce((acc: number, cur: any) => acc + (cur.totalAmount || 0), 0);
                    
                    // 结算中金额：状态为PENDING/APPROVED的结算单
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const freightSettling = freightSettlements.filter((s: any) => ['PENDING', 'APPROVED'].includes(s.status))
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        .reduce((acc: number, cur: any) => acc + (cur.totalAmount || 0), 0);
                    
                    // 未结算金额 = 应结算运费 - 已结算金额 - 结算中金额
                    const freightUnsettled = freightPayable - freightSettled - freightSettling;

                    return (
                        <>
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                            <Col span={6}>
                                <Statistic title="应结算运费" value={freightPayable} precision={2} prefix="¥" valueStyle={{ fontSize: 14 }} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="已结算运费" value={freightSettled} precision={2} prefix="¥" valueStyle={{ fontSize: 14, color: '#3f8600' }} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="结算中运费" value={freightSettling} precision={2} prefix="¥" valueStyle={{ fontSize: 14, color: '#1890ff' }} />
                            </Col>
                            <Col span={6}>
                                <Statistic title="未结算运费" value={freightUnsettled} precision={2} prefix="¥" valueStyle={{ fontSize: 14, color: '#cf1322' }} />
                            </Col>
                        </Row>
                        
                        {freightSettlements.length > 0 && (
                            <>
                                <Divider>运费结算单列表</Divider>
                                <Table 
                                    size="small"
                                    pagination={false}
                                    dataSource={freightSettlements}
                                    rowKey="id"
                                    locale={{ emptyText: '暂无运费结算记录' }}
                                    columns={[
                                        { title: '结算单号', dataIndex: 'settlementNo', render: (v: string) => v || '-' },
                                        { 
                                            title: '付款方', 
                                            dataIndex: 'payerName',
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            render: (v: string, record: any) => {
                                                if (record.deliveryMethod === 'SelfDelivery') {
                                                    return '供应商自送';
                                                }
                                                return v || '平台';
                                            }
                                        },
                                        { 
                                            title: '收款方', 
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            render: (_: any, record: any) => {
                                                if (record.logisticsProvider) {
                                                    return record.logisticsProvider.name;
                                                }
                                                if (record.supplier) {
                                                    return record.supplier.name;
                                                }
                                                return '-';
                                            }
                                        },
                                        { title: '发起结算时间', dataIndex: 'createdAt', render: (v: string) => v || '-' },
                                        { title: '结算金额', dataIndex: 'totalAmount', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
                                        { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
                                        { title: '结算状态', dataIndex: 'status', render: (text: string) => (
                                            <Tag color={getStatusColor(text, 'audit')}>{getStatusText(text, 'audit')}</Tag>
                                        )},
                                        { title: '结算时间', dataIndex: 'auditTime', render: (v: string) => v || '-' },
                                    ]}
                                />
                            </>
                        )}
                        </>
                    );
                 })()}
             </Card>
         )}

         {refundRecords.length > 0 && (
         <Card title="退款记录" variant="borderless">
             <Table 
                size="small"
                pagination={false}
                dataSource={refundRecords}
                rowKey="id"
                locale={{ emptyText: '暂无退款记录' }}
                columns={[
                   { title: '退款单号', dataIndex: 'refundNo', render: (v: string) => v ? (
                       <a onClick={() => navigate(`/supply-chain/refund-order/detail/${refundRecords.find((r: any) => r.refundNo === v)?.id}`)}>{v}</a>
                   ) : '-' },
                   { title: '退款类型', dataIndex: 'refundType', render: (v: string) => (
                       <Tag color={v === 'REFUND_ONLY' ? 'blue' : 'orange'}>{v === 'REFUND_ONLY' ? '仅退款' : '退款退货'}</Tag>
                   )},
                   { title: '承担方', dataIndex: 'bearer', render: (v: string) => (
                       <Tag color={v === 'SUPPLIER' ? 'gold' : 'cyan'}>{v === 'SUPPLIER' ? '供应商' : '平台'}</Tag>
                   )},
                   { title: '商品规格', dataIndex: 'specName' },
                   { title: '数量', dataIndex: 'quantity' },
                   { title: '退款金额', dataIndex: 'refundAmount', render: (v: number) => (
                       <span style={{ color: '#ff4d4f' }}>¥{(v || 0).toFixed(2)}</span>
                   )},
                   { title: '申请人', dataIndex: 'applicant' },
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
                   { title: '创建时间', dataIndex: 'createdAt' },
                ]}
             />
         </Card>
         )}

         {priceAdjustRecords.length > 0 && (
         <Card title="调价记录" variant="borderless">
            <Table 
               size="small"
               pagination={false}
               dataSource={priceAdjustRecords}
               rowKey="id"
               columns={[
                  { title: '调价单号', dataIndex: 'id', render: (v: any) => `PA${v}` },
                  { title: '原值', dataIndex: 'oldValue' },
                  { title: '新值', dataIndex: 'newValue' },
                  { title: '申请人', dataIndex: 'operator' },
                  { title: '备注', dataIndex: 'remark' },
                  { title: '审批状态', dataIndex: 'status', render: (v: string) => {
                      const color = v === 'APPROVED' ? 'green' : (v === 'PENDING' ? 'blue' : 'default');
                      const text = v === 'APPROVED' ? '已通过' : (v === 'PENDING' ? '待审批' : v);
                      return <Tag color={color}>{text}</Tag>;
                  }},
                  { title: '审批时间', dataIndex: 'createdAt' },
               ]}
            />
         </Card>
         )}

         {costAdjustRecords.length > 0 && (
         <Card title="调价信息" variant="borderless">
            <Table 
               size="small"
               pagination={false}
               dataSource={costAdjustRecords}
               rowKey="id"
               columns={[
                  { title: '调价单号', dataIndex: 'sheetNo', render: (v: string) => (
                    <a onClick={() => navigate(`/supply-chain/price-adjustment/detail/${v}`)}>{v}</a>
                  )},
                  { title: '调价前成本价', dataIndex: 'oldCost', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
                  { title: '调价后成本价', dataIndex: 'newCost', render: (v: number) => `¥${(v || 0).toFixed(2)}` },
                  { title: '单价差额', dataIndex: 'unitDiff', render: (v: number) => {
                    const color = (v || 0) >= 0 ? '#cf1322' : '#52c41a';
                    return <span style={{ color }}>{(v || 0) >= 0 ? '+' : ''}¥{(v || 0).toFixed(2)}</span>;
                  }},
                  { title: '商品数量', dataIndex: 'quantity' },
                  { title: '合计差额', dataIndex: 'totalDiff', render: (v: number) => {
                    const color = (v || 0) >= 0 ? '#cf1322' : '#52c41a';
                    return <span style={{ color }}>{(v || 0) >= 0 ? '+' : ''}¥{(v || 0).toFixed(2)}</span>;
                  }},
                  { title: '申请人', dataIndex: 'createdBy' },
                  { title: '申请时间', dataIndex: 'createdAt' },
                  { title: '审批状态', dataIndex: 'status', render: (v: string) => {
                    const statusMap: Record<string, { text: string; color: string }> = {
                      'PENDING': { text: '待审批', color: 'blue' },
                      'APPROVED': { text: '已审批', color: 'green' },
                      'REJECTED': { text: '已驳回', color: 'red' },
                      'REVOKED': { text: '已撤销', color: 'default' },
                    };
                    const info = statusMap[v] || { text: v, color: 'default' };
                    return <Tag color={info.color}>{info.text}</Tag>;
                  }},
               ]}
            />
         </Card>
         )}

         {orderInfo.status === 'CANCELLED' ? null : ['PENDING', 'CONFIRMED', '待处理', '待发货'].includes(orderInfo.status) || ['PENDING', 'TO_SHIP'].includes(orderInfo.shippingStatus) ? null : (
         <Card title="物流信息" variant="borderless">
               <>
                  <Descriptions column={3} style={{ marginBottom: 20 }}>
                     <Descriptions.Item label="商品信息" span={3}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(orderInfo.items || []).map((item: any) => `${item.productName} (${item.specName}) x ${item.quantity}`).join(', ')}
                     </Descriptions.Item>
                     <Descriptions.Item label="配送方式">{orderInfo.deliveryMethod === 'SelfDelivery' ? '自配送' : '物流配送'}</Descriptions.Item>
                     <Descriptions.Item label="物流供应商">{orderInfo.logisticsSupplierName || '-'}</Descriptions.Item>
                     
                     {orderInfo.deliveryMethod === 'SelfDelivery' ? (
                        <>
                           <Descriptions.Item label="配送员">
                               <Space>
                                   <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} size="small" />
                                   {orderInfo.deliverer}
                               </Space>
                           </Descriptions.Item>
                           <Descriptions.Item label="联系电话">{orderInfo.delivererPhone}</Descriptions.Item>
                           <Descriptions.Item label="车牌号">{orderInfo.plateNo || '-'}</Descriptions.Item>
                           <Descriptions.Item label="当前位置">{orderInfo.currentLocation || '-'}</Descriptions.Item>
                           <Descriptions.Item label="物流单号">{orderInfo.shipNo}</Descriptions.Item>
                        </>
                     ) : (
                        <>
                           <Descriptions.Item label="物流公司">{orderInfo.shipCompany}</Descriptions.Item>
                           <Descriptions.Item label="物流单号">{orderInfo.shipNo}</Descriptions.Item>
                           <Descriptions.Item label="辅助码">{orderInfo.shipAuxCode || '-'}</Descriptions.Item>
                        </>
                     )}
                     <Descriptions.Item label="录入时间">{orderInfo.shipTime}</Descriptions.Item>
                      {((orderInfo.deliveryMethod === 'SelfDelivery') || orderInfo.shippingProof) && (
                         <Descriptions.Item label="发货凭证" span={3}>
                            {(() => {
                               try {
                                  // For SelfDelivery, fallback to attachments (legacy proof). 
                                  // For Logistics, ONLY use shippingProof (attachments is Contract).
                                  const attachments = orderInfo.deliveryMethod === 'SelfDelivery' 
                                      ? (orderInfo.shippingProof || orderInfo.attachments)
                                      : orderInfo.shippingProof;
                                      
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
                  {id && <LogisticsTracker 
                      ref={logisticsTrackerRef}
                      orderId={Number(id)} 
                      trackingNo={orderInfo.shipNo} 
                      deliveryMethod={orderInfo.deliveryMethod}
                      deliverer={orderInfo.deliverer}
                      contact={orderInfo.delivererPhone}
                      plateNumber={orderInfo.plateNo}
                  />}
               </>
          </Card>
          )}

         <div style={{ display: 'flex', gap: 16 }}>
            <Card title="操作记录" variant="borderless" style={{ flex: 1 }}>
               <Table 
                  size="small"
                  pagination={false}
                  dataSource={orderLogs}
                  rowKey="id"
                  locale={{ emptyText: '暂无操作记录' }}
                  columns={[
                     { 
                        title: '时间', 
                        dataIndex: 'createdAt',
                        width: 180,
                        render: (v) => {
                           if (!v) return '-';
                           const date = new Date(v);
                           const year = date.getFullYear();
                           const month = String(date.getMonth() + 1).padStart(2, '0');
                           const day = String(date.getDate()).padStart(2, '0');
                           const hours = String(date.getHours()).padStart(2, '0');
                           const minutes = String(date.getMinutes()).padStart(2, '0');
                           const seconds = String(date.getSeconds()).padStart(2, '0');
                           return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                        }
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
                              '创建订单': 'green',
                              '更新订单': 'blue',
                              '订单发货': 'orange',
                              '首次发货': 'orange',
                              '取消订单': 'red',
                              '入库操作': 'cyan',
                              '成本调价': 'purple',
                              '状态更新': 'geekblue',
                              '状态变更': 'geekblue',
                              '发货更新': 'orange',
                              '物流更新': 'orange',
                              '查看详情': 'default',
                              '快照回填': 'lime',
                              '自动快照': 'lime',
                              '删除订单': 'red',
                              '提交订单': 'green',
                              '审核通过': 'green',
                              '审核拒绝': 'red',
                              '关闭订单': 'red',
                              '完成订单': 'green',
                              '确认订单': 'green',
                              '订单收货': 'green',
                              '自动收货': 'green',
                              '退款操作': 'red',
                              '订单调整': 'blue',
                              '恢复订单': 'green',
                              '结算变更': 'gold',
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
                              const oldVal = StatusTranslator.translateStatus(record.oldValue);
                              const newVal = StatusTranslator.translateStatus(record.newValue);
                              detail = `${v}（${oldVal} → ${newVal}）`;
                           }
                           return <span style={{ color: '#666' }}>{detail}</span>;
                        }
                     },
                  ]}
               />
            </Card>
         </div>
      </Space>
        ) : null}
      </Spin>
      )}

      {/* Modals */}
      <ShipOrderModal 
        open={shipModalOpen} 
        onCancel={() => setShipModalOpen(false)}
        onSuccess={handleShipSuccess}
         
        order={orderInfo ? {
            ...orderInfo,
            id: Number(id),
            items: orderInfo.items
        } : null}
      />

      <Modal
        title="成本调价"
        open={costAdjustModalOpen}
        onCancel={() => {
          setCostAdjustModalOpen(false);
          costAdjustForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await costAdjustForm.validateFields();
            const newItemCost = values.newItemCost;
            const reason = values.reason;
            
            await createSingleAdjustment(Number(id), newItemCost, reason);
            message.success('调价申请已提交');
            setCostAdjustModalOpen(false);
            costAdjustForm.resetFields();
            await fetchOrder();
          } catch (error: any) {
            message.error(error.response?.data?.message || error.message || '调价申请失败');
          }
        }}
        okText="提交调价"
        width={600}
      >
        <Form form={costAdjustForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="采购单号">
                <Input value={orderInfo?.poNo} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="商品供应商">
                <Input value={orderInfo?.supplier} disabled />
              </Form.Item>
            </Col>
          </Row>
          
          {orderInfo?.items?.[0] && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="商品名称">
                    <Input value={orderInfo.items[0].productName} disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="规格信息">
                    <Input value={orderInfo.items[0].specName || orderInfo.items[0].spec || '-'} disabled />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="采购数量">
                    <Input value={orderInfo.items[0].quantity} disabled />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="成本单价">
                    <Input value={`¥${(orderInfo.items[0].unitPrice || 0).toFixed(2)}`} disabled />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="成本价合计">
                    <Input value={`¥${((orderInfo.items[0].quantity || 0) * (orderInfo.items[0].unitPrice || 0)).toFixed(2)}`} disabled />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          
          <Divider />
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="newItemCost" 
                label="调价后成本单价"
                rules={[{ required: true, message: '请输入调价后成本单价' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  placeholder="请输入调价后成本单价"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="调价后成本合计">
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const newCost = getFieldValue('newItemCost') || 0;
                    const quantity = orderInfo?.items?.[0]?.quantity || 0;
                    return <Input value={`¥${(newCost * quantity).toFixed(2)}`} disabled />;
                  }}
                </Form.Item>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="单价差额">
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const newCost = getFieldValue('newItemCost') || 0;
                    const oldCost = orderInfo?.items?.[0]?.unitPrice || 0;
                    const diff = newCost - oldCost;
                    return (
                      <Input 
                        value={`${diff >= 0 ? '+' : ''}¥${diff.toFixed(2)}`} 
                        disabled 
                        style={{ color: diff >= 0 ? '#cf1322' : '#52c41a' }}
                      />
                    );
                  }}
                </Form.Item>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="合计差额">
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const newCost = getFieldValue('newItemCost') || 0;
                    const oldCost = orderInfo?.items?.[0]?.unitPrice || 0;
                    const quantity = orderInfo?.items?.[0]?.quantity || 0;
                    const diff = (newCost - oldCost) * quantity;
                    return (
                      <Input 
                        value={`${diff >= 0 ? '+' : ''}¥${diff.toFixed(2)}`} 
                        disabled 
                        style={{ color: diff >= 0 ? '#cf1322' : '#52c41a' }}
                      />
                    );
                  }}
                </Form.Item>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="reason" label="调价原因">
            <Input.TextArea rows={3} placeholder="请输入调价原因（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchaseOrderDetail;
