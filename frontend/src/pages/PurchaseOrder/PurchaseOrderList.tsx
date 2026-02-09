import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, message, Row, Col, DatePicker, Upload, Tooltip, Divider, Typography, Radio, Timeline, Card, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ExportOutlined, CarOutlined, DollarOutlined, ImportOutlined, UploadOutlined, ShoppingCartOutlined, SyncOutlined, TruckOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';
import { getLogisticsProviders } from '../../services/logisticsService';
import { createPendingDeliverySettlement, generateSettlementId } from '../../services/settlementService';
import { cancelPurchaseOrder, getPurchaseOrders, PurchaseOrder } from '../../services/purchaseOrderService';
import { PendingDeliverySettlement } from '../../types/settlement';

interface PurchaseOrderType {
  key: string;
  poNo: string;
  supplier: string;
  bizType: string;
  bizNo: string;
  purchaseType: 'Inbound' | 'Dropship' | 'SelfDistribute';
  orderTime: string;
  expectTime: string;
  adjustStatus: 'None' | 'Pending' | 'Approved';
  refundStatus: 'None' | 'Pending' | 'Approved';
  project: string;
  productName: string;
  specName: string;
  quantity: number;
  cost: number;
  totalCost: number;
  settlementStatus: 'Unsettled' | 'PartiallySettled' | 'Settled';
  status: 'Pending' | 'ToShip' | 'Shipped' | 'Received' | 'Completed' | 'Cancelled';
  modificationStatus?: 'Increased' | 'Decreased' | 'None';
  freight: number;
  thirdPartyPlatform?: string;
  thirdPartyNo?: string;
  platformOrderNo?: string;
  subProducts?: {
    name: string;
    spec: string;
    qty: number;
    unitCost: number;
    supplier: string;
  }[];
}

const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [logisticsModalOpen, setLogisticsModalOpen] = useState(false);
  const [costAdjustModalOpen, setCostAdjustModalOpen] = useState(false); // Batch
  const [singlePriceAdjustModalOpen, setSinglePriceAdjustModalOpen] = useState(false); // Single
  const [importModalOpen, setImportModalOpen] = useState(false);
  // const [selectedLogisticsOrder, setSelectedLogisticsOrder] = useState<PurchaseOrderType | null>(null);
  const [exportingShipment, setExportingShipment] = useState(false);
  const [progressShipment, setProgressShipment] = useState(0);
  const [form] = Form.useForm();
  const [shipForm] = Form.useForm();
  const [shipType, setShipType] = useState('Logistics');
  const [logisticsProviders, setLogisticsProviders] = useState<any[]>([]);
  const [currentShipOrder, setCurrentShipOrder] = useState<PurchaseOrderType | null>(null);

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderType[]>([]);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 0, size: 10 });

  const fetchOrders = async () => {
    setLoading(true);
    try {
        const res = await getPurchaseOrders(params);
        // Map service response to local state structure
        const mapped = (res.records || []).map((po: PurchaseOrder) => {
            const item = po.items && po.items.length > 0 ? po.items[0] : null;
            return {
                key: String(po.id),
                poNo: po.orderNo || '',
                supplier: po.supplierName || po.supplier?.name || '',
                bizType: po.bizType || 'OrderPurchase',
                bizNo: '', 
                purchaseType: po.type === 'INBOUND' ? 'Inbound' : po.type === 'DROPSHIP' ? 'Dropship' : 'SelfDistribute',
                orderTime: po.createdAt || '',
                expectTime: po.deliveryDate || '',
                adjustStatus: 'None',
                refundStatus: 'None',
                project: '', // Not in API yet
                productName: item ? item.productName : '多商品',
                specName: item ? item.spec || '' : '',
                quantity: item ? item.quantity : 0,
                cost: item ? item.unitPrice : 0,
                totalCost: po.totalAmount || 0,
                settlementStatus: po.settlementStatus === 'UNSETTLED' ? 'Unsettled' : 'Settled',
                status: po.status === 'PENDING' ? 'Pending' : 
                        po.status === 'SHIPPED' ? 'Shipped' :
                        po.status === 'RECEIVED' ? 'Received' :
                        po.status === 'COMPLETED' ? 'Completed' :
                        po.status === 'CANCELLED' ? 'Cancelled' : 'Pending',
                freight: 0,
                subProducts: po.items?.map(i => ({
                    name: i.productName,
                    spec: i.spec || '',
                    qty: i.quantity,
                    unitCost: i.unitPrice,
                    supplier: po.supplierName || ''
                }))
            } as PurchaseOrderType;
        });
        setOrders(mapped);
        setTotal(res.total);
    } catch (e) {
        console.error(e);
        message.error('加载采购单失败');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    getLogisticsProviders().then(setLogisticsProviders);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [params]);

  const { handleExport: handleExportList, exporting: exportingList, progress: progressList } = useExport<PurchaseOrderType>({
    filenamePrefix: '采购单列表',
    fetchData: () => orders,
    columns: [
        { title: '采购单号', dataIndex: 'poNo' },
        { title: '供应商', dataIndex: 'supplier' },
        { title: '业务类型', dataIndex: 'bizType', render: (val) => val === 'OrderPurchase' ? '订单采购' : '补货采购' },
        { title: '业务单号', dataIndex: 'bizNo' },
        { title: '下单时间', dataIndex: 'orderTime' },
        { title: '预计到货时间', dataIndex: 'expectTime' },
        { title: '状态', dataIndex: 'status', render: (val) => {
            const map: any = { 'Pending': '待处理', 'ToShip': '待发货', 'Shipped': '已发货', 'Received': '已收货', 'Completed': '已完成', 'Cancelled': '已取消' };
            return map[val] || val;
        } },
    ]
  });

  const getStatusInfo = (status: string) => {
    const map: any = { 
        'Pending': { text: '待处理', color: 'orange' }, 
        'ToShip': { text: '待发货', color: 'cyan' }, 
        'Shipped': { text: '已发货', color: 'blue' }, 
        'Received': { text: '已收货', color: 'purple' }, 
        'Completed': { text: '已完成', color: 'green' },
        'Cancelled': { text: '已取消', color: 'red' }
    };
    return map[status] || { text: status, color: 'default' };
  };

  const getBizTypeInfo = (type: string) => {
    switch (type) {
      case 'OrderPurchase':
        return { label: '订单采购', icon: <ShoppingCartOutlined />, color: '#1890ff', bg: '#e6f7ff' };
      case 'ReplenishPurchase':
        return { label: '补货采购', icon: <SyncOutlined />, color: '#722ed1', bg: '#f9f0ff' };
      default:
        return { label: '其他', icon: <DollarOutlined />, color: '#8c8c8c', bg: '#f5f5f5' };
    }
  };

  const handleShip = () => {
     shipForm.validateFields().then(async values => {
        message.loading({ content: '提交中...', key: 'ship' });
        
        if (currentShipOrder) {
            setOrders(orders.map(o => o.key === currentShipOrder.key ? { ...o, status: 'Shipped' } : o));
            
            const selectedProvider = logisticsProviders.find(p => p.id === values.logisticsSupplier);
            const supplierName = selectedProvider ? selectedProvider.name : (values.shipType === 'SelfDelivery' ? '自配送' : '一件代发');
            
            const settlementId = await generateSettlementId('Delivery');
            const settlement = {
                id: settlementId,
                deliveryNo: values.shipNo || `SD${Date.now()}`,
                type: values.shipType,
                details: values.shipType === 'Logistics' ? `${supplierName} - ${values.shipNo || '无单号'}` : `${values.deliverer} - ${values.contact}`,
                supplierId: values.logisticsSupplier || (values.shipType === 'SelfDelivery' ? 'SELF' : 'DROPSHIP'),
                supplierName: supplierName,
                settlementCycle: selectedProvider?.settlementCycle || 'Monthly',
                relatedBizNo: currentShipOrder.poNo,
                specs: `${currentShipOrder.productName} ${currentShipOrder.specName} x${currentShipOrder.quantity}`,
                fee: values.logisticsFee || 0,
                status: 'pending',
                createTime: new Date().toISOString()
            } as PendingDeliverySettlement;
            await createPendingDeliverySettlement(settlement);
        } else {
            setOrders(orders.map(o => o.status === 'Pending' || o.status === 'ToShip' ? { ...o, status: 'Shipped' } : o));
        }

        message.success({ content: '发货信息已提交，已生成待结算配送单', key: 'ship' });
        setShipModalOpen(false);
        shipForm.resetFields();
        setShipType('Logistics');
        setCurrentShipOrder(null);
     });
  };

  const handleCancel = (record: PurchaseOrderType) => {
    Modal.confirm({
      title: '确认取消',
      icon: <ExclamationCircleOutlined />,
      content: '确定要取消该采购单吗？取消后关联的入库单也将被取消。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
            // Try to call API, but fallback to mock update if it fails (since we are using mock data mostly)
            try {
                await cancelPurchaseOrder(Number(record.key));
            } catch (e) {
                console.warn('API call failed, updating local state for demo', e);
            }
            message.success('取消成功');
            setOrders(orders.map(o => o.key === record.key ? { ...o, status: 'Cancelled' } : o));
        } catch (error) {
            message.error('取消失败');
        }
      }
    });
  };

  const handleViewLogistics = (record: PurchaseOrderType) => {
    // Commented out original modal logic as requested
    // setSelectedLogisticsOrder(record);
    // setLogisticsModalOpen(true);

    // Navigate to new logistics page
    navigate(`/supply-chain/purchase-order/logistics/${record.poNo}`, { state: { record } });
  };

  const handleImportShipment = () => {
      // Mock validation of file format
      message.loading('正在解析发货单文件...', 1).then(() => {
          message.success('成功导入 "晨光文具_发货单_20231027.xlsx"，更新 5 条采购单状态');
          setOrders(orders.map(o => o.status === 'Shipped' ? { ...o, status: 'Received' } : o)); // Mock update
          setImportModalOpen(false);
      });
  };

  const handleExportShipment = async () => {
     setExportingShipment(true);
     setProgressShipment(0);
     message.loading({ content: '正在生成发货单ZIP包...', key: 'export_shipment' });

     try {
        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
           setProgressShipment(i);
           await new Promise(resolve => setTimeout(resolve, 200));
        }

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        message.success({ content: `导出成功：已下载 supplier_shipments_${dateStr}.zip`, key: 'export_shipment' });
        
        // Update status for 'Pending' orders to 'ToShip' (mock logic)
        setOrders(orders.map(o => o.status === 'Pending' ? { ...o, status: 'ToShip' } : o));
     } catch (error) {
        message.error({ content: '导出失败', key: 'export_shipment' });
     } finally {
        setExportingShipment(false);
        setProgressShipment(0);
     }
  };

  const handleCostAdjust = () => {
     message.success('批量调价申请已提交');
     setCostAdjustModalOpen(false);
  };

  const handleSinglePriceAdjustSubmit = () => {
    form.validateFields().then(values => {
      message.success('成本调价申请已提交，进入审批流程');
      setSinglePriceAdjustModalOpen(false);
    });
  };

  // Mock Price History
  const priceHistory = [
    { date: '2023-10-01', original: 18.00, new: 18.00, reason: '初始录入', operator: 'System' },
    { date: '2023-09-01', original: 19.00, new: 18.00, reason: '市场降价', operator: 'Zhang San' },
  ];

  const handleSearch = (values: any) => {
    // Update params to trigger fetchOrders via useEffect
    setParams(prev => ({ ...prev, ...values, page: 0 }));
    message.success('查询成功');
  };

  const handleExport = () => {
    message.success('正在导出Excel...');
    setTimeout(() => {
       message.success('导出成功');
    }, 1000);
  };

  const columns: ColumnsType<PurchaseOrderType> = [
    { 
      title: '采购单信息', 
      key: 'poInfo', 
      width: '100%',
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          gap: '0', 
          border: '1px solid #e8e8e8', 
          borderRadius: '8px', 
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          borderLeft: record.modificationStatus === 'Increased' ? '4px solid #52c41a' : 
                      record.modificationStatus === 'Decreased' ? '4px solid #ff4d4f' : 
                      '1px solid #e8e8e8',
          minHeight: '200px'
        }}>
          <style>
            {`
              .po-list-row {
                transition: background-color 0.3s;
              }
              .po-list-row:hover {
                background-color: #e6f7ff !important;
              }
            `}
          </style>
          {/* Row 1: Header Titles */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '48px', background: '#fafafa', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>采购类型</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>采购单号</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>三方信息</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.purchaseType === 'SelfDistribute' ? '发货分库' : '供应商'}</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>平台单/业务信息</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>下单时间</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>期望收货</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>调价</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>退款</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>项目</Col>
          </Row>
          {/* Row 2: Header Values */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '60px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
                <Tag color={record.purchaseType === 'Inbound' ? 'cyan' : record.purchaseType === 'Dropship' ? 'blue' : 'orange'}>
                    {record.purchaseType === 'Inbound' ? '入库采购' : record.purchaseType === 'Dropship' ? '代发采购' : '自配采购'}
                </Tag>
            </Col>
            <Col span={3} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'column' }}>
                   <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography.Text copyable style={{ fontSize: '12px' }}>{record.poNo}</Typography.Text>
                      {record.modificationStatus === 'Increased' && <Tag color="success" style={{ marginLeft: 4, transform: 'scale(0.8)' }}>增</Tag>}
                      {record.modificationStatus === 'Decreased' && <Tag color="error" style={{ marginLeft: 4, transform: 'scale(0.8)' }}>减</Tag>}
                   </div>
                   <div style={{ marginTop: 4 }}>
                      {(() => {
                        const statusInfo = getStatusInfo(record.status);
                        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
                      })()}
                   </div>
                </div>
            </Col>
            <Col span={3} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
                {record.purchaseType !== 'Inbound' && record.thirdPartyPlatform && (
                   <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                      {record.thirdPartyPlatform}<br/>{record.thirdPartyNo}
                   </div>
                )}
                {record.purchaseType === 'Inbound' && <span style={{ color: '#ccc' }}>-</span>}
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.supplier}</Col>
            <Col span={3} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
               {record.purchaseType !== 'Inbound' && record.platformOrderNo && <div style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '12px' }}>{record.platformOrderNo}</div>}
               {(() => {
                  const info = getBizTypeInfo(record.bizType);
                  return (
                    <Tag 
                      icon={info.icon} 
                      color={info.bg} 
                      style={{ 
                        color: info.color, 
                        borderColor: info.color, 
                        margin: '4px 0',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {info.label}
                    </Tag>
                  );
               })()}
               <div style={{ fontSize: '12px', color: '#888' }}>{record.purchaseType !== 'Inbound' ? record.bizNo : '-'}</div>
            </Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.orderTime}</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.purchaseType === 'Inbound' ? '-' : record.expectTime}</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
               {record.adjustStatus === 'Pending' ? <Tag color="warning">待审批</Tag> : 
                record.adjustStatus === 'Approved' ? <Tag color="success">已调价</Tag> : '-'}
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
               {record.refundStatus === 'Pending' ? <Tag color="warning">待退款</Tag> : 
                record.refundStatus === 'Approved' ? <Tag color="success">已退款</Tag> : '-'}
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.project}</Col>
          </Row>
          {/* Row 3: Product Titles */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '48px', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0', marginBottom: '8px', background: '#fafafa' }}>
            <Col span={5} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>商品名称</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>规格</Col>
            <Col span={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>数量</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.purchaseType === 'SelfDistribute' ? '-' : '单价'}</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.purchaseType === 'SelfDistribute' ? '-' : '合计'}</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>运费</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.purchaseType === 'SelfDistribute' ? '-' : '结算金额'}</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>操作</Col>
          </Row>
          {/* Row 4: Product Values */}
          <Row gutter={0} align="middle" className="po-list-row" style={{ minHeight: '60px', marginBottom: '0' }}>
            <Col span={5} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}><Typography.Text strong>{record.productName}</Typography.Text></Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.specName}</Col>
            <Col span={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.quantity}</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.purchaseType === 'SelfDistribute' ? '-' : `¥${record.cost.toFixed(2)}`}</Col>
            <Col span={3} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>{record.purchaseType === 'SelfDistribute' ? '-' : `¥${record.totalCost.toFixed(2)}`}</Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>¥{record.freight.toFixed(2)}</Col>
            <Col span={3} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
               {record.purchaseType === 'SelfDistribute' ? '-' : (
                 <>
                   <div style={{ color: '#1890ff', lineHeight: '1.2' }}>应: ¥{record.totalCost.toFixed(2)}</div>
                   <div style={{ color: '#52c41a', lineHeight: '1.2' }}>已: ¥{record.settlementStatus === 'Settled' ? record.totalCost.toFixed(2) : '0.00'}</div>
                 </>
               )}
            </Col>
            <Col span={2} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', textAlign: 'center' }}>
               <Space direction="vertical" size={0}>
                 <Button type="link" size="small" onClick={() => navigate(`/supply-chain/purchase-order/detail/${record.key}`)}>查看</Button>
                 {record.purchaseType === 'Inbound' && 
                  record.settlementStatus === 'Unsettled' && 
                  record.status !== 'Completed' && 
                  record.status !== 'Cancelled' && (
                    <Button type="link" size="small" danger onClick={() => handleCancel(record)}>取消</Button>
                 )}
                 {record.status === 'ToShip' && <Button type="link" size="small" onClick={() => {
                    setCurrentShipOrder(record);
                    setShipModalOpen(true);
                 }}>发货</Button>}
                 {(record.status === 'Shipped' || record.status === 'Received' || record.status === 'Completed') && (
                    <Button type="link" size="small" icon={<TruckOutlined />} onClick={() => handleViewLogistics(record)}>
                      查看物流
                    </Button>
                 )}
               </Space>
            </Col>
          </Row>
        </div>
      )
    }
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 采购订单管理 > 采购单列表"
        description={`采购单列表页面...`}
        fields={[
          { name: 'poNo', type: 'String', desc: '采购单号' },
          { name: 'supplier', type: 'String', desc: '供应商' },
          { name: 'status', type: 'Enum', desc: '状态' },
          { name: 'totalAmount', type: 'Decimal', desc: '总金额' }
        ]}
      />

      {/* Example Data Section */}
      <Card title="示例数据场景" style={{ marginBottom: 24 }} size="small">
          <Row gutter={16}>
              <Col span={8}>
                  <Card type="inner" title="场景1：常规订单采购" extra={<Button type="link" onClick={() => navigate('/supply-chain/purchase-order/detail/1')}>查看详情</Button>}>
                      <p><strong>单号：</strong>C231027001001</p>
                      <p><strong>描述：</strong>标准流程，包含完整的发货、收货及结算流程。</p>
                  </Card>
              </Col>
              <Col span={8}>
                  <Card type="inner" title="场景2：库存补货" extra={<Button type="link" onClick={() => navigate('/supply-chain/purchase-order/detail/2')}>查看详情</Button>}>
                      <p><strong>单号：</strong>C231027001002</p>
                      <p><strong>描述：</strong>包含组合商品拆分明细，用于补货至中心仓。</p>
                  </Card>
              </Col>
              <Col span={8}>
                  <Card type="inner" title="场景3：调价审批中" extra={<Button type="link" onClick={() => navigate('/supply-chain/purchase-order/detail/3')}>查看详情</Button>}>
                      <p><strong>单号：</strong>C231027001003</p>
                      <p><strong>描述：</strong>采购单处于成本调价审批流程中，状态挂起。</p>
                  </Card>
              </Col>
          </Row>
      </Card>

      <Form layout="vertical" style={{ marginBottom: 24 }} onFinish={handleSearch}>
         <Row gutter={[16, 16]}>
           <Col span={6}>
             <Form.Item label="供应商名称" name="supplier">
               <Input placeholder="支持模糊搜索" />
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="采购单号" name="poNo">
               <Input placeholder="精确匹配" />
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="归属项目" name="project">
               <Select placeholder="请选择项目" allowClear>
                  <Select.Option value="P001">某某大型国企项目</Select.Option>
                  <Select.Option value="P002">某学校采购项目</Select.Option>
               </Select>
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="收货信息" name="receiver">
               <Input placeholder="姓名/电话/地址关键字" />
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="商品信息" name="product">
               <Input placeholder="名称/规格关键字" />
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="下单时间" name="orderTime">
               <DatePicker.RangePicker style={{ width: '100%' }} />
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="平台订单号" name="platformOrderNo">
               <Input placeholder="精确匹配" />
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="业务类型" name="bizType">
               <Select placeholder="请选择" allowClear>
                  <Select.Option value="OrderPurchase">订单采购</Select.Option>
                  <Select.Option value="ReplenishPurchase">补货采购</Select.Option>
               </Select>
             </Form.Item>
           </Col>
           <Col span={6}>
             <Form.Item label="业务单号" name="bizNo">
               <Input placeholder="精确匹配" />
             </Form.Item>
           </Col>
           <Col span={9}>
             <Form.Item label="结算状态" name="settlementStatus">
               <Select mode="multiple" placeholder="请选择结算状态" allowClear>
                  <Select.Option value="Unsettled">未结算</Select.Option>
                  <Select.Option value="PartiallySettled">部分结算</Select.Option>
                  <Select.Option value="Settled">已结算</Select.Option>
               </Select>
             </Form.Item>
           </Col>
           <Col span={9}>
             <Form.Item label="发货状态" name="shippingStatus">
               <Select mode="multiple" placeholder="请选择发货状态" allowClear>
                  <Select.Option value="Pending">待处理</Select.Option>
                  <Select.Option value="ToShip">待发货</Select.Option>
                  <Select.Option value="Shipped">已发货</Select.Option>
                  <Select.Option value="Received">已收货</Select.Option>
               </Select>
             </Form.Item>
           </Col>
           <Col span={24} style={{ textAlign: 'right' }}>
             <Space>
               <Button type="primary" htmlType="submit">查询</Button>
               <Button onClick={() => {}}>重置</Button>
             </Space>
           </Col>
         </Row>
      </Form>

      <div style={{ marginBottom: 16 }}>
         <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/purchase-order/create')}>新增入库采购单</Button>
            <Button icon={<DollarOutlined />} onClick={() => setCostAdjustModalOpen(true)}>批量成本调价</Button>
            <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
               <Button icon={<ExportOutlined />} onClick={handleExportList} loading={exportingList}>
                  {exportingList ? `导出中 ${progressList}%` : '批量导出采购单'}
               </Button>
            </Tooltip>
            <Tooltip title="导出供应商发货单 (按供应商拆分Excel并打包为ZIP)">
               <Button icon={<ExportOutlined />} onClick={handleExportShipment} loading={exportingShipment}>
                  {exportingShipment ? `打包中 ${progressShipment}%` : '导出发货单'}
               </Button>
            </Tooltip>
            <Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)}>导入发货单</Button>
         </Space>
      </div>

      <Table columns={columns} dataSource={orders} />

      {/* Shipment Modal */}
      <Modal title="采购单发货" open={shipModalOpen} onOk={handleShip} onCancel={() => setShipModalOpen(false)}>
         <Form form={shipForm} layout="vertical" initialValues={{ shipType: 'Logistics' }}>
            <Form.Item label="配送方式" name="shipType">
               <Radio.Group 
                  optionType="button" 
                  buttonStyle="solid"
                  onChange={(e) => {
                     const type = e.target.value;
                     setShipType(type);
                     // Clear fields of the other mode, but keep auxCode
                     const currentValues = shipForm.getFieldsValue();
                     shipForm.resetFields();
                     shipForm.setFieldsValue({ 
                        shipType: type, 
                        auxCode: currentValues.auxCode 
                     });
                  }}
               >
                  <Radio.Button value="Logistics">物流配送</Radio.Button>
                  <Radio.Button 
                     value="SelfDelivery"
                     style={shipType === 'SelfDelivery' ? { background: '#52c41a', borderColor: '#52c41a' } : {}}
                  >
                     自配送
                  </Radio.Button>
               </Radio.Group>
            </Form.Item>

            {shipType === 'Logistics' && (
                <>
                    <Form.Item name="logisticsSupplier" label="物流供应商" initialValue="DROPSHIP" rules={[{ required: true, message: '请选择物流供应商' }]}>
                        <Select 
                            placeholder="选择物流供应商"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={(val) => {
                                if (val === 'DROPSHIP') {
                                    shipForm.setFieldsValue({ logisticsFee: 0 });
                                }
                            }}
                        >
                            <Select.Option value="DROPSHIP">一件代发 (默认)</Select.Option>
                            {logisticsProviders.filter(p => p.status === 'enabled').map(p => (
                                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item 
                        name="logisticsCompany" 
                        label="物流公司" 
                        rules={[{ required: true, message: '请选择物流公司' }]}
                    >
                        <Select 
                            placeholder="请选择物流公司"
                            showSearch
                            allowClear
                            options={[
                                { label: '顺丰速运', value: '顺丰速运' },
                                { label: '圆通速递', value: '圆通速递' },
                                { label: '中通快递', value: '中通快递' },
                                { label: '京东物流', value: '京东物流' },
                                { label: '韵达快递', value: '韵达快递' },
                                { label: '邮政EMS', value: '邮政EMS' },
                                { label: '德邦快递', value: '德邦快递' },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item 
                        noStyle 
                        shouldUpdate={(prev, current) => prev.logisticsSupplier !== current.logisticsSupplier}
                    >
                        {({ getFieldValue }) => (
                            <Form.Item 
                                name="logisticsFee" 
                                label="物流费用" 
                                initialValue={0}
                            >
                                <InputNumber 
                                    style={{ width: '100%' }} 
                                    prefix="¥" 
                                    min={0} 
                                    disabled={getFieldValue('logisticsSupplier') === 'DROPSHIP'}
                                />
                            </Form.Item>
                        )}
                    </Form.Item>

                    <Form.Item name="shipNo" label="运单号" rules={[{ required: true }]}>
                        <Input placeholder="输入运单号" />
                    </Form.Item>
                    <Form.Item label="辅助码 (选填)" name="auxCode" rules={[{ pattern: /^[A-Za-z0-9]{6,20}$/, message: '请输入6-20位字母数字组合' }]}>
                        <Input placeholder="用于特殊场景下的物流追踪辅助标识" />
                    </Form.Item>
                </>
            )}

            {shipType === 'SelfDelivery' && (
               <>
                  <Form.Item label="物流供应商" name="logisticsSupplier" initialValue="DROPSHIP">
                     <Select 
                        placeholder="请选择物流供应商" 
                        allowClear 
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                           (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }
                        onChange={(val) => {
                            if (val === 'DROPSHIP') {
                                shipForm.setFieldsValue({ logisticsFee: 0 });
                            }
                        }}
                     >
                        <Select.Option value="DROPSHIP">一件代发 (默认)</Select.Option>
                        {logisticsProviders.filter(p => p.status === 'enabled').map(p => (
                            <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                        ))}
                     </Select>
                  </Form.Item>
                  
                  <Form.Item 
                      noStyle 
                      shouldUpdate={(prev, current) => prev.logisticsSupplier !== current.logisticsSupplier}
                  >
                      {({ getFieldValue }) => (
                          <Form.Item 
                              label="物流费用" 
                              name="logisticsFee" 
                              initialValue={0}
                              rules={[
                                  { required: true, message: '请输入物流费用' },
                                  { type: 'number', min: 0, message: '费用不能为负' },
                                  { type: 'number', max: 10000, message: '费用不能超过10000' }
                              ]}
                          >
                             <InputNumber 
                                style={{ width: '100%' }} 
                                prefix="¥" 
                                min={0} 
                                precision={2} 
                                disabled={!getFieldValue('logisticsSupplier') || getFieldValue('logisticsSupplier') === 'DROPSHIP'}
                             />
                          </Form.Item>
                      )}
                  </Form.Item>

                  <Form.Item label="配送员" name="deliverer" rules={[{ required: true, message: '请输入配送员姓名' }]}>
                     <Input placeholder="请输入配送员姓名" />
                  </Form.Item>
                  <Form.Item label="联系电话" name="contact" rules={[{ required: true, message: '请输入联系电话' }]}>
                     <Input placeholder="请输入联系电话" />
                  </Form.Item>
                  <Form.Item label="车牌号 (选填)" name="plateNo">
                     <Input placeholder="请输入车牌号" />
                  </Form.Item>
               </>
            )}
         </Form>
      </Modal>

      {/* Logistics Detail Modal (Commented out for independent page) */}
      {/* 
      <Modal title="物流详情" open={logisticsModalOpen} onCancel={() => setLogisticsModalOpen(false)} footer={null}>
         {selectedLogisticsOrder ? (
            <>
              <div style={{ marginBottom: 20, padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>承运商</div>
                    <div style={{ fontWeight: 'bold' }}>顺丰速运</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>运单号</div>
                    <div style={{ fontWeight: 'bold' }}>SF{selectedLogisticsOrder.poNo.replace('C', '')}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>当前状态</div>
                    <div style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      {selectedLogisticsOrder.status === 'Completed' ? '已签收' : '运输中'}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#888', fontSize: '12px' }}>预计送达</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedLogisticsOrder.expectTime}</div>
                  </Col>
                </Row>
              </div>
              <Timeline
                items={[
                   {
                      children: '已签收，签收人：前台',
                      color: selectedLogisticsOrder.status === 'Completed' ? 'green' : 'gray',
                      label: '2023-10-29 10:30',
                   },
                   {
                      children: '快件派送中',
                      color: 'blue',
                      label: '2023-10-29 08:00',
                   },
                   {
                      children: '快件到达【上海浦东集散中心】',
                      label: '2023-10-28 22:00',
                   },
                   {
                      children: '供应商已发货',
                      label: '2023-10-28 14:00',
                   },
                ]}
              />
            </>
         ) : (
            <div>加载中...</div>
         )}
      </Modal>
      */}

      {/* Cost Adjust Modal (Batch) */}
      <Modal title="批量导入调价单" open={costAdjustModalOpen} onOk={handleCostAdjust} onCancel={() => setCostAdjustModalOpen(false)}>
         <Divider>批量导入</Divider>
         <Button icon={<ImportOutlined />}>下载调价模板</Button>
         <div style={{ marginTop: 16 }}>
            <Upload><Button icon={<UploadOutlined />}>上传调价单</Button></Upload>
         </div>
      </Modal>

      {/* Cost Adjust Modal (Single) */}
      <Modal
        title="申请成本调价"
        open={singlePriceAdjustModalOpen}
        onOk={handleSinglePriceAdjustSubmit}
        onCancel={() => setSinglePriceAdjustModalOpen(false)}
        width={700}
      >
        <div style={{ marginBottom: 16, padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
           <strong>审批流程提示：</strong> 提交后将由 采购主管 → 财务经理 进行审批，预计处理时间 1-2 工作日。
        </div>
        
        <Form form={form} layout="vertical" initialValues={{ originalCost: 18.00 }}>
           <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="商品名称"><Input value="晨光A4打印纸" disabled /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="规格"><Input value="70g/500张/包" disabled /></Form.Item>
              </Col>
           </Row>
           <Row gutter={16}>
              <Col span={12}>
                 <Form.Item label="原成本单价" name="originalCost"><Input prefix="¥" disabled /></Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item 
                    label="新成本单价" 
                    name="newCost" 
                    rules={[{ required: true, message: '请输入新成本单价' }]}
                 >
                    <Input prefix="¥" type="number" step="0.01" />
                 </Form.Item>
              </Col>
           </Row>
           <Form.Item label="调价理由" name="reason" rules={[{ required: true }]}>
              <Input.TextArea rows={3} placeholder="请输入调价原因..." />
           </Form.Item>
           <Form.Item label="上传凭证" name="voucher">
              <Upload>
                 <Button icon={<UploadOutlined />}>点击上传证明文件 (PDF/Image)</Button>
              </Upload>
           </Form.Item>
        </Form>

        <Divider>历史调价记录</Divider>
        <Table 
           size="small"
           pagination={false}
           dataSource={priceHistory}
           columns={[
              { title: '日期', dataIndex: 'date' },
              { title: '原价', dataIndex: 'original', render: v => `¥${v}` },
              { title: '新价', dataIndex: 'new', render: v => `¥${v}` },
              { title: '原因', dataIndex: 'reason' },
              { title: '操作人', dataIndex: 'operator' },
           ]}
        />
      </Modal>

      {/* Import Shipment Modal */}
      <Modal title="导入发货单" open={importModalOpen} onOk={handleImportShipment} onCancel={() => setImportModalOpen(false)}>
         <div style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">
               请上传供应商回填的发货单文件。
               <br />
               支持格式：.xlsx, .zip
               <br />
               命名规范：供应商名称_发货单_时间.xlsx
            </Typography.Text>
         </div>
         <Upload.Dragger accept=".xlsx,.xls,.zip" maxCount={1}>
            <p className="ant-upload-drag-icon">
                <ImportOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持单个 Excel 文件或包含多个 Excel 的 ZIP 压缩包</p>
         </Upload.Dragger>
      </Modal>
    </div>
  );
};

export default PurchaseOrderList;
