import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tag, Timeline, Button, Space, Breadcrumb, Divider, Modal, Form, Input, Row, Col, message, Upload, Statistic, Radio, DatePicker, Select, InputNumber } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import { shipPurchaseOrder, getPurchaseOrders } from '../../services/purchaseOrderService';
import { getLogisticsTracks } from '../../services/logisticsService';
import { createInboundOrder } from '../../services/warehouseService';
import type { InboundOrder } from '../../types/warehouse';
import PageDoc from '../../components/PageDoc';

const PurchaseOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Mock Type derivation
  const purchaseType = id === '2' ? 'Inbound' : id === '3' ? 'SelfDistribute' : 'Dropship';

  const [priceAdjustModalOpen, setPriceAdjustModalOpen] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [shipForm] = Form.useForm();
  const [shipType, setShipType] = useState('Logistics');
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);

  // Use real data if available, fallback to mock
  const [orderInfo, setOrderInfo] = useState<any>({
     poNo: 'C231027001001',
     bizType: '订单采购',
     bizNo: 'SO202310270001',
     supplier: '晨光文具',
     status: '待发货',
     createTime: '2023-10-27 10:00:00',
     purchaser: '张三',
     receiver: '李四',
     phone: '13800138000',
     address: '上海市浦东新区张江高科...',
     expectTime: '2023-10-30',
     remarks: '请务必在月底前送达，急用。',
     // Logistics Info (Optional fields mocked)
     shipCompany: '',
     shipNo: '',
     shipAuxCode: '',
     deliverer: '',
     contact: '',
     plateNo: '',
     shipTime: '',
     // Fee Info
     cost: 1800.00,
     freight: 0.00,
     refundAmt: 0.00,
     adjustDiff: 0.00,
     dueAmt: 1800.00,
     paidAmt: 0.00,
  });

  useEffect(() => {
    const fetchOrder = async () => {
        if (id) {
            const orders = await getPurchaseOrders();
            const order = orders.find(o => o.id === id);
            if (order) {
                // Merge real data with display structure
                setOrderInfo((prev: any) => ({
                    ...prev,
                    poNo: order.poNo,
                    supplier: order.supplierName,
                    status: order.status === 'shipped' ? '已发货' : (order.status === 'approved' ? '待发货' : order.status),
                    items: order.items,
                    // If shipped, populate logistics
                    shipCompany: order.logisticsCompany,
                    shipNo: order.trackingNo,
                    freight: order.logisticsFee || 0,
                    shipTime: order.shippedTime
                }));
                
                // Fetch tracks
                const trackList = await getLogisticsTracks(order.poNo);
                setTracks(trackList);
            }
        }
    };
    fetchOrder();
  }, [id]);

  const handlePriceAdjustSubmit = () => {
    form.validateFields().then(values => {
      message.success('成本调价申请已提交，进入审批流程');
      setPriceAdjustModalOpen(false);
    });
  };

  const handleShipSubmit = async () => {
     try {
        const values = await shipForm.validateFields();
        setLoading(true);
        
        // 1. Update PO status to shipped
        if (id) {
            await shipPurchaseOrder(id, values);
            
            // 2. Auto-create Inbound Order
            // Fetch fresh PO data to get items
            const orders = await getPurchaseOrders();
            const currentPO = orders.find(o => o.id === id);
            
            if (currentPO) {
                const newInboundOrder: InboundOrder = {
                    id: `IN${Date.now()}`,
                    poNo: currentPO.poNo,
                    supplierId: currentPO.supplierId,
                    supplierName: currentPO.supplierName,
                    warehouseCode: 'WH001', // Default or derived
                    status: 'pending',
                    createTime: new Date().toISOString(),
                    items: currentPO.items.map(item => ({
                        productId: item.productId,
                        skuId: item.skuId,
                        productName: item.productName,
                        specName: item.specName,
                        quantity: item.quantity,
                        unitCost: item.unitCost
                    }))
                };
                await createInboundOrder(newInboundOrder);
                message.success('订单发货成功，已自动生成入库单');
            } else {
                message.success('订单发货信息已提交');
            }
            
            setShipModalOpen(false);
            // Refresh
            window.location.reload();
        }
     } catch (error) {
         console.error(error);
         message.error('操作失败');
     } finally {
         setLoading(false);
     }
  };

  // Mock Price History
  const priceHistory = [
    { date: '2023-10-01', original: 18.00, new: 18.00, reason: '初始录入', operator: 'System' },
    { date: '2023-09-01', original: 19.00, new: 18.00, reason: '市场降价', operator: 'Zhang San' },
  ];

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 采购订单管理 > 采购单详情"
        description={`采购单详情子页面。

1. **页面布局**：
   - **相关单号信息**：采购单号、平台订单/业务类型/业务单号。
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
         { title: <a onClick={() => navigate('/supply-chain/purchase-order')}>采购单列表</a> },
         { title: '采购单详情' }
      ]} />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
         {/* Actions */}
         <Card variant="borderless">
            <Space>
               <Button type="primary" onClick={() => setShipModalOpen(true)}>订单发货</Button>
               {purchaseType !== 'SelfDistribute' && (
                 <Button onClick={() => setPriceAdjustModalOpen(true)}>申请成本调价</Button>
               )}
            </Space>
         </Card>

         <Card title="相关单号信息" variant="borderless">
            <Descriptions column={3}>
               <Descriptions.Item label="采购单号">{orderInfo.poNo}</Descriptions.Item>
               {purchaseType !== 'Inbound' && (
                  <>
                     <Descriptions.Item label="业务类型">{orderInfo.bizType}</Descriptions.Item>
                     <Descriptions.Item label="业务单号">{orderInfo.bizNo}</Descriptions.Item>
                  </>
               )}
            </Descriptions>
         </Card>

         <Card title="基本信息" variant="borderless">
            <Descriptions column={4}>
               <Descriptions.Item label="发货状态"><Tag color={orderInfo.status === '已发货' ? 'green' : 'orange'}>{orderInfo.status}</Tag></Descriptions.Item>
               <Descriptions.Item label="下单时间">{orderInfo.createTime}</Descriptions.Item>
               <Descriptions.Item label={purchaseType === 'SelfDistribute' ? '发货分库' : '供应商'}>{orderInfo.supplier}</Descriptions.Item>
               <Descriptions.Item label="采购负责人">{orderInfo.purchaser}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title="订单备注" variant="borderless">
            <Descriptions>
               <Descriptions.Item label="备注信息">{orderInfo.remarks}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title={purchaseType === 'Inbound' ? '入库信息' : '收货信息'} variant="borderless">
            <Descriptions column={2}>
               <Descriptions.Item label={purchaseType === 'Inbound' ? '入库联系人' : '收货人'}>{orderInfo.receiver}</Descriptions.Item>
               <Descriptions.Item label="联系电话">{orderInfo.phone}</Descriptions.Item>
               <Descriptions.Item label={purchaseType === 'Inbound' ? '入库地址' : '收货地址'} span={2}>{orderInfo.address}</Descriptions.Item>
               <Descriptions.Item label="期望收货时间">{orderInfo.expectTime}</Descriptions.Item>
            </Descriptions>
         </Card>

         <Card title="费用信息" variant="borderless">
             <Descriptions column={3}>
                 <Descriptions.Item label="采购单成本">¥{orderInfo.cost.toFixed(2)}</Descriptions.Item>
                 <Descriptions.Item label="物流费用">¥{orderInfo.freight.toFixed(2)}</Descriptions.Item>
                 <Descriptions.Item label="供应商退款">¥{orderInfo.refundAmt.toFixed(2)}</Descriptions.Item>
                 <Descriptions.Item label="成本调价差额">¥{orderInfo.adjustDiff.toFixed(2)}</Descriptions.Item>
                 {purchaseType !== 'SelfDistribute' && (
                    <>
                       <Descriptions.Item label="应结金额"><span style={{ color: '#faad14', fontWeight: 'bold' }}>¥{orderInfo.dueAmt.toFixed(2)}</span></Descriptions.Item>
                       <Descriptions.Item label="已结金额"><span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{orderInfo.paidAmt.toFixed(2)}</span></Descriptions.Item>
                    </>
                 )}
             </Descriptions>
         </Card>

         <Card title="商品信息" variant="borderless">
            <Table 
               dataSource={orderInfo.items || []} 
               pagination={false}
               rowKey="skuId"
               columns={[
                  { title: '商品名称', dataIndex: 'productName' },
                  { title: '规格', dataIndex: 'specName' },
                  { title: '数量', dataIndex: 'quantity' },
                  { title: '成本单价', dataIndex: 'unitCost', render: (v) => `¥${v.toFixed(2)}` },
                  { title: '合计', render: (_, r: any) => `¥${(r.quantity * r.unitCost).toFixed(2)}` }
               ]}
            />
         </Card>
         
         {purchaseType !== 'SelfDistribute' && (
             <Card title="结算记录" variant="borderless">
                 <Row gutter={16} style={{ marginBottom: 16 }}>
                     <Col span={6}>
                        <Statistic title="应结金额" value={orderInfo.dueAmt} precision={2} prefix="¥" />
                     </Col>
                     <Col span={6}>
                        <Statistic title="已结金额" value={orderInfo.paidAmt} precision={2} prefix="¥" valueStyle={{ color: '#3f8600' }} />
                     </Col>
                     <Col span={6}>
                        <Statistic title="结算中" value={500.00} precision={2} prefix="¥" valueStyle={{ color: '#1890ff' }} />
                     </Col>
                     <Col span={6}>
                        <Statistic title="未结算金额" value={orderInfo.dueAmt - orderInfo.paidAmt - 500.00} precision={2} prefix="¥" valueStyle={{ color: '#cf1322' }} />
                     </Col>
                 </Row>
                 <Table 
                    size="small"
                    pagination={false}
                    dataSource={[
                       { key: 1, settleNo: 'SET20231030001', payer: '上海分公司', payee: '晨光文具', account: '招商银行(8888)', amount: 1000.00, remark: '首款', status: '已支付', time: '2023-10-30 14:00' },
                       { key: 2, settleNo: 'SET20231030002', payer: '上海分公司', payee: '晨光文具', account: '招商银行(8888)', amount: 500.00, remark: '尾款', status: '审批中', time: '2023-10-31 09:00' }
                    ]}
                    locale={{ emptyText: '暂无结算记录' }}
                    columns={[
                       { title: '结算单号', dataIndex: 'settleNo' },
                       { title: '付款方', dataIndex: 'payer' },
                       { title: '收款方', dataIndex: 'payee' },
                       { title: '收款账户', dataIndex: 'account' },
                       { title: '结算金额', dataIndex: 'amount', render: (v) => `¥${v.toFixed(2)}` },
                       { title: '备注', dataIndex: 'remark' },
                       { title: '审批状态', dataIndex: 'status', render: (text) => {
                          let color = 'default';
                          if (text === '已支付') color = 'green';
                          if (text === '审批中') color = 'blue';
                          return <Tag color={color}>{text}</Tag>;
                       }},
                       { title: '审批时间', dataIndex: 'time' },
                    ]}
                 />
             </Card>
         )}

         <Card title="退款记录" variant="borderless">
             <Table 
                size="small"
                pagination={false}
                dataSource={[
                   { key: 1, refundNo: 'REF20231029001', product: '晨光A4打印纸', spec: '70g/500张/包', qty: 10, amount: 180.00, applicant: '张三', status: '已完成', time: '2023-10-29 16:00' }
                ]}
                locale={{ emptyText: '暂无退款记录' }}
                columns={[
                   { title: '退款单号', dataIndex: 'refundNo' },
                   { title: '商品', dataIndex: 'product' },
                   { title: '规格', dataIndex: 'spec' },
                   { title: '数量', dataIndex: 'qty' },
                   { title: '供应商承担退款金额', dataIndex: 'amount', render: (v) => `¥${v.toFixed(2)}` },
                   { title: '申请人', dataIndex: 'applicant' },
                   { title: '审批状态', dataIndex: 'status', render: (text) => <Tag color="green">{text}</Tag> },
                   { title: '审批时间', dataIndex: 'time' },
                ]}
             />
         </Card>

         <Card title="调价记录" variant="borderless">
            <Table 
               size="small"
               pagination={false}
               dataSource={priceHistory}
               columns={[
                  { title: '调价单号', render: () => 'PA20231028001' },
                  { title: '商品', render: () => '晨光A4打印纸' },
                  { title: '规格', render: () => '70g/500张/包' },
                  { title: '数量', render: () => 100 },
                  { title: '原成本单价', dataIndex: 'original', render: v => `¥${v}` },
                  { title: '现成本单价', dataIndex: 'new', render: v => `¥${v}` },
                  { title: '申请人', dataIndex: 'operator' },
                  { title: '审批状态', render: () => <Tag color="green">已通过</Tag> },
                  { title: '审批时间', dataIndex: 'date' },
               ]}
            />
         </Card>

         <Card title="物流信息" variant="borderless">
            {orderInfo.status === '待发货' || orderInfo.status === '待处理' ? (
               <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无物流信息</div>
            ) : (
               <>
                  <Descriptions column={3} style={{ marginBottom: 20 }}>
                     <Descriptions.Item label="商品信息" span={3}>
                        晨光A4打印纸 (70g/500张/包) x 100
                     </Descriptions.Item>
                     {orderInfo.shipCompany ? (
                        <>
                           <Descriptions.Item label="物流公司">{orderInfo.shipCompany}</Descriptions.Item>
                           <Descriptions.Item label="物流单号">{orderInfo.shipNo}</Descriptions.Item>
                           <Descriptions.Item label="辅助码">{orderInfo.shipAuxCode || '-'}</Descriptions.Item>
                        </>
                     ) : (
                        <>
                           <Descriptions.Item label="配送员">{orderInfo.deliverer}</Descriptions.Item>
                           <Descriptions.Item label="联系电话">{orderInfo.contact}</Descriptions.Item>
                           <Descriptions.Item label="车牌号">{orderInfo.plateNo || '-'}</Descriptions.Item>
                        </>
                     )}
                     <Descriptions.Item label="录入时间">{orderInfo.shipTime}</Descriptions.Item>
                  </Descriptions>
                  <Divider style={{ fontSize: 14 }}>物流跟踪</Divider>
                  <Timeline
                     items={[
                        { children: '2023-10-27 10:00:00 采购单生成' },
                        { children: '2023-10-27 14:00:00 供应商已确认' },
                        { children: '2023-10-28 09:00:00 顺丰速运 已收取快件' },
                     ]}
                  />
               </>
            )}
         </Card>

         <div style={{ display: 'flex', gap: 16 }}>
            <Card title="操作记录" variant="borderless" style={{ flex: 1 }}>
               <Table 
                  size="small"
                  pagination={false}
                  dataSource={[
                     { key: 1, time: '2023-10-27 10:00', user: '系统', action: '生成采购单' }
                  ]}
                  columns={[
                     { title: '时间', dataIndex: 'time' },
                     { title: '操作人', dataIndex: 'user' },
                     { title: '操作类型', render: () => '系统自动' },
                     { title: '操作备注', dataIndex: 'action' },
                  ]}
               />
            </Card>
         </div>
      </Space>

      {/* Modals */}
      <Modal
         title="申请成本调价"
         open={priceAdjustModalOpen}
         onCancel={() => setPriceAdjustModalOpen(false)}
         onOk={handlePriceAdjustSubmit}
         width={700}
      >
          <div style={{ marginBottom: 16, padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
             <strong>审批流程提示：</strong> 提交后将由 采购主管 → 财务经理 进行审批，预计处理时间 1-2 工作日。
          </div>
          <Form form={form} layout="vertical">
             <Row gutter={16}>
                <Col span={12}>
                    <Form.Item label="调整商品" name="product" initialValue="晨光A4打印纸 70g">
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="当前成本" name="currentCost" initialValue="18.00">
                        <Input disabled prefix="¥" />
                    </Form.Item>
                </Col>
             </Row>
             <Form.Item label="调整后成本" name="newCost" rules={[{ required: true }]}>
                 <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
             </Form.Item>
             <Form.Item label="调价原因" name="reason" rules={[{ required: true }]}>
                 <Input.TextArea rows={3} />
             </Form.Item>
             <Form.Item label="证明材料">
                 <Upload>
                    <Button icon={<UploadOutlined />}>上传文件</Button>
                 </Upload>
             </Form.Item>
          </Form>
      </Modal>

      <Modal
        title="订单发货"
        open={shipModalOpen}
        onCancel={() => setShipModalOpen(false)}
        onOk={handleShipSubmit}
        confirmLoading={loading}
        width={600}
      >
        <Form form={shipForm} layout="vertical" initialValues={{ shipType: 'Logistics' }}>
             <Form.Item name="shipType" label="发货方式">
                 <Radio.Group onChange={e => setShipType(e.target.value)}>
                    <Radio value="Logistics">物流发货</Radio>
                    <Radio value="SelfDelivery">送货上门</Radio>
                 </Radio.Group>
             </Form.Item>
             
             {shipType === 'Logistics' ? (
                 <>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="shipCompany" label="物流公司" rules={[{ required: true }]}>
                                <Select options={[
                                    { label: '顺丰速运', value: 'SF' },
                                    { label: '中通快递', value: 'ZTO' },
                                    { label: '圆通速递', value: 'YTO' }
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                             <Form.Item name="shipNo" label="物流单号" rules={[{ required: true }]}>
                                 <Input />
                             </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="shipAuxCode" label="辅助码">
                        <Input placeholder="物流面单辅助码" />
                    </Form.Item>
                 </>
             ) : (
                 <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="deliverer" label="配送员" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="contact" label="联系电话" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item name="plateNo" label="车牌号">
                            <Input />
                        </Form.Item>
                    </Col>
                 </Row>
             )}
             
             <Row gutter={16}>
                 <Col span={12}>
                     <Form.Item name="freight" label="物流费用">
                         <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
                     </Form.Item>
                 </Col>
                 <Col span={12}>
                     <Form.Item name="shipTime" label="发货时间" initialValue={null}>
                         <DatePicker showTime style={{ width: '100%' }} />
                     </Form.Item>
                 </Col>
             </Row>
             
             <Form.Item name="attachments" label="发货凭证">
                 <Upload>
                    <Button icon={<UploadOutlined />}>上传图片/文件</Button>
                 </Upload>
             </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchaseOrderDetail;
