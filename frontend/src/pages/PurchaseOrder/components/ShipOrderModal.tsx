import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, InputNumber, Select, Radio, DatePicker, Row, Col, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { shipPurchaseOrder, updateLogistics } from '../../../services/purchaseOrderService';
import { shipOutboundOrder, updateOutboundOrderLogistics } from '../../../services/warehouseService';
import { getLogisticsProviders, getLogisticsCompanies, LogisticsCompany } from '../../../services/logisticsService';
import { LogisticsProvider } from '../../../types/logistics';
import dayjs from 'dayjs';

interface ShipOrderModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (orderId: number, payload: any) => void;
  order: {
    id: number;
    poNo: string;
    deliveryMethod?: string;
    quantity?: number;
    items?: any[];
    logisticsProviderId?: number;
    shipCompany?: string;
    shipNo?: string;
    shipAuxCode?: string;
    freight?: number;
    expectTime?: string;
    shipTime?: string;
    deliverer?: string;
    delivererPhone?: string;
    plateNo?: string;
    shippingStatus?: string;
    attachments?: string;
  } | null;
  isOutboundOrder?: boolean;
}

const ShipOrderModal: React.FC<ShipOrderModalProps> = ({ open, onCancel, onSuccess, order, isOutboundOrder = false }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [shipType, setShipType] = useState('Logistics');
  const [logisticsProviders, setLogisticsProviders] = useState<LogisticsProvider[]>([]);
  const [logisticsCompanies, setLogisticsCompanies] = useState<LogisticsCompany[]>([]);
  
  // Validation States
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isFeeDisabled, setIsFeeDisabled] = useState(false);
  const [isDriverInfoLocked, setIsDriverInfoLocked] = useState(false);
  const [isLogisticsProviderLocked, setIsLogisticsProviderLocked] = useState(false);
  const [isLogisticsCompanyLocked, setIsLogisticsCompanyLocked] = useState(false);

  useEffect(() => {
    if (open) {
      // Fetch data only when modal opens
      getLogisticsProviders().then(setLogisticsProviders);
      getLogisticsCompanies().then(setLogisticsCompanies);
      
      // Reset form and states
      form.resetFields();
      setDuplicateWarning(null);
      setIsFeeDisabled(false);
      setIsDriverInfoLocked(false);
      setIsLogisticsProviderLocked(false);
      setIsLogisticsCompanyLocked(false);

      if (order) {
        const deliveryType = order.deliveryMethod === 'SelfDelivery' ? 'SelfDelivery' : 'Logistics';
        setShipType(deliveryType);
        
        // Calculate total quantity if items are provided, otherwise use order.quantity
        const qty = order.items 
          ? order.items.reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0)
          : (order.quantity || 0);

        // Prepare attachments fileList for echo
        let initialFileList: any[] = [];
        if (order.attachments) {
            try {
                const urls = JSON.parse(order.attachments);
                if (Array.isArray(urls)) {
                    initialFileList = urls.map((url: string, index: number) => ({
                        uid: `-${index}`,
                        name: `凭证${index + 1}`,
                        status: 'done',
                        url: url
                    }));
                }
            } catch (e) {
                console.error('Failed to parse attachments', e);
            }
        }

        // Pre-fill form for Edit Mode
        // Map orderInfo fields to form fields
        // For outbound orders, don't default to DROPSHIP
        const defaultLogisticsSupplier = order.logisticsProviderId || undefined;
        
        form.setFieldsValue({
          shipType: deliveryType,
          quantity: qty,
          logisticsSupplier: defaultLogisticsSupplier,
          // Logistics Fields
          shipCompany: order.shipCompany,
          shipNo: order.shipNo,
          auxCode: order.shipAuxCode,
          logisticsFee: order.freight || 0,
          expectedArrival: order.expectTime ? dayjs(order.expectTime) : undefined,
          shippedAt: order.shipTime ? dayjs(order.shipTime) : undefined,
          // Self Delivery Fields
          deliverer: order.deliverer,
          contact: order.delivererPhone,
          plateNo: order.plateNo,
          attachments: initialFileList.length > 0 ? initialFileList : undefined
        });
      }
    }
  }, [open, order, form, isOutboundOrder]);

  const handleWaybillBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const waybillNo = e.target.value;
    if (!waybillNo) {
        setIsFeeDisabled(false);
        setDuplicateWarning(null);
        setIsDriverInfoLocked(false);
        setIsLogisticsProviderLocked(false);
        setIsLogisticsCompanyLocked(false);
        return;
    }

    const deliveryType = shipType === 'Logistics' ? 'LOGISTICS' : 'SELF_DELIVERY';
    const excludePurchaseNo = order?.poNo;

    try {
        const res = await checkWaybill(waybillNo, deliveryType, excludePurchaseNo);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = res as any;

        if (data.hasDuplicate) {
            setIsFeeDisabled(true);
            form.setFieldsValue({ logisticsFee: 0 });
            setDuplicateWarning(`该运单/物流单号已在采购单 ${data.duplicatePurchaseNo} 中关联了 ${data.duplicateAmount} 的运费，不可重复计费。`);
        } else {
            setIsFeeDisabled(false);
            setDuplicateWarning(null);
        }
        
        // Field Backfill Logic
        if (shipType === 'SelfDelivery') {
            if (data.deliverer || data.contact || data.plateNo) {
                form.setFieldsValue({
                    deliverer: data.deliverer,
                    contact: data.contact,
                    plateNo: data.plateNo
                });
                setIsDriverInfoLocked(true);
                message.info('已自动代入历史关联配送信息');
            } else {
                setIsDriverInfoLocked(false);
            }

            if (data.logisticsProviderId) {
                form.setFieldsValue({ logisticsSupplier: data.logisticsProviderId });
                setIsLogisticsProviderLocked(true);
                message.info('已自动代入历史关联物流供应商');
            } else {
                setIsLogisticsProviderLocked(false);
            }
        }
        
        if (shipType === 'Logistics') {
            if (data.logisticsProviderId) {
                form.setFieldsValue({ logisticsSupplier: data.logisticsProviderId });
                setIsLogisticsProviderLocked(true);
                message.info('已自动代入历史关联物流供应商');
            } else {
                setIsLogisticsProviderLocked(false);
            }

            if (data.logisticsCompany) {
                form.setFieldsValue({ shipCompany: data.logisticsCompany }); // Use shipCompany to match List logic
                setIsLogisticsCompanyLocked(true);
                message.info('已自动代入历史关联物流公司');
            } else {
                setIsLogisticsCompanyLocked(false);
            }
        }
    } catch (error) {
        console.error("Waybill check failed", error);
    }
  };

  const handleOk = async () => {
    if (!order) return;
    
    try {
        const values = await form.validateFields();
        console.log('=== ShipOrderModal handleOk ===');
        console.log('Form values:', values);
        console.log('shipNo value:', values.shipNo);
        console.log('shipType value:', values.shipType);
        setLoading(true);

        const selectedSupplier = logisticsProviders.find((p: LogisticsProvider) => String(p.id) === String(values.logisticsSupplier));
        // If "DROPSHIP" (一件代发) is selected, do not set the logisticsSupplierName to the form value (which would be "DROPSHIP"),
        // let the backend handle the fallback to supplier name, or we can explicitly set it to undefined/null.
        // The issue was that values.logisticsSupplier is "DROPSHIP", so logisticsSupplierName became "DROPSHIP".
        const logisticsSupplierName = selectedSupplier?.name || (values.logisticsSupplier === 'DROPSHIP' ? undefined : values.logisticsSupplier);
        
        
        const selectedCompany = logisticsCompanies.find((c: LogisticsCompany) => c.code === values.shipCompany);
        const logisticsCompanyName = selectedCompany?.name || values.shipCompany;

        let attachmentsJson = undefined;
        if (values.attachments) {
            if (Array.isArray(values.attachments)) {
                const urls = values.attachments
                    .map((file: any) => file.response?.fileUrl || file.url)
                    .filter(Boolean);
                attachmentsJson = JSON.stringify(urls);
            }
        } else if (values.attachments === undefined && order?.attachments) {
            // If it's explicitly undefined but had attachments before (though our init logic usually sets it to [] if cleared),
            // wait, Ant Design Upload sets to [] when all files removed.
            // If values.attachments is literally undefined (not even touched), we shouldn't overwrite.
        }
        
        // If the user interacted with the upload component and cleared it, it becomes an empty array []
        if (Array.isArray(values.attachments) && values.attachments.length === 0) {
             attachmentsJson = "[]";
        }

        const payload = {
            ...values,
            attachments: attachmentsJson,
            shipCompany: values.shipCompany, 
            expectedArrival: values.expectedArrival ? values.expectedArrival.format('YYYY-MM-DDTHH:mm:ss') : undefined,
            shippedAt: values.shippedAt ? values.shippedAt.format('YYYY-MM-DDTHH:mm:ss') : undefined,
            logisticsSupplierName,
            logisticsCompanyName,
            shipNo: values.shipNo,
            shipType: values.shipType,
            logisticsFee: values.logisticsFee
        };

        const normalizedStatus = order.shippingStatus?.toUpperCase();
        const isShipped = normalizedStatus === 'SHIPPED';
        const isReceived = normalizedStatus === 'RECEIVED';
        
        if (isShipped || isReceived) {
            if (isOutboundOrder) {
                await updateOutboundOrderLogistics(order.id, payload);
            } else {
                await updateLogistics(order.id, payload);
            }
            message.success('物流信息修改成功');
        } else {
            if (isOutboundOrder) {
                await shipOutboundOrder(order.id, payload);
            } else {
                await shipPurchaseOrder(order.id, payload);
            }
            message.success('发货信息已提交');
        }
        
        onSuccess(order.id, payload);
        setLoading(false);
        onCancel();
    } catch (error: any) {
        console.error(error);
        message.error(error.message || '操作失败');
        setLoading(false);
    }
  };

  const normalizedStatus = order?.shippingStatus?.toUpperCase();
  const isEditMode = order && (normalizedStatus === 'SHIPPED' || normalizedStatus === 'RECEIVED');

  return (
    <Modal 
        title={`${isEditMode ? '修改物流信息' : (isOutboundOrder ? '出库单发货' : '采购单发货')} (${order?.poNo || ''})`} 
        open={open} 
        onOk={handleOk} 
        onCancel={onCancel}
        confirmLoading={loading}
        width={600}
        okText="确定"
        cancelText="取消"
    >
        <Form form={form} layout="vertical" initialValues={{ shipType: 'Logistics' }}>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item 
                        label="发货数量" 
                        name="quantity" 
                        rules={[{ required: true, message: '请输入发货数量' }]}
                    >
                        <InputNumber style={{ width: '100%' }} disabled />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="预计到货时间" name="expectedArrival">
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item 
                label="配送方式" 
                name="shipType"
                rules={[{ required: true, message: '请选择配送方式' }]}
            >
               <Radio.Group 
                  optionType="button" 
                  buttonStyle="solid"
                  onChange={(e) => {
                     const type = e.target.value;
                     setShipType(type);
                     // Clear fields but keep auxCode, quantity, and shipNo
                     const currentValues = form.getFieldsValue();
                     form.resetFields();
                     form.setFieldsValue({ 
                        shipType: type, 
                        auxCode: currentValues.auxCode,
                        quantity: currentValues.quantity,
                        logisticsSupplier: undefined,
                        // Preserve shipNo when switching modes
                        shipNo: currentValues.shipNo
                     });
                     setIsFeeDisabled(false);
                     setDuplicateWarning(null);
                     setIsDriverInfoLocked(false);
                     setIsLogisticsProviderLocked(false);
                     setIsLogisticsCompanyLocked(false);
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

            {duplicateWarning && (
                <div style={{ 
                    color: '#cf1322', 
                    fontWeight: 'bold',
                    backgroundColor: '#fff2f0',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    border: '1px solid #ffccc7',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    <span style={{ marginRight: 8, fontSize: '16px' }}>⚠️</span>
                    {duplicateWarning}
                </div>
            )}

            {shipType === 'Logistics' && (
                <>
                    <Form.Item 
                        name="logisticsSupplier" 
                        label="物流供应商" 
                        initialValue={isOutboundOrder ? undefined : undefined}
                        rules={[{ required: true, message: '请选择物流供应商' }]}
                    >
                        <Select 
                            placeholder="选择物流供应商"
                            allowClear={!isOutboundOrder}
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                            disabled={isLogisticsProviderLocked}
                            onChange={(val) => {
                                if (!val || val === 'DROPSHIP') {
                                    form.setFieldsValue({ logisticsFee: 0 });
                                }
                            }}
                        >
                            {!isOutboundOrder && (
                                <Select.Option key="DROPSHIP" value="DROPSHIP">一件代发 (默认)</Select.Option>
                            )}
                            {logisticsProviders.filter((p: LogisticsProvider) => p.status === 'ACTIVE').map((p: LogisticsProvider) => (
                                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item 
                        name="shipCompany" // Changed from logisticsCompany to shipCompany to unify payload
                        label="物流公司" 
                        rules={[{ required: true, message: '请选择物流公司' }]}
                    >
                        <Select 
                            placeholder="请选择物流公司"
                            showSearch
                            disabled={isLogisticsCompanyLocked}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase()) ||
                                (option?.value?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={logisticsCompanies.map(c => ({
                                label: c.name,
                                value: c.code
                            }))}
                        />
                    </Form.Item>

                    <Form.Item 
                        name="shipNo" 
                        label="运单号" 
                        rules={[
                            { required: true, message: '请输入运单号' },
                            {
                                validator: (_, value) => {
                                    if (value && value.startsWith('C') && value.length > 15) {
                                        return Promise.reject(new Error('运单号看起来像采购单号，请检查输入是否正确'));
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <Input placeholder="输入运单号" onBlur={handleWaybillBlur} />
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
                                rules={[
                                    { required: true, message: '请输入物流费用' },
                                    { type: 'number', min: 0, message: '费用不能为负数' },
                                    {
                                        validator: (_, value) => {
                                            if (value !== undefined && value !== null && value !== '') {
                                                const strValue = String(value);
                                                if (strValue.includes('.') && strValue.split('.')[1]?.length > 2) {
                                                    return Promise.reject(new Error('费用最多保留两位小数'));
                                                }
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                                validateStatus={duplicateWarning ? 'error' : ''}
                            >
                                <InputNumber 
                                    style={{ width: '100%' }} 
                                    prefix="¥" 
                                    min={0} 
                                    precision={2}
                                    disabled={isFeeDisabled}
                                />
                            </Form.Item>
                        )}
                    </Form.Item>
                    {duplicateWarning && (
                        <div style={{ 
                            color: '#cf1322', 
                            fontWeight: 'bold',
                            fontSize: '12px',
                            marginTop: '-12px',
                            marginBottom: '12px'
                        }}>
                            <span style={{ marginRight: 4 }}>⚠️</span>
                            物流费用已自动置为0并锁定
                        </div>
                    )}

                    <Form.Item label="辅助码 (选填)" name="auxCode" rules={[{ pattern: /^[A-Za-z0-9]{6,20}$/, message: '请输入6-20位字母数字组合' }]}>
                        <Input placeholder="用于特殊场景下的物流追踪辅助标识" />
                    </Form.Item>
                </>
            )}

            {shipType === 'SelfDelivery' && (
               <>
                  <Form.Item 
                     label="物流供应商" 
                     name="logisticsSupplier" 
                     initialValue={isOutboundOrder ? undefined : undefined}
                     rules={[{ required: true, message: '请选择物流供应商' }]}
                  >
                     <Select 
                        placeholder="请选择物流供应商" 
                        allowClear={!isOutboundOrder}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                           (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }
                        disabled={isLogisticsProviderLocked}
                        onChange={(val) => {
                            if (!val || val === 'DROPSHIP') {
                                form.setFieldsValue({ logisticsFee: 0 });
                            }
                        }}
                     >
                            {!isOutboundOrder && (
                                <Select.Option key="DROPSHIP" value="DROPSHIP">一件代发 (默认)</Select.Option>
                            )}
                            {logisticsProviders.filter((p: LogisticsProvider) => p.status === 'ACTIVE').map((p: LogisticsProvider) => (
                                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                            ))}
                        </Select>
                  </Form.Item>
                  
                  <Form.Item 
                      name="shipNo" 
                      label="物流单号" 
                      rules={[{ required: true, message: '请输入物流单号' }]}
                      validateStatus={duplicateWarning ? 'error' : ''}
                  >
                      <Input placeholder="请输入物流单号" onBlur={handleWaybillBlur} />
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
                              validateStatus={duplicateWarning ? 'error' : ''}
                          >
                             <InputNumber 
                                style={{ width: '100%' }} 
                                prefix="¥" 
                                min={0} 
                                precision={2} 
                                disabled={isFeeDisabled}
                             />
                          </Form.Item>
                      )}
                  </Form.Item>
                  {duplicateWarning && (
                      <div style={{ 
                          color: '#cf1322', 
                          fontWeight: 'bold',
                          fontSize: '12px',
                          marginTop: '-12px',
                          marginBottom: '12px'
                      }}>
                          <span style={{ marginRight: 4 }}>⚠️</span>
                          物流费用已自动置为0并锁定
                      </div>
                  )}

                  <Form.Item label="配送员" name="deliverer" rules={[{ required: true, message: '请输入配送员姓名' }]}>
                     <Input placeholder="请输入配送员姓名" disabled={isDriverInfoLocked} />
                  </Form.Item>
                  <Form.Item 
                     label="联系电话" 
                     name="contact" 
                     rules={[
                        { required: true, message: '请输入联系电话' },
                        { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                     ]}
                  >
                     <Input placeholder="请输入联系电话" disabled={isDriverInfoLocked} />
                  </Form.Item>
                  <Form.Item label="车牌号 (选填)" name="plateNo">
                     <Input placeholder="请输入车牌号" disabled={isDriverInfoLocked} />
                  </Form.Item>
               </>
            )}
            
            <Form.Item name="shippedAt" label="发货时间" initialValue={null}>
                <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="attachments" label="发货凭证" valuePropName="fileList" getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                    return e;
                }
                return e?.fileList;
            }}>
                <Upload
                   name="file"
                   action="/api/files/upload"
                   headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }}
                   listType="picture"
                   maxCount={10}
                >
                   <Button icon={<UploadOutlined />}>上传图片/文件</Button>
                </Upload>
            </Form.Item>
        </Form>
    </Modal>
  );
};

export default ShipOrderModal;
