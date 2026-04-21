import React, { useState, useEffect } from 'react';
import { Card, Form, Input, DatePicker, Select, Button, Table, InputNumber, Upload, message, Space } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { generateInboundPurchaseOrder } from '../../services/purchaseOrderService';
import { uploadFile } from '../../services/fileService';
import type { PurchaseOrder, PurchaseOrderItem } from '../../services/purchaseOrderService';
import { getWarehouses } from '../../services/warehouseService';
import SupplierSelect from './components/SupplierSelect';
import ProductPoolModal, { FlattenedSku } from './components/ProductPoolModal';
import { getRegionPath } from '../../utils/regionMap';
import dayjs from 'dayjs';
import { trackEvent } from '../../utils/tracker';

const PurchaseOrderCreate: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const customRequest = async (options: any) => {
    const { onSuccess, onError, file } = options;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await uploadFile(file as File) as any;
      onSuccess(res);
      message.success(`${file.name} 上传成功`);
    } catch (err) {
      console.error(err);
      onError(err);
      message.error(`${file.name} 上传失败`);
    }
  };

  const handleProductSelect = (selectedSkus: FlattenedSku[]) => {
    const currentItems = form.getFieldValue('items') || [];
    const newItems: PurchaseOrderItem[] = [];
    
    let autoFilledCount = 0;
    selectedSkus.forEach(record => {
        // Avoid duplicates based on SKU Code
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!currentItems.find((item: any) => item.skuCode === record.skuCode)) {
            const newItem: PurchaseOrderItem & { supplierId?: number; supplierName?: string } = {
                productId: record.productId,
                productName: record.productName,
                skuCode: record.skuCode,
                spec: record.specName,
                quantity: 1,
                unitPrice: record.costPrice,
            };

            // Auto-fill supplier for this item
            if (record.defaultSupplierId) {
                newItem.supplierId = record.defaultSupplierId;
                newItem.supplierName = record.defaultSupplierName; // Assuming flattened SKU has this or we just use ID
                autoFilledCount++;
            }

            newItems.push(newItem);
        }
    });

    if (newItems.length === 0 && selectedSkus.length > 0) {
        message.warning('所选商品已在列表中');
    } else {
        const updatedItems = [...currentItems, ...newItems];
        form.setFieldsValue({
            items: updatedItems
        });
        
        if (autoFilledCount > 0) {
            message.success(`已添加 ${newItems.length} 个商品，其中 ${autoFilledCount} 个已自动填充默认供应商`);
        } else if (newItems.length > 0) {
            message.info(`已添加 ${newItems.length} 个商品，未关联默认供应商，请手动选择`);
        }
    }
    
    setProductModalOpen(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = async (values: any) => {

    // 0. Check for uploading files
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadingFiles = values.attachments?.filter((f: any) => f.status === 'uploading');
    if (uploadingFiles && uploadingFiles.length > 0) {
        message.warning('请等待所有文件上传完成');
        return;
    }

    // 1. Critical Frontend Validation: Prevent submission with empty items
    if (!values.items || values.items.length === 0) {
        message.error('请至少选择一件商品');
        // Operation Log: Record abnormal click behavior
        trackEvent({
            category: 'PurchaseOrder',
            action: 'CreateBlocked',
            label: 'NoItemsSelected',
            user: values.contact || 'unknown'
        });
        return;
    }

    // 2. Secondary Validation: Ensure items have valid Product IDs and Quantities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validItems = values.items.filter((item: any) => item.productId && item.quantity > 0);
    
    if (validItems.length === 0) {
        message.error('所选商品数据无效（缺少ID或数量），请重新选择');
        trackEvent({
            category: 'PurchaseOrder',
            action: 'CreateBlocked',
            label: 'InvalidItems',
            detail: 'Missing ID or Quantity'
        });
        return;
    }

    // 3. Supplier Validation: Ensure every item has a supplier (row-level)
    // We enforce row-level supplier.

    setLoading(true);
    try {
      const wh = warehouses.find(w => w.code === values.warehouseCode);

      // Split Logic: One PO per Item (Spec) - Preserving business rule from original file
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises = validItems.map(async (item: any) => {
          // validItems already filtered, but safe to keep strict typing
          const totalAmount = item.quantity * item.unitPrice;
          
          // Use item-level supplier only (Global supplier removed)
          const finalSupplierId = item.supplierId;

          if (!finalSupplierId) {
             throw new Error(`商品 ${item.productName} 未指定供应商`);
          }

          const newPO: Partial<PurchaseOrder> = {
            // let backend generate ID and OrderNo
            supplierId: finalSupplierId, 
                  // supplierName will be handled by backend or derived
                  deliveryDate: values.expectedArrivalDate ? dayjs(values.expectedArrivalDate).format('YYYY-MM-DD') : undefined,
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            attachments: JSON.stringify(values.attachments?.map((f: any) => {
                if (f.response && f.response.fileUrl) {
                    return f.response.fileUrl;
                }
                // Handle cases where upload might have failed or file object structure is different
                return f.url || f.response?.url || null;
            }).filter(Boolean) || []),
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
      navigate('/supply-chain/purchase-order', { state: { refresh: true } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <Card title="新增采购单" variant="borderless">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          // onValuesChange handler removed as supplier logic is gone
          initialValues={{ items: [] }}
        >
          <Card type="inner" title="基本信息" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
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
              <Form.Item 
                name="attachments" 
                label="附件"
                valuePropName="fileList"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                getValueFromEvent={(e: any) => {
                  if (Array.isArray(e)) {
                    return e;
                  }
                  return e?.fileList;
                }}
              >
                <Upload 
                  customRequest={customRequest}
                  listType="text"
                >
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
                      render: (_, field) => {
                        const { key, ...restField } = field;
                        return (
                          <>
                            <Form.Item key={key} {...restField} name={[field.name, 'productName']} style={{ marginBottom: 0 }}>
                              <Input readOnly variant="borderless" />
                            </Form.Item>
                            {/* Hidden fields to ensure these values are included in onFinish */}
                            <Form.Item key={`${key}-productId`} {...restField} name={[field.name, 'productId']} hidden>
                              <Input />
                            </Form.Item>
                            <Form.Item key={`${key}-skuCode`} {...restField} name={[field.name, 'skuCode']} hidden>
                              <Input />
                            </Form.Item>
                          </>
                        );
                      },
                    },
                    {
                      title: '供应商',
                      dataIndex: 'supplierId',
                      width: 200,
                      render: (_, field) => {
                        const { key, ...restField } = field;
                        // Get the item to check if it has a pre-filled supplier
                        // We need to access the form value to see if it's set
                        return (
                          <Form.Item
                            key={key}
                            {...restField}
                            name={[field.name, 'supplierId']}
                            rules={[{ required: true, message: '请选择供应商' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <SupplierSelect placeholder="选择供应商" />
                          </Form.Item>
                        );
                      },
                    },
                    {
                      title: '规格',
                      dataIndex: 'spec',
                      render: (_, field) => {
                        const { key, ...restField } = field;
                        return (
                          <Form.Item key={key} {...restField} name={[field.name, 'spec']} style={{ marginBottom: 0 }}>
                            <Input readOnly variant="borderless" />
                          </Form.Item>
                        );
                      },
                    },
                    {
                      title: '采购数量',
                      dataIndex: 'quantity',
                      width: 150,
                      render: (_, field) => {
                        const { key, ...restField } = field;
                        return (
                          <Form.Item
                            key={key}
                            {...restField}
                            name={[field.name, 'quantity']}
                            rules={[{ required: true, message: '请输入数量' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                          </Form.Item>
                        );
                      },
                    },
                    {
                      title: '单价(元)',
                      dataIndex: 'unitPrice',
                      width: 150,
                      render: (_, field) => {
                        const { key, ...restField } = field;
                        return (
                          <Form.Item
                            key={key}
                            {...restField}
                            name={[field.name, 'unitPrice']}
                            rules={[{ required: true, message: '请输入单价' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                          </Form.Item>
                        );
                      },
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

          <Card type="inner" title="其他信息" style={{ marginBottom: 24 }}>
            <Form.Item 
              label="预计到货日期" 
              name="expectedArrivalDate"
              extra="选填，可指定期望的货物到达时间"
            >
              <DatePicker 
                style={{ width: '100%' }} 
                placeholder="请选择预计到货日期"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </Card>

          <Form.Item shouldUpdate={(prev, curr) => prev.items !== curr.items} style={{ marginBottom: 0 }}>
            {() => {
              const items = form.getFieldValue('items') || [];
              const hasItems = items.length > 0;
              return (
                <Space>
                   <Button 
                     type="primary" 
                     htmlType="submit" 
                     loading={loading}
                     disabled={!hasItems}
                     title={!hasItems ? "请至少选择一件商品" : ""}
                   >
                     生成入库采购单
                   </Button>
                   {!hasItems && <span style={{ color: '#ff4d4f', fontSize: '12px' }}>* 请先选择商品</span>}
                   <Button onClick={() => navigate('/supply-chain/purchase-order')}>取消</Button>
                </Space>
              );
            }}
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
