import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Table, InputNumber, Upload, message, Row, Col, Space, Tooltip, Divider, Typography, Modal } from 'antd';
import { UploadOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined, PaperClipOutlined, InboxOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import SupplierSelect from './components/SupplierSelect';
import ProductPoolModal, { FlattenedSku } from './components/ProductPoolModal';
import { getWarehouses, Warehouse } from '../../services/warehouseService';
import { createPurchaseOrder, PurchaseOrder, PurchaseOrderItem } from '../../services/purchaseOrderService';
import { getRegionPath } from '../../utils/regionMap';
import { trackEvent } from '../../utils/tracker';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const InboundOrderCreate: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [manualAddress, setManualAddress] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>();

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses({ status: 'ACTIVE' });
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses', error);
      message.error('加载分仓列表失败');
    }
  };

  const handleWarehouseChange = (warehouseId: string | number) => {
    console.log('handleWarehouseChange called with:', warehouseId);
    // Note: warehouseService returns string ID in interface but Select might emit number?
    // Let's assume ID is number based on PurchaseOrder interface, but Warehouse has string ID?
    // Let's cast to verify.
    const wh = warehouses.find(w => String(w.id) === String(warehouseId));
    console.log('Found warehouse:', wh);
    if (!wh) return;

    // Auto-fill address
    const region = getRegionPath(wh.province, wh.city, wh.district);
    const fullAddr = `${region} ${wh.address}`;
    
    form.setFieldsValue({
      province: wh.province,
      city: wh.city,
      district: wh.district,
      detailAddress: wh.address,
      fullAddress: fullAddr
    });
    setManualAddress(false);

    // Auto-fill contact
    // Priority: managers (User objects) -> admins (legacy string array)
    if (wh.managers && wh.managers.length > 0) {
        const mgr = wh.managers[0];
        form.setFieldsValue({
            contactName: mgr.username || mgr.name, // User entity uses username
            contactPhone: mgr.phone || ''
        });
        if (!mgr.phone) {
             message.warning('该分仓管理员未配置电话信息');
        }
    } else if (wh.admins && wh.admins.length > 0) {
        // Fallback to legacy
         form.setFieldsValue({
            contactName: wh.admins[0],
            contactPhone: ''
        });
        message.warning('该分仓未配置详细管理员信息，请手动补充电话');
    } else {
        form.setFieldsValue({ contactName: '', contactPhone: '' });
        message.info('该分仓未配置仓库管理员');
    }
    
    // Check address completeness
    if (!wh.province || !wh.address) {
        message.error('该分仓地址信息不完整，请联系仓库管理员');
    }

    trackEvent({ category: 'PurchaseOrder', action: 'SelectWarehouse', label: wh.name });
  };

  const handleAddressChange = () => {
    setManualAddress(true);
  };
  
  const handleSupplierChange = (val: number) => {
      setSelectedSupplierId(val);
      trackEvent({ category: 'PurchaseOrder', action: 'SelectSupplier', value: val });
  };

  const handleProductSelect = (selectedSkus: FlattenedSku[]) => {
    const newItems = selectedSkus.map(sku => ({
      key: sku.key,
      productId: sku.productId,
      productName: sku.productName,
      skuCode: sku.skuCode,
      spec: sku.specName,
      quantity: 1,
      unitPrice: sku.costPrice || 0,
      totalPrice: sku.costPrice || 0
    }));
    
    // Append to existing items
    setItems(prev => [...prev, ...newItems]);
    setProductModalVisible(false);
  };

  const handleQuantityChange = (index: number, value: number | null) => {
    const newItems = [...items];
    const qty = value || 1;
    newItems[index].quantity = qty;
    newItems[index].totalPrice = qty * (newItems[index].unitPrice || 0);
    setItems(newItems);
  };
  
  const handleDeleteItem = (index: number) => {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
  };

  const calculateTotal = () => {
      return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const onFinish = async (values: any) => {
    if (items.length === 0) {
        message.error('请至少选择一个商品');
        return;
    }
    if (items.some(i => i.quantity <= 0)) {
        message.error('商品数量必须大于0');
        return;
    }

    // Attachment validation
    const totalSize = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
    if (totalSize > 100 * 1024 * 1024) {
        message.error('附件总大小不能超过100MB');
        return;
    }
    
    const attachmentUrls = fileList.map(f => {
        if (f.response) return f.response.fileUrl; // Assuming upload response structure
        return f.url;
    }).filter(Boolean);

    const payload: Partial<PurchaseOrder> = {
        supplier: { id: Number(values.supplierId) },
        warehouseId: Number(values.warehouseId), // Ensure number
        type: 'INBOUND',
        status: 'PENDING_SETTLEMENT', 
        items: items,
        totalAmount: calculateTotal(),
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        province: values.province,
        city: values.city,
        district: values.district,
        detailAddress: values.detailAddress,
        isManualAddress: manualAddress,
        attachments: JSON.stringify(attachmentUrls),
        remark: values.remark
    };

    const startTime = Date.now();
    setLoading(true);
    trackEvent({ category: 'PurchaseOrder', action: 'Submit', label: 'Start' });
    try {
        await createPurchaseOrder(payload);
        trackEvent({ category: 'PurchaseOrder', action: 'Submit', label: 'Success', value: Date.now() - startTime });
        message.success('入库采购单已创建');
        navigate('/supply-chain/purchase-order');
    } catch (error) {
        trackEvent({ category: 'PurchaseOrder', action: 'Submit', label: 'Failed' });
        console.error(error);
        // Error handled by request interceptor usually
    } finally {
        setLoading(false);
    }
  };
  
  const uploadProps = {
      action: '/api/files/upload', // Assuming this endpoint exists
      onChange: (info: any) => {
          setFileList(info.fileList);
          if (info.file.status === 'done') {
              message.success(`${info.file.name} 上传成功`);
              trackEvent({ category: 'PurchaseOrder', action: 'UploadAttachment', label: 'Success' });
          } else if (info.file.status === 'error') {
              message.error(`${info.file.name} 上传失败: ${info.file.error?.message || '网络异常'}`);
              trackEvent({ category: 'PurchaseOrder', action: 'UploadAttachment', label: 'Failed' });
          }
      },
      beforeUpload: (file: File) => {
          const isLt100M = file.size / 1024 / 1024 < 100;
          if (!isLt100M) {
              message.error('文件大小不能超过100MB');
          }
          const ext = file.name.split('.').pop()?.toLowerCase();
          const allowExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
          if (!allowExts.includes(ext || '')) {
              message.error('不支持的文件格式');
              return Upload.LIST_IGNORE;
          }
          return isLt100M;
      },
      fileList,
  };

  const columns = [
      { title: '商品编码', dataIndex: 'skuCode' },
      { title: '商品名称', dataIndex: 'productName' },
      { title: '规格', dataIndex: 'spec' },
      { 
          title: '单价', 
          dataIndex: 'unitPrice',
          render: (val: number) => `¥${val.toFixed(2)}`
      },
      { 
          title: '数量', 
          dataIndex: 'quantity',
          render: (text: number, record: any, index: number) => (
              <InputNumber min={1} value={text} onChange={(val) => handleQuantityChange(index, val)} />
          )
      },
      { 
          title: '小计', 
          dataIndex: 'totalPrice',
          render: (val: number) => `¥${(val || 0).toFixed(2)}`
      },
      {
          title: '操作',
          key: 'action',
          render: (_: any, __: any, index: number) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteItem(index)}>删除</Button>
          )
      }
  ];

  return (
    <div className="page-container">
      <Card title="新建入库采购单" bordered={false}>
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{}}
        >
            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item 
                        label="供应商" 
                        name="supplierId" 
                        rules={[{ required: true, message: '请选择供应商' }]}
                    >
                        <SupplierSelect onChange={handleSupplierChange} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item 
                        label="入库仓库" 
                        name="warehouseId" 
                        rules={[{ required: true, message: '请选择入库仓库' }]}
                    >
                        <Select 
                            data-testid="warehouse-select"
                            placeholder="请选择分仓" 
                            onChange={handleWarehouseChange}
                            loading={warehouses.length === 0}
                        >
                            {warehouses.map(w => (
                                <Option key={w.id} value={w.id}>{w.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Divider>收货信息</Divider>
            
            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item label="所在地区" style={{marginBottom: 0}}>
                        <Space>
                             <Form.Item name="province" noStyle><Input placeholder="省" readOnly /></Form.Item>
                             <Form.Item name="city" noStyle><Input placeholder="市" readOnly /></Form.Item>
                             <Form.Item name="district" noStyle><Input placeholder="区" readOnly /></Form.Item>
                        </Space>
                    </Form.Item>
                </Col>
                <Col span={12}>
                     <Form.Item 
                        label="详细地址" 
                        name="detailAddress"
                        help={manualAddress ? "已手动修改" : ""}
                     >
                        <Input onChange={handleAddressChange} />
                     </Form.Item>
                </Col>
            </Row>

            <Row gutter={24}>
                <Col span={8}>
                    <Form.Item label="联系人姓名" name="contactName" rules={[{ required: true, message: '请输入联系人' }]}>
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label="联系人电话" name="contactPhone" rules={[{ required: true, message: '请输入电话' }]}>
                        <Input />
                    </Form.Item>
                </Col>
            </Row>

            <Divider>商品明细</Divider>
            
            <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductModalVisible(true)}>
                    选择商品
                </Button>
                <Button 
                    danger 
                    style={{ marginLeft: 8 }} 
                    disabled={items.length === 0}
                    onClick={() => setItems([])}
                >
                    清空明细
                </Button>
            </div>

            <Table
                rowKey="key"
                dataSource={items}
                columns={columns}
                pagination={false}
                scroll={{ x: 1000 }}
                summary={() => (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={5} align="right">合计：</Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                            <Typography.Text type="danger" strong>
                                ¥{calculateTotal().toFixed(2)}
                            </Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                )}
            />

            <Divider>其他信息</Divider>

            <Form.Item label="附件" name="attachments">
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>上传附件 (支持拖拽, Max 100MB)</Button>
                </Upload>
                <div style={{ marginTop: 8, color: '#999' }}>
                    支持格式: pdf, doc, docx, xls, xlsx, jpg, png, zip, rar
                </div>
            </Form.Item>

            <Form.Item label="备注" name="remark">
                <TextArea rows={4} />
            </Form.Item>

            <Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit" loading={loading} size="large">
                        提交入库采购单
                    </Button>
                    <Button onClick={() => navigate('/supply-chain/purchase-order')} size="large">
                        取消
                    </Button>
                </Space>
            </Form.Item>
        </Form>
      </Card>

      <ProductPoolModal
        open={productModalVisible}
        onCancel={() => setProductModalVisible(false)}
        onOk={handleProductSelect}
        supplierId={selectedSupplierId}
      />
    </div>
  );
};

export default InboundOrderCreate;
