import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Table, InputNumber, Upload, message, Row, Col, Space, Tooltip, Divider, Typography, DatePicker } from 'antd';
import { UploadOutlined, DeleteOutlined, PlusOutlined, DownloadOutlined, EyeOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import SupplierSelect from './components/SupplierSelect';
import ProductPoolModal, { FlattenedSku } from './components/ProductPoolModal';
import { getWarehouses, Warehouse } from '../../services/warehouseService';
import { generateInboundPurchaseOrder, PurchaseOrder, PurchaseOrderItem } from '../../services/purchaseOrderService';
import { getRegionPath } from '../../utils/regionMap';
import { trackEvent } from '../../utils/tracker';
import { useFileUpload } from '../../utils/hooks/useFileUpload';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

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

  const { beforeUpload, formatFileSize, isImageFile } = useFileUpload({
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx'],
    maxSize: 100 * 1024 * 1024,
    maxTotalSize: 100 * 1024 * 1024,
  });

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
    // Note: warehouseService returns string ID in interface but Select might emit number?
    // Let's assume ID is number based on PurchaseOrder interface, but Warehouse has string ID?
    // Let's cast to verify.
    const wh = warehouses.find(w => String(w.id) === String(warehouseId));
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
    const newItems = selectedSkus.map(sku => {
        // Strict check for null/undefined
        if (sku.productId === null || sku.productId === undefined) {
            message.error(`商品 ${sku.productName} 数据严重异常(ID缺失)，请联系管理员`);
            return null;
        }
        return {
            key: sku.key,
            productId: sku.productId,
            productName: sku.productName,
            skuCode: sku.skuCode,
            spec: sku.specName,
            quantity: 1,
            unitPrice: sku.costPrice || 0,
            totalPrice: sku.costPrice || 0,
            defaultSupplierId: sku.defaultSupplierId,
            defaultSupplierName: sku.defaultSupplierName
        };
    }).filter(item => item !== null) as PurchaseOrderItem[];
    
    // Auto-fill supplier if not selected and new items have a default supplier
    if (newItems.length > 0 && !form.getFieldValue('supplierId')) {
        const firstWithSupplier = newItems.find(item => item.defaultSupplierId);
        if (firstWithSupplier && firstWithSupplier.defaultSupplierId) {
            form.setFieldsValue({ supplierId: firstWithSupplier.defaultSupplierId });
            handleSupplierChange(firstWithSupplier.defaultSupplierId);
            message.info(`已自动关联默认供应商: ${firstWithSupplier.defaultSupplierName}`);
        }
    }
    
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = async (values: any) => {
    if (items.length === 0) {
        message.error('请至少选择一件商品');
        return;
    }
    if (items.some(i => i.quantity <= 0)) {
        message.error('商品数量必须大于0');
        return;
    }
    
    // Validate Product IDs with specific row info
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId) { // Check for null, undefined, 0, ""
            message.error(`第 ${i + 1} 行商品未选择，请重新选择`);
            return;
        }
    }

    // Attachment validation
    const totalSize = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
    if (totalSize > 100 * 1024 * 1024) {
        message.error(`附件总大小不能超过${formatFileSize(100 * 1024 * 1024)}`);
        return;
    }
    
    const attachmentUrls = fileList
      .filter(f => f.status === 'done')
      .map(f => {
        if (f.response && f.response.fileUrl) return f.response.fileUrl;
        if (f.url) return f.url;
        return null;
      })
      .filter(Boolean);

    const payload: Partial<PurchaseOrder> = {
        supplier: { id: Number(values.supplierId) },
        warehouseId: Number(values.warehouseId),
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
        remark: values.remark,
        deliveryDate: values.expectedArrival ? dayjs(values.expectedArrival).format('YYYY-MM-DD') : undefined
    };

    const startTime = Date.now();
    setLoading(true);
    trackEvent({ category: 'PurchaseOrder', action: 'Submit', label: 'Start' });

    try {
        await generateInboundPurchaseOrder(payload);
        trackEvent({ category: 'PurchaseOrder', action: 'Submit', label: 'Success', value: Date.now() - startTime });
        message.success('入库采购单已创建');
        navigate('/supply-chain/purchase-order', { state: { refresh: true } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        trackEvent({ category: 'PurchaseOrder', action: 'Submit', label: 'Failed' });
        
        const errorMsg = error.response?.data?.message || error.message || '系统异常，请稍后重试';
        message.error(`提交失败: ${errorMsg}`);
    } finally {
        setLoading(false);
    }
  };

  const handlePreview = async (file: UploadFile) => {
    const fileUrl = file.url || file.response?.fileUrl;
    if (!fileUrl) {
      message.error('文件URL不存在');
      return;
    }
    
    if (isImageFile(file.name)) {
      window.open(fileUrl, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownload = (file: UploadFile) => {
    const fileUrl = file.url || file.response?.fileUrl;
    if (!fileUrl) {
      message.error('文件URL不存在');
      return;
    }
    
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadProps: UploadProps = {
    action: '/api/files/upload',
    multiple: true,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    fileList,
    onChange: (info) => {
      setFileList(info.fileList);
      
      if (info.file.status === 'done') {
        const response = info.file.response;
        if (response && response.fileUrl) {
          message.success(`${info.file.name} 上传成功`);
          trackEvent({ category: 'PurchaseOrder', action: 'UploadAttachment', label: 'Success' });
        } else {
          message.error(`${info.file.name} 上传失败: 响应格式错误`);
        }
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
        trackEvent({ category: 'PurchaseOrder', action: 'UploadAttachment', label: 'Failed' });
      }
    },
    beforeUpload: (file) => {
      const isValid = beforeUpload(file, fileList);
      if (!isValid) {
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    onRemove: (file) => {
      trackEvent({ category: 'PurchaseOrder', action: 'RemoveAttachment', label: file.name });
    },
    itemRender: (originNode, file) => {
      const fileUrl = file.url || file.response?.fileUrl;
      
      return (
        <div className="attachment-item" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          marginBottom: 8,
          background: file.status === 'done' ? '#fafafa' : '#fff'
        }}>
          <PaperClipOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              fontWeight: 500
            }}>
              {file.name}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {file.size ? formatFileSize(file.size) : ''}
              {file.status === 'uploading' && ' - 上传中...'}
              {file.status === 'done' && ' - 上传成功'}
              {file.status === 'error' && ' - 上传失败'}
            </Text>
          </div>
          
          {file.status === 'done' && fileUrl && (
            <Space size="small">
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
                  onClick={() => handleDownload(file)}
                />
              </Tooltip>
            </Space>
          )}
          
          {file.status === 'error' && (
            <Button 
              type="text" 
              size="small" 
              danger
              onClick={() => {
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
              }}
            >
              移除
            </Button>
          )}
        </div>
      );
    },
  };

  const columns = [
      { title: '商品编码', dataIndex: 'skuCode' },
      { title: '商品名称', dataIndex: 'productName' },
      { title: '默认供应商', dataIndex: 'defaultSupplierName', render: (text: string) => text || '-' },
      { title: '规格', dataIndex: 'spec' },
      { 
          title: '单价', 
          dataIndex: 'unitPrice',
          render: (val: number) => `¥${val.toFixed(2)}`
      },
      { 
          title: '数量', 
          dataIndex: 'quantity',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render: (_: any, __: any, index: number) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteItem(index)}>删除</Button>
          )
      }
  ];

  return (
    <div className="page-container">
      <Card title="新建入库采购单" variant="borderless">
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

            <Form.Item 
                label="附件" 
                name="attachments"
                extra="支持格式: pdf, doc, docx, xls, xlsx, jpg, png, zip, rar"
            >
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>上传附件 (支持拖拽, Max 100MB)</Button>
                </Upload>
            </Form.Item>

            <Form.Item label="备注" name="remark">
                <TextArea rows={4} />
            </Form.Item>

            <Form.Item 
                label="预计到货日期" 
                name="expectedArrival"
                extra="选填，可指定期望的货物到达时间"
            >
                <DatePicker 
                    style={{ width: '100%' }} 
                    placeholder="请选择预计到货日期"
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
            </Form.Item>

            <Form.Item>
                <Space>
                    <Tooltip title={items.length === 0 ? "请至少选择一件商品" : ""}>
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading} 
                            size="large"
                            disabled={items.length === 0}
                        >
                            提交入库采购单
                        </Button>
                    </Tooltip>
                    {items.length === 0 && <span style={{ color: '#ff4d4f', fontSize: '14px' }}>* 请至少选择一件商品</span>}
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
