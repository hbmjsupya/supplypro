import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, message, DatePicker, InputNumber, Radio } from 'antd';
import { CarOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { OutboundOrder } from '../../types/warehouse';
import { getOutboundOrders, shipOutboundOrder, getWarehouseNameMap } from '../../services/warehouseService';
import { getLogisticsProviders } from '../../services/logisticsService';
import { createPendingDeliverySettlement, generateSettlementId } from '../../services/settlementService';
import { PendingDeliverySettlement } from '../../types/settlement';
import PageDoc from '../../components/PageDoc';

const OutboundOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OutboundOrder[]>([]);
  const [filteredData, setFilteredData] = useState<OutboundOrder[]>([]);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [logisticsProviders, setLogisticsProviders] = useState<any[]>([]);
  const [shipType, setShipType] = useState('Logistics');
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [result, whMap] = await Promise.all([
        getOutboundOrders(),
        getWarehouseNameMap()
      ]);
      setData(result);
      setFilteredData(result);
      setWarehouseMap(whMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    getLogisticsProviders().then(setLogisticsProviders);
  }, []);

  const handleSearch = (values: any) => {
    const filtered = data.filter(item => {
      let match = true;
      if (values.id && item.id !== values.id) match = false;
      if (values.bizNo && !item.bizNo.includes(values.bizNo)) match = false;
      if (values.warehouseCode && item.warehouseCode !== values.warehouseCode) match = false;
      if (values.product) {
         const productMatch = item.items.some(i => 
             i.productName.includes(values.product) || i.specName.includes(values.product)
         );
         if (!productMatch) match = false;
      }
      if (values.receiverName && (!item.contact || !item.contact.includes(values.receiverName))) match = false;
      if (values.receiverPhone && (!item.phone || !item.phone.includes(values.receiverPhone))) match = false;
      if (values.status && values.status.length > 0 && !values.status.includes(item.status)) match = false;
      return match;
    });
    setFilteredData(filtered);
    message.success('查询成功');
  };

  const handleShipClick = (record: OutboundOrder) => {
      setSelectedOrder(record);
      setShipModalOpen(true);
      setShipType('Logistics');
      form.resetFields();
  };

  const handleShipSubmit = async () => {
      try {
          const values = await form.validateFields();
          if (selectedOrder) {
              // Update Outbound Order
              await shipOutboundOrder(selectedOrder.id, {
                  logisticsCompany: values.logisticsCompany, // Keep using this field for compatibility or update?
                  trackingNo: values.trackingNo,
                  logisticsFee: values.logisticsFee
              });

              // Create Settlement
              const selectedProvider = logisticsProviders.find(p => p.id === values.logisticsSupplier);
              const supplierName = selectedProvider ? selectedProvider.name : (shipType === 'SelfDelivery' ? '自配送' : '一件代发');
              
              const settlementId = await generateSettlementId('Delivery');
              const settlement: PendingDeliverySettlement = {
                  id: settlementId,
                  deliveryNo: values.trackingNo || `SD${Date.now()}`,
                  type: shipType as any,
                  details: shipType === 'Logistics' ? `${values.logisticsCompany} - ${values.trackingNo || '无单号'}` : `${values.deliverer} - ${values.contact}`,
                  supplierId: values.logisticsSupplier || (shipType === 'SelfDelivery' ? 'SELF' : 'DROPSHIP'),
                  supplierName: supplierName,
                  settlementCycle: selectedProvider?.settlementCycle || 'Monthly',
                  relatedBizNo: selectedOrder.id,
                  specs: `Outbound Order ${selectedOrder.id}`,
                  fee: values.logisticsFee || 0,
                  status: 'pending',
                  createTime: new Date().toISOString()
              };
              await createPendingDeliverySettlement(settlement);

              message.success('发货成功，已生成待结算配送单');
              setShipModalOpen(false);
              loadData();
          }
      } catch (error) {
          console.error(error);
      }
  };

  const formatDate = (dateStr: string) => {
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

  const columns: ColumnsType<OutboundOrder> = [
    { title: '出库单号', dataIndex: 'id' },
    { title: '业务单号', dataIndex: 'bizNo' },
    { 
        title: '发货仓库', 
        dataIndex: 'warehouseCode',
        render: (code) => warehouseMap[code] || code
    },
    { 
        title: '商品规格', 
        dataIndex: 'items', 
        render: (items: any[]) => items && items.length > 0 ? items.map(i => `${i.productName}/${i.specName}`).join(', ') : '-' 
    },
    { 
        title: '数量', 
        dataIndex: 'items', 
        render: (items: any[]) => items && items.length > 0 ? items.reduce((sum, i) => sum + i.quantity, 0) : 0 
    },
    { 
        title: '收货人', 
        dataIndex: 'contact', 
        render: (val, record) => `${val || '-'} / ${record.phone || '-'}`
    },
    { title: '收货地址', dataIndex: 'address', render: (val) => val || '-' },
    { 
        title: '状态', 
        dataIndex: 'status',
        render: (status) => (
            <Tag color={status === 'shipped' ? 'green' : 'orange'}>
                {status === 'shipped' ? '已发货' : '待发货'}
            </Tag>
        )
    },
    { 
        title: '创建时间', 
        dataIndex: 'createTime',
        render: (val) => formatDate(val)
    },
    { 
        title: '操作', 
        key: 'action',
        render: (_, record) => (
            <Space>
                <Button type="link" size="small" onClick={() => navigate(`/supply-chain/purchase-order/detail/${record.bizNo}`)}>
                    查看详情
                </Button>
                {record.status === 'pending' && (
                    <Button type="primary" size="small" icon={<CarOutlined />} onClick={() => handleShipClick(record)}>
                        发货
                    </Button>
                )}
            </Space>
        )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 库存发货管理"
        description="管理所有出库单据，进行发货操作。"
        fields={[
          { name: 'id', type: 'String', desc: '出库单号' },
          { name: 'status', type: 'Enum', desc: '状态: pending(待发货), shipped(已发货)' }
        ]}
      />
      <Card style={{ marginBottom: 16 }}>
          <Form form={searchForm} layout="inline" onFinish={handleSearch}>
              <Form.Item name="id" label="出库单号"><Input placeholder="精确匹配" /></Form.Item>
              <Form.Item name="bizNo" label="采购单号"><Input placeholder="模糊匹配" /></Form.Item>
              <Form.Item name="warehouseCode" label="发货仓库">
                  <Select placeholder="请选择" allowClear style={{ width: 150 }}>
                      {Object.entries(warehouseMap).map(([code, name]) => (
                          <Select.Option key={code} value={code}>{name}</Select.Option>
                      ))}
                  </Select>
              </Form.Item>
              <Form.Item name="product" label="商品"><Input placeholder="名称/规格" /></Form.Item>
              <Form.Item name="receiverName" label="收货人"><Input placeholder="姓名" /></Form.Item>
              <Form.Item name="status" label="状态">
                  <Select placeholder="状态" allowClear mode="multiple" style={{ width: 150 }}>
                      <Select.Option value="pending">待发货</Select.Option>
                      <Select.Option value="shipped">已发货</Select.Option>
                  </Select>
              </Form.Item>
              <Form.Item>
                  <Space>
                      <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
                      <Button onClick={() => { searchForm.resetFields(); setFilteredData(data); }}>重置</Button>
                  </Space>
              </Form.Item>
          </Form>
      </Card>
      <Card>
          <Table 
            columns={columns} 
            dataSource={filteredData} 
            rowKey="id" 
            loading={loading} 
            pagination={{ showTotal: total => `共 ${total} 条` }}
          />
      </Card>

      <Modal
        title="订单发货"
        open={shipModalOpen}
        onOk={handleShipSubmit}
        onCancel={() => setShipModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
            <Form.Item label="发货方式">
                <Radio.Group value={shipType} onChange={e => setShipType(e.target.value)}>
                    <Radio value="Logistics">物流配送</Radio>
                    <Radio value="SelfDelivery">自主配送</Radio>
                </Radio.Group>
            </Form.Item>
            
            {shipType === 'Logistics' ? (
                <>
                    <Form.Item name="logisticsSupplier" label="物流供应商" rules={[{ required: true, message: '请选择物流供应商' }]}>
                        <Select placeholder="选择合作物流商">
                            {logisticsProviders.filter(p => p.status === 'enabled').map(p => (
                                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="logisticsCompany" label="物流公司名称" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item name="trackingNo" label="物流单号" rules={[{ required: true, message: '请输入物流单号' }]}>
                        <Input placeholder="请输入快递单号" />
                    </Form.Item>
                </>
            ) : (
                <>
                     <Form.Item name="deliverer" label="配送员" rules={[{ required: true, message: '请输入配送员姓名' }]}>
                        <Input placeholder="例如: 张三" />
                    </Form.Item>
                    <Form.Item name="contact" label="联系方式" rules={[{ required: true, message: '请输入联系方式' }]}>
                        <Input placeholder="例如: 13800138000" />
                    </Form.Item>
                </>
            )}

            <Form.Item name="logisticsFee" label="预估运费" rules={[{ required: true, message: '请输入预估运费' }]}>
                <InputNumber style={{ width: '100%' }} prefix="¥" min={0} precision={2} />
            </Form.Item>
            <div style={{ color: '#999', fontSize: 12 }}>
                * 发货确认后将自动生成对应的待结算配送单。
            </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OutboundOrderList;
