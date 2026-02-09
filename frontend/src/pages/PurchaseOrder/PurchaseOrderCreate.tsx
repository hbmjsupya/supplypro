import React, { useState, useEffect } from 'react';
import { Card, Form, Input, DatePicker, Select, Button, Table, InputNumber, Upload, message, Modal, Space, Typography, Row, Col } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, CopyOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createPurchaseOrder, generateInboundPurchaseOrder } from '../../services/purchaseOrderService';
import type { PurchaseOrder, PurchaseOrderItem } from '../../services/purchaseOrderService';
import { getWarehouses } from '../../services/warehouseService';
import SupplierSelect from './components/SupplierSelect';
import ProductPoolModal, { FlattenedSku } from './components/ProductPoolModal';
import { getRegionPath } from '../../utils/regionMap';
import dayjs from 'dayjs';

const PurchaseOrderCreate: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>();
  
  // Removed MOCK_PRODUCTS and related search state

  useEffect(() => {
    // Filter only ACTIVE warehouses
    getWarehouses({ statuses: 'ACTIVE' })
      .then(setWarehouses)
      .catch(err => {
        console.error('Failed to load warehouses', err);
        message.error('加载仓库列表失败: ' + (err.response?.data?.message || err.message));
      });
  }, []);

  const handleWarehouseChange = (code: string) => {
    const wh = warehouses.find(w => w.code === code);
    if (wh) {
      const regionPath = getRegionPath(wh.province, wh.city, wh.district);
      
      // Contact name resolution: managers (fullName) > managers (username) > admins (legacy)
      let contactName = '库管员';
      if (wh.managers && wh.managers.length > 0) {
          contactName = wh.managers[0].fullName || wh.managers[0].username;
      } else if (wh.admins) {
          // Handle legacy admins field (string or array)
          if (Array.isArray(wh.admins)) {
              contactName = wh.admins[0];
          } else if (typeof wh.admins === 'string') {
              // Prevent truncation bug (e.g. "admin"[0] = "a")
              contactName = (wh.admins as string).split(',')[0];
          }
      }

      form.setFieldsValue({
        warehouseRegion: regionPath,
        address: `${regionPath} ${wh.address}`, // Use Chinese region + address detail
        contact: contactName,
        phone: '13800138000' // Placeholder if not available
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

  const handleProductSelect = (selectedSkus: FlattenedSku[]) => {
    const currentItems = form.getFieldValue('items') || [];
    const newItems: PurchaseOrderItem[] = [];
    
    // Auto-fill supplier if not selected (using the first item's default supplier)
    if (!selectedSupplierId && selectedSkus.length > 0) {
        const defaultSupId = selectedSkus[0].defaultSupplierId;
        if (defaultSupId) {
            setSelectedSupplierId(defaultSupId);
            form.setFieldsValue({ supplier: defaultSupId });
            message.info('已自动填充默认供应商');
        }
    }

    selectedSkus.forEach(record => {
        // Avoid duplicates based on SKU Code
        if (!currentItems.find((item: any) => item.skuCode === record.skuCode)) {
            newItems.push({
                productId: record.productId,
                productName: record.productName,
                skuCode: record.skuCode,
                spec: record.specName,
                quantity: 1,
                unitPrice: record.costPrice,
            });
        }
    });

    if (newItems.length === 0 && selectedSkus.length > 0) {
        message.warning('所选商品已在列表中');
    } else {
        const updatedItems = [...currentItems, ...newItems];
        form.setFieldsValue({
            items: updatedItems
        });
        message.success(`已添加 ${newItems.length} 个商品`);
    }
    
    setProductModalOpen(false);
  };

  const onValuesChange = (changedValues: any, allValues: any) => {
      if (changedValues.supplier) {
          setSelectedSupplierId(changedValues.supplier);
      }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const wh = warehouses.find(w => w.code === values.warehouseCode);

      // Split Logic: One PO per Item (Spec) - Preserving business rule from original file
      const promises = values.items.map(async (item: any) => {
          const totalAmount = item.quantity * item.unitPrice;
          
          const newPO: Partial<PurchaseOrder> = {
            // let backend generate ID and OrderNo
            supplierId: values.supplier, 
            // supplierName will be handled by backend or derived
            deliveryDate: values.expectedArrivalDate.format('YYYY-MM-DD'),
            type: 'INBOUND', 
            items: [{
                productId: item.productId,
                productName: item.productName,
                skuCode: item.skuCode,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: totalAmount,
                spec: item.spec
            }],
            status: 'PENDING',
            totalAmount: totalAmount,
            attachments: JSON.stringify(values.attachments?.fileList?.map((f: any) => f.name) || []),
            warehouseId: wh?.id,
            warehouseName: wh?.name,
            contactName: values.contact,
            contactPhone: values.phone,
            province: wh?.province,
            city: wh?.city,
            district: wh?.district,
            detailAddress: wh?.address,
            // Add other fields as necessary
          };
          return generateInboundPurchaseOrder(newPO);
      });

      await Promise.all(promises);
      
      message.success('入库采购单已生成');
      navigate('/supply-chain/purchase-order');
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.message || error.message || '未知错误';
      message.error(`创建失败: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="新增采购单" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={onValuesChange}
          initialValues={{ items: [] }}
        >
          <Card type="inner" title="基本信息" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
              <Form.Item name="supplier" label="供应商" rules={[{ required: true }]}>
                <SupplierSelect />
              </Form.Item>
              <Form.Item name="expectedArrivalDate" label="预计到货日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              {/* Project field removed as it was hardcoded and no service exists */}
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
                        <Form.Item {...field} name={[field.name, 'spec']} style={{ marginBottom: 0 }}>
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
                      dataIndex: 'unitPrice',
                      width: 150,
                      render: (_, field) => (
                        <Form.Item
                          {...field}
                          name={[field.name, 'unitPrice']}
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
                          const cost = form.getFieldValue(['items', field.name, 'unitPrice']) || 0;
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
                生成入库采购单
              </Button>
              <Button onClick={() => navigate('/supply-chain/purchase-order')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>

        <ProductPoolModal
          open={productModalOpen}
          onCancel={() => setProductModalOpen(false)}
          onOk={handleProductSelect}
        />
      </Card>
    </div>
  );
};

export default PurchaseOrderCreate;
