import React, { useState } from 'react';
import { Card, Form, Input, DatePicker, Select, Button, Table, InputNumber, Upload, message, Modal, Space, Typography, Row, Col } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, CopyOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { savePurchaseOrder } from '../../services/purchaseOrderService';
import type { PurchaseOrder, PurchaseOrderItem } from '../../services/purchaseOrderService';
import { getWarehouses } from '../../services/warehouseService';
import { getRegionPath } from '../../utils/regionMap';
import dayjs from 'dayjs';

// Mock Product Data
const MOCK_PRODUCTS = [
  { id: 'P001', name: '无线鼠标', sku: 'SKU001', spec: '黑色', cost: 45.00 },
  { id: 'P001', name: '无线鼠标', sku: 'SKU002', spec: '白色', cost: 45.00 },
  { id: 'P002', name: '机械键盘', sku: 'SKU003', spec: '青轴', cost: 280.00 },
  { id: 'P003', name: '显示器', sku: 'SKU004', spec: '27寸 4K', cost: 1200.00 },
];

const PurchaseOrderCreate: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  // Product Search State
  const [productSearch, setProductSearch] = useState({ name: '', spec: '', sku: '' });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedModalProducts, setSelectedModalProducts] = useState<any[]>([]);

  React.useEffect(() => {
    getWarehouses().then(setWarehouses);
  }, []);

  const handleWarehouseChange = (code: string) => {
    const wh = warehouses.find(w => w.code === code);
    if (wh) {
      const regionPath = getRegionPath(wh.province, wh.city, wh.district);
      form.setFieldsValue({
        warehouseRegion: regionPath,
        address: `${regionPath} ${wh.address}`, // Use Chinese region + address detail
        contact: wh.admins[0] || '库管员',
        phone: '13800138000' // Mock phone
      });
    }
  };

  const copyAddress = () => {
    const addr = form.getFieldValue('address');
    if (addr) {
      navigator.clipboard.writeText(addr);
      message.success('地址已复制');
    }
  };

  const handleBatchSelectConfirm = () => {
    const currentItems = form.getFieldValue('items') || [];
    const newItems: PurchaseOrderItem[] = [];
    
    selectedModalProducts.forEach(record => {
        if (!currentItems.find((item: any) => item.skuId === record.sku)) {
            newItems.push({
                productId: record.id,
                skuId: record.sku,
                productName: record.name,
                specName: record.spec,
                quantity: 1,
                unitCost: record.cost,
            });
        }
    });

    if (newItems.length === 0 && selectedModalProducts.length > 0) {
        message.warning('所选商品已在列表中');
    } else {
        form.setFieldsValue({
            items: [...currentItems, ...newItems]
        });
        message.success(`已添加 ${newItems.length} 个商品`);
    }
    
    setProductModalOpen(false);
    setSelectedRowKeys([]);
    setSelectedModalProducts([]);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Split Logic: One PO per Item (Spec)
      const promises = values.items.map(async (item: any) => {
          const totalAmount = item.quantity * item.unitCost;
          const newPO: PurchaseOrder = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            poNo: `PO-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            supplierId: values.supplier,
            supplierName: values.supplier === 'SUP001' ? '联想（北京）有限公司' : '得力集团',
            expectedArrivalDate: values.expectedArrivalDate.format('YYYY-MM-DD'),
            projectId: values.projectId,
            items: [item], // Single item per PO
            status: 'pending_approval',
            createTime: new Date().toISOString(),
            totalAmount: totalAmount,
            attachments: values.attachments?.fileList?.map((f: any) => f.name) || [],
          };
          return savePurchaseOrder(newPO);
      });

      await Promise.all(promises);
      
      message.success(`成功创建 ${values.items.length} 个采购单（按规格拆分）`);
      navigate('/supply-chain/purchase-order');
    } catch (error) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
      return (
          (!productSearch.name || p.name.includes(productSearch.name)) &&
          (!productSearch.spec || p.spec.includes(productSearch.spec)) &&
          (!productSearch.sku || p.sku.includes(productSearch.sku))
      );
  });

  return (
    <div style={{ padding: 24 }}>
      <Card title="新增采购单" variant="borderless">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ items: [] }}
        >
          <Card type="inner" title="基本信息" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
              <Form.Item name="supplier" label="供应商" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="请选择供应商"
                  options={[
                    { label: '联想（北京）有限公司', value: 'SUP001' },
                    { label: '得力集团', value: 'SUP002' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="expectedArrivalDate" label="预计到货日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="projectId" label="归属项目">
                <Select
                  placeholder="请选择项目"
                  options={[
                    { label: '总部办公物资采购', value: 'PROJ001' },
                    { label: '新职场开办', value: 'PROJ002' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="warehouseCode" label="入库仓库" rules={[{ required: true }]}>
                <Select 
                    placeholder="选择入库分仓"
                    options={warehouses.map(w => ({ label: w.name, value: w.code }))}
                    onChange={handleWarehouseChange}
                />
              </Form.Item>
              <Form.Item name="warehouseRegion" label="分库所在地区" rules={[{ required: true, message: '请选择仓库以获取地区信息' }]}>
                 <Input readOnly placeholder="选择仓库后自动显示" style={{ background: '#f5f5f5' }} />
              </Form.Item>
              <Form.Item name="address" label="收货地址">
                 <Input suffix={<CopyOutlined onClick={copyAddress} style={{ cursor: 'pointer' }} />} />
              </Form.Item>
              <Form.Item name="contact" label="联系人">
                 <Input />
              </Form.Item>
              <Form.Item name="phone" label="联系电话">
                 <Input />
              </Form.Item>
              <Form.Item name="attachments" label="附件">
                <Upload beforeUpload={() => false}>
                  <Button icon={<UploadOutlined />}>上传报价单/合同</Button>
                </Upload>
              </Form.Item>
            </div>
          </Card>

          <Card type="inner" title="商品明细 (提交后将按规格自动拆分为多个采购单)" style={{ marginBottom: 24 }} extra={
            <Button type="dashed" onClick={() => setProductModalOpen(true)} icon={<PlusOutlined />}>
              批量添加商品
            </Button>
          }>
            <Form.List name="items">
              {(fields, { remove }) => (
                <Table
                  dataSource={fields}
                  pagination={false}
                  rowKey="key"
                  columns={[
                    {
                      title: '商品名称',
                      dataIndex: 'name',
                      render: (_, field) => (
                        <Form.Item {...field} name={[field.name, 'productName']} style={{ marginBottom: 0 }}>
                          <Input readOnly variant="borderless" />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '规格',
                      dataIndex: 'spec',
                      render: (_, field) => (
                        <Form.Item {...field} name={[field.name, 'specName']} style={{ marginBottom: 0 }}>
                          <Input readOnly variant="borderless" />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '采购数量',
                      dataIndex: 'quantity',
                      width: 150,
                      render: (_, field) => (
                        <Form.Item
                          {...field}
                          name={[field.name, 'quantity']}
                          rules={[{ required: true, message: '请输入数量' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '单价(元)',
                      dataIndex: 'unitCost',
                      width: 150,
                      render: (_, field) => (
                        <Form.Item
                          {...field}
                          name={[field.name, 'unitCost']}
                          rules={[{ required: true, message: '请输入单价' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '小计',
                      key: 'subtotal',
                      render: (_, field) => {
                          const qty = form.getFieldValue(['items', field.name, 'quantity']) || 0;
                          const cost = form.getFieldValue(['items', field.name, 'unitCost']) || 0;
                          return (qty * cost).toFixed(2);
                      }
                    },
                    {
                      title: '操作',
                      width: 80,
                      render: (_, field) => (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                      ),
                    },
                  ]}
                />
              )}
            </Form.List>
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交审批
              </Button>
              <Button onClick={() => navigate('/supply-chain/purchase-order')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>

        <Modal
          title="选择商品 (支持多选)"
          open={productModalOpen}
          onCancel={() => setProductModalOpen(false)}
          onOk={handleBatchSelectConfirm}
          width={800}
        >
          <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                  <Col span={8}>
                      <Input 
                        placeholder="商品名称" 
                        value={productSearch.name} 
                        onChange={e => setProductSearch({...productSearch, name: e.target.value})}
                        prefix={<SearchOutlined />}
                      />
                  </Col>
                  <Col span={8}>
                      <Input 
                        placeholder="规格" 
                        value={productSearch.spec} 
                        onChange={e => setProductSearch({...productSearch, spec: e.target.value})}
                      />
                  </Col>
                  <Col span={8}>
                      <Input 
                        placeholder="SKU ID" 
                        value={productSearch.sku} 
                        onChange={e => setProductSearch({...productSearch, sku: e.target.value})}
                      />
                  </Col>
              </Row>
          </div>
          <Table
            dataSource={filteredProducts}
            rowKey="sku"
            rowSelection={{
                type: 'checkbox',
                selectedRowKeys,
                onChange: (keys, rows) => {
                    setSelectedRowKeys(keys);
                    setSelectedModalProducts(rows);
                }
            }}
            columns={[
              { title: '商品名称', dataIndex: 'name' },
              { title: '规格', dataIndex: 'spec' },
              { title: 'SKU', dataIndex: 'sku' },
              { title: '参考成本价', dataIndex: 'cost', render: (val) => `¥${val.toFixed(2)}` },
            ]}
            pagination={{ pageSize: 5 }}
          />
        </Modal>
      </Card>
    </div>
  );
};

export default PurchaseOrderCreate;
