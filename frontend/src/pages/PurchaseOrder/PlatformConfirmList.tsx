import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Tag, Form, Row, Col, message, InputNumber, Select, Tooltip, Typography, DatePicker, Modal, Radio, Divider, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, ExportOutlined, UndoOutlined, ExclamationCircleOutlined, ImportOutlined, UploadOutlined, HomeOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload/interface';
import { Upload } from 'antd';
import { useExport } from '../../utils/exportUtils';
import { getWarehouses, getInventoryBatches, createOutboundOrder } from '../../services/warehouseService';
import type { OutboundOrder } from '../../types/warehouse';

interface ConfirmItemType {
  key: string;
  orderNo: string;
  orderType: 'OrderPurchase' | 'Replenishment';
  bizNo: string;
  thirdPartyNo: string;
  productName: string;
  specName: string;
  quantity: number;
  cost: number;
  supplier: string;
  totalCost: number;
  receiver: string;
  address: string;
  projectName: string;
  costType: 'Platform' | 'Supplier';
  isBundleSplit?: boolean;
  bundleInfo?: {
    id: string;
    name: string;
    items: { name: string; quantity: number }[];
  };
  // Track original values for reset functionality
  originalCost?: number;
  originalSupplier?: string; // Store ID or Name? Using Name for simplicity in this prototype
  supplierId?: string; // Add supplier ID for selection
  productId?: string;
  skuId?: string;
}

// Mock Master Data for Price Sync
const mockMasterDataPrice: Record<string, Record<string, number>> = {
  '晨光A4打印纸': {
    '晨光文具': 18.00,
    '得力集团': 17.50,
    '齐心办公': 17.80,
  },
  '晨光中性笔': {
    '晨光文具': 2.50,
    '广博股份': 2.40,
  },
  '晨光笔记本': {
    '晨光文具': 5.00,
    '史泰博': 5.20,
  }
};

// Mock Enabled Suppliers
const enabledSuppliers = [
    { value: '晨光文具', label: '晨光文具' },
    { value: '得力集团', label: '得力集团' },
    { value: '齐心办公', label: '齐心办公' },
    { value: '广博股份', label: '广博股份' },
    { value: '史泰博', label: '史泰博' },
];

const mockData: ConfirmItemType[] = [
  {
    key: '1',
    orderNo: 'ORD20231028001',
    orderType: 'OrderPurchase',
    bizNo: 'SO20231028001-1',
    thirdPartyNo: 'TP123456',
    productName: '晨光A4打印纸',
    specName: '70g/500张/包',
    quantity: 10,
    cost: 18.00,
    supplier: '晨光文具',
    totalCost: 180.00,
    receiver: '张三 / 13800138000',
    address: '上海市浦东新区张江高科园区',
    projectName: '某某大型国企项目',
    costType: 'Platform',
    originalCost: 18.00,
    originalSupplier: '晨光文具',
    productId: 'P005',
    skuId: 'SKU006',
  },
  {
    key: '2',
    orderNo: 'ORD20231028002',
    orderType: 'Replenishment',
    bizNo: 'REP20231028001',
    thirdPartyNo: '-',
    productName: '得力订书机',
    specName: '12号',
    quantity: 5,
    cost: 0.00, // Cost is 0 for Supplier Replenishment
    supplier: '得力集团',
    totalCost: 0.00,
    receiver: '李四 / 13900139000',
    address: '北京市朝阳区CBD',
    projectName: '售后补发',
    costType: 'Supplier',
    originalCost: 0.00,
    originalSupplier: '得力集团',
  },
  // Bundle Split Example (Row A)
  {
    key: '3',
    orderNo: 'ORD20231028003',
    orderType: 'OrderPurchase',
    bizNo: 'SO20231028003-1',
    thirdPartyNo: 'TP987654',
    productName: '晨光中性笔',
    specName: '黑色/0.5mm',
    quantity: 20, // 10 bundles * 2 pens
    cost: 2.50,
    supplier: '晨光文具',
    totalCost: 50.00,
    receiver: '王五 / 13700137000',
    address: '广州市天河区科技园',
    projectName: '办公套装采购',
    costType: 'Platform',
    isBundleSplit: true,
    bundleInfo: {
      id: 'BDL001',
      name: '晨光办公套装 (笔+本)',
      items: [
        { name: '晨光中性笔', quantity: 2 },
        { name: '晨光笔记本', quantity: 1 }
      ]
    },
    originalCost: 2.50,
    originalSupplier: '晨光文具',
  },
  // Bundle Split Example (Row B)
  {
    key: '4',
    orderNo: 'ORD20231028003',
    orderType: 'OrderPurchase',
    bizNo: 'SO20231028003-1',
    thirdPartyNo: 'TP987654',
    productName: '晨光笔记本',
    specName: 'B5/60页',
    quantity: 10, // 10 bundles * 1 notebook
    cost: 5.00,
    supplier: '晨光文具',
    totalCost: 50.00,
    receiver: '王五 / 13700137000',
    address: '广州市天河区科技园',
    projectName: '办公套装采购',
    costType: 'Platform',
    isBundleSplit: true,
    bundleInfo: {
      id: 'BDL001',
      name: '晨光办公套装 (笔+本)',
      items: [
        { name: '晨光中性笔', quantity: 2 },
        { name: '晨光笔记本', quantity: 1 }
      ]
    },
    originalCost: 5.00,
    originalSupplier: '晨光文具',
  },
];

const PlatformConfirmList: React.FC = () => {
  const [dataSource, setDataSource] = useState(mockData);

  const [searchText, setSearchText] = useState({
    supplier: '',
    orderNo: '',
    project: '',
    receiver: '',
    product: '',
    timeRange: null,
    bizNo: '',
    address: '',
  });

  // Import Feature State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<{
      total: number;
      success: number;
      error: number;
      changes: any[];
      errors: any[];
  }>({ total: 0, success: 0, error: 0, changes: [], errors: [] });
  
  // Sub-warehouse Shipment State
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [currentShipItem, setCurrentShipItem] = useState<ConfirmItemType | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    // Load warehouse data for sub-warehouse shipment feature
    Promise.all([getWarehouses(), getInventoryBatches()]).then(([whs, inv]) => {
        setWarehouses(whs);
        setInventory(inv);
    });
  }, []);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const handleBatchConfirm = () => {
    if (selectedRowKeys.length === 0) {
        message.warning('请先选择要确认的订单');
        return;
    }
    Modal.confirm({
        title: `确认批量提交 ${selectedRowKeys.length} 条订单?`,
        icon: <ExclamationCircleOutlined />,
        content: '提交后将生成正式采购单',
        onOk: () => {
             setDataSource(dataSource.filter(item => !selectedRowKeys.includes(item.key)));
             setSelectedRowKeys([]);
             message.success('批量确认成功');
        }
    });
  };

  const handleBatchReject = () => {
    if (selectedRowKeys.length === 0) {
        message.warning('请先选择要拒回的订单');
        return;
    }
    Modal.confirm({
        title: `确认批量拒回 ${selectedRowKeys.length} 条订单?`,
        content: '拒回后将触发退款流程',
        okType: 'danger',
        onOk: () => {
             setDataSource(dataSource.filter(item => !selectedRowKeys.includes(item.key)));
             setSelectedRowKeys([]);
             message.success('批量拒回成功');
        }
    });
  };

  const { handleExport, exporting, progress } = useExport<ConfirmItemType>({
    filenamePrefix: '平台订单采购确认列表',
    fetchData: () => dataSource,
    columns: [
        { title: '采购单号', dataIndex: 'orderNo' },
        { title: '业务类型', dataIndex: 'orderType', render: (val) => val === 'OrderPurchase' ? '订单采购' : '补货采购' },
        { title: '业务单号', dataIndex: 'bizNo' },
        { title: '三方子订单号', dataIndex: 'thirdPartyNo' },
        { title: '归属项目', dataIndex: 'projectName' },
        { title: '收货人', dataIndex: 'receiver', render: (val) => val.split(' / ')[0] },
        { title: '收货电话', dataIndex: 'receiver', render: (val) => val.split(' / ')[1] || '-' },
        { title: '收货地址', dataIndex: 'address' },
        { title: '成本类型', dataIndex: 'costType', render: (val) => val === 'Platform' ? '平台承担' : '供应商承担' },
        { title: '商品名称', dataIndex: 'productName' },
        { title: '规格', dataIndex: 'specName' },
        { title: '数量', dataIndex: 'quantity' },
        { title: '供应商', dataIndex: 'supplier' },
        { title: '成本单价', dataIndex: 'cost', render: (val) => val.toFixed(2) },
        { title: '成本合计', dataIndex: 'totalCost', render: (val) => val.toFixed(2) },
    ]
  });

  const handleSearch = () => {
    // Mock search logic
    message.success('查询成功');
  };

  // Mock Import Logic
  const handleFileUpload = (file: RcFile) => {
      // 1. Validate File Type
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
      if (!isExcel) {
          message.error('只能上传 Excel 文件!');
          return Upload.LIST_IGNORE;
      }

      setImportLoading(true);
      message.loading({ content: '正在解析文件...', key: 'importProcess' });

      // 2. Simulate Parsing Delay & Logic
      setTimeout(() => {
          // Mock Parsed Data from Excel
          // Assuming the Excel contains: OrderNo, NewCost, NewSupplier
          const mockParsedData = [
              { orderNo: 'ORD20231028001', newCost: 16.50, newSupplier: '晨光文具' }, // Change Cost
              { orderNo: 'ORD20231028002', newCost: 0, newSupplier: '得力集团' }, // No Change
              { orderNo: 'ORD20231028003', newCost: 2.30, newSupplier: '广博股份' }, // Change Cost & Supplier
              { orderNo: 'INVALID_NO', newCost: 10, newSupplier: 'Unknown' } // Error
          ];

          const changes: any[] = [];
          const errors: any[] = [];
          let successCount = 0;

          mockParsedData.forEach(row => {
              const targetItem = dataSource.find(item => item.orderNo === row.orderNo);
              if (targetItem) {
                  // Check for changes
                  const isCostChanged = targetItem.cost !== row.newCost;
                  const isSupplierChanged = targetItem.supplier !== row.newSupplier;

                  if (isCostChanged || isSupplierChanged) {
                      changes.push({
                          key: targetItem.key,
                          orderNo: targetItem.orderNo,
                          productName: targetItem.productName,
                          oldCost: targetItem.cost,
                          newCost: row.newCost,
                          oldSupplier: targetItem.supplier,
                          newSupplier: row.newSupplier,
                          isCostChanged,
                          isSupplierChanged
                      });
                  }
                  successCount++;
              } else {
                  errors.push({
                      rowInfo: row,
                      reason: '找不到对应的采购单号'
                  });
              }
          });

          setImportSummary({
              total: mockParsedData.length,
              success: successCount,
              error: errors.length,
              changes: changes,
              errors: errors
          });

          message.success({ content: '文件解析完成', key: 'importProcess' });
          setImportLoading(false);
          setIsImportModalOpen(true);
      }, 1500);

      return false; // Prevent auto upload
  };

  const confirmBatchImport = () => {
      const newDataSource = [...dataSource];
      importSummary.changes.forEach(change => {
          const index = newDataSource.findIndex(item => item.key === change.key);
          if (index > -1) {
              newDataSource[index] = {
                  ...newDataSource[index],
                  cost: change.newCost,
                  supplier: change.newSupplier,
                  totalCost: change.newCost * newDataSource[index].quantity
              };
          }
      });
      
      setDataSource(newDataSource);
      setIsImportModalOpen(false);
      
      // Log Batch Operation
      console.log('[Operation Log] Batch Import Confirmed:', importSummary);
      
      Modal.success({
          title: '批量导入确认完成',
          content: (
              <div>
                  <p>共处理 {importSummary.total} 条数据</p>
                  <p>成功更新 {importSummary.changes.length} 条采购单信息</p>
                  <p>失败 {importSummary.error} 条</p>
              </div>
          )
      });
  };

  const resetSearch = () => {
    setSearchText({
      supplier: '',
      orderNo: '',
      project: '',
      receiver: '',
      product: '',
      timeRange: null,
      bizNo: '',
      address: '',
    });
  };

  const handleSupplierChange = (key: string, value: string) => {
      const item = dataSource.find(i => i.key === key);
      let newCost = item?.cost || 0;
      
      // Simulate Real-time Sync with Master Data
      if (item && mockMasterDataPrice[item.productName] && mockMasterDataPrice[item.productName][value]) {
          newCost = mockMasterDataPrice[item.productName][value];
          message.info(`已根据主数据自动更新成本价为: ¥${newCost}`);
      }

      const newData = dataSource.map(item => {
          if (item.key === key) {
              return { 
                  ...item, 
                  supplier: value,
                  cost: newCost,
                  totalCost: newCost * item.quantity
              };
          }
          return item;
      });
      setDataSource(newData);
  };

  const handleCostChange = (key: string, value: number | null) => {
      if (value === null || value < 0) {
          message.error('成本价必须为有效数字且大于等于0');
          return;
      }
      const newData = dataSource.map(item => {
          if (item.key === key) {
              return { 
                  ...item, 
                  cost: value,
                  totalCost: value * item.quantity 
              };
          }
          return item;
      });
      setDataSource(newData);
  };

  const handleRestoreDefault = (key: string) => {
      const newData = dataSource.map(item => {
          if (item.key === key) {
              return {
                  ...item,
                  supplier: item.originalSupplier as string,
                  cost: item.originalCost as number,
                  totalCost: (item.originalCost as number) * item.quantity
              };
          }
          return item;
      });
      setDataSource(newData);
      message.info('已恢复默认值');
  };

  const handleConfirm = (key: string) => {
    const item = dataSource.find(i => i.key === key);
    if (!item) return;

    if (item.cost < 0) {
        message.error('提交失败：成本价无效');
        return;
    }

    const isModified = item.cost !== item.originalCost || item.supplier !== item.originalSupplier;
    const confirmContent = (
        <div>
            <p>确认生成采购单吗？</p>
            {isModified && (
                <div style={{ color: '#faad14', fontSize: 12 }}>
                    <p>检测到您修改了以下信息：</p>
                    <ul>
                        {item.supplier !== item.originalSupplier && <li>供应商: {item.originalSupplier} &rarr; {item.supplier}</li>}
                        {item.cost !== item.originalCost && <li>成本价: ¥{item.originalCost} &rarr; ¥{item.cost}</li>}
                    </ul>
                </div>
            )}
        </div>
    );

    Modal.confirm({
        title: '确认提交',
        icon: <ExclamationCircleOutlined />,
        content: confirmContent,
        onOk() {
            // Check concurrency (mock)
            if (Math.random() > 0.95) {
                message.error('该条信息不存在（可能已被处理），请刷新页面');
                return;
            }
            // Log operation
            if (isModified) {
                console.log(`[Operation Log] User modified order ${item.orderNo}: Supplier(${item.originalSupplier} to ${item.supplier}), Cost(${item.originalCost} to ${item.cost})`);
            }
            
            setDataSource(dataSource.filter(item => item.key !== key));
            message.success('已确认生成采购单');
        }
    });
  };

  const handleReject = (key: string) => {
    setDataSource(dataSource.filter(item => item.key !== key));
    message.warning('已拒回，触发退款流程');
  };

  const handleSubWarehouseShip = (record: ConfirmItemType) => {
      setCurrentShipItem(record);
      setSelectedWarehouse(null);
      setSelectedBatches([]);
      setShipModalOpen(true);
  };

  const submitSubWarehouseShip = async () => {
      if (!currentShipItem || !selectedWarehouse || selectedBatches.length === 0) {
          message.error('请完整选择发货仓库和批次');
          return;
      }
      
      // Calculate total shipped qty from selected batches
      let remainingQty = currentShipItem.quantity;
      const orderItems: any[] = [];
      // Respect selection order if possible, or just filter
      // Note: inventory.filter might change order, but usually consistent
      const selectedBatchDetails = inventory.filter(b => selectedBatches.includes(b.batchNo));

      for (const batch of selectedBatchDetails) {
          if (remainingQty <= 0) break;
          const takeQty = Math.min(batch.currentQty, remainingQty);
          orderItems.push({
              productId: currentShipItem.productId || 'P_MOCK',
              skuId: currentShipItem.skuId || 'SKU_MOCK',
              productName: currentShipItem.productName,
              specName: currentShipItem.specName,
              quantity: takeQty,
              batchNo: batch.batchNo
          });
          remainingQty -= takeQty;
      }
      
      if (remainingQty > 0) {
           message.warning(`所选批次库存不足，剩余 ${remainingQty} 未分配`);
           // Add unassigned item
           orderItems.push({
              productId: currentShipItem.productId || 'P_MOCK',
              skuId: currentShipItem.skuId || 'SKU_MOCK',
              productName: currentShipItem.productName,
              specName: currentShipItem.specName,
              quantity: remainingQty,
           });
      }

      const outboundOrder: OutboundOrder = {
          id: Date.now().toString(),
          bizNo: currentShipItem.bizNo,
          warehouseCode: selectedWarehouse,
          status: 'pending', // Pending shipment confirmation by warehouse
          createTime: new Date().toISOString(),
          items: orderItems
      };

      await createOutboundOrder(outboundOrder);
      message.success('已生成分仓出库单');
      setDataSource(dataSource.filter(item => item.key !== currentShipItem.key));
      setShipModalOpen(false);
  };

  // Get available batches for current item and selected warehouse
  const getAvailableBatches = () => {
      if (!currentShipItem || !selectedWarehouse) return [];
      
      return inventory.filter(b => {
          if (b.warehouseCode !== selectedWarehouse) return false;
          
          // Exact match priority
          if (currentShipItem.skuId && b.skuId === currentShipItem.skuId) return true;
          if (currentShipItem.productId && b.productId === currentShipItem.productId) return true;
          
          // Name match fallback
          return b.productName.includes(currentShipItem.productName) || currentShipItem.productName.includes(b.productName);
      });
  };

  const columns: ColumnsType<ConfirmItemType> = [
    { 
      title: '采购单信息', 
      key: 'poInfo', 
      width: '100%',
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          border: '1px solid #e8e8e8', 
          borderRadius: '8px', 
          padding: '0 0 8px 0', 
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          borderLeft: '1px solid #e8e8e8'
        }}>
          {/* Row 1: Header Titles */}
          <Row gutter={16} style={{ background: '#fafafa', padding: '8px', fontWeight: 'bold', borderBottom: '1px solid #f0f0f0' }}>
            <Col span={4}>订单号/业务类型</Col>
            <Col span={4}>业务单号</Col>
            <Col span={3}>三方子订单号</Col>
            <Col span={3}>归属项目</Col>
            <Col span={6}>收货信息</Col>
            <Col span={4}>成本类型</Col>
          </Row>
          {/* Row 2: Header Values */}
          <Row gutter={16} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
            <Col span={4}>
                <Space direction="vertical" size={0}>
                    <Typography.Text copyable>{record.orderNo}</Typography.Text>
                    <Tag color={record.orderType === 'OrderPurchase' ? 'blue' : 'orange'}>
                        {record.orderType === 'OrderPurchase' ? '订单采购' : '补货采购'}
                    </Tag>
                </Space>
            </Col>
            <Col span={4}>
                <Typography.Text>{record.bizNo}</Typography.Text>
            </Col>
            <Col span={3}>
                <Typography.Text>{record.thirdPartyNo}</Typography.Text>
            </Col>
            <Col span={3}>
                <Typography.Text>{record.projectName}</Typography.Text>
            </Col>
            <Col span={6}>
                 <Space direction="vertical" size={0}>
                    <Typography.Text>{record.receiver}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.address}</Typography.Text>
                </Space>
            </Col>
            <Col span={4}>
                <Tag color={record.costType === 'Platform' ? 'blue' : 'green'}>
                    {record.costType === 'Platform' ? '平台承担' : '供应商承担'}
                </Tag>
            </Col>
          </Row>

          {/* Row 3: Product Info (Main Content) */}
          <Row gutter={16} style={{ padding: '8px', alignItems: 'center' }}>
             <Col span={8}>
                <Space>
                    <div style={{ width: 60, height: 60, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Placeholder for Image */}
                        <div style={{ fontSize: 12, color: '#999' }}>IMG</div>
                    </div>
                    <Space direction="vertical" size={0}>
                        <Typography.Text strong>{record.productName}</Typography.Text>
                        <Typography.Text type="secondary">{record.specName}</Typography.Text>
                        {record.isBundleSplit && (
                           <Tag color="purple" style={{ marginTop: 4 }}>
                               套装拆分: {record.bundleInfo?.name}
                           </Tag>
                       )}
                    </Space>
                </Space>
             </Col>
             <Col span={2}>
                 <div style={{ textAlign: 'center' }}>
                     <div style={{ color: '#999', fontSize: 12 }}>数量</div>
                     <div style={{ fontSize: 16 }}>{record.quantity}</div>
                 </div>
             </Col>
             <Col span={8}>
                {/* Supplier & Cost Edit Area */}
                <div style={{ background: '#f9f9f9', padding: 8, borderRadius: 4, border: '1px dashed #d9d9d9' }}>
                    <Row gutter={8} align="middle">
                        <Col span={10}>
                            <Select 
                                value={record.supplier}
                                style={{ width: '100%' }}
                                size="small"
                                placeholder="选择供应商"
                                options={enabledSuppliers}
                                onChange={(val) => handleSupplierChange(record.key, val)}
                            />
                        </Col>
                        <Col span={8}>
                             <InputNumber
                                value={record.cost}
                                prefix="¥"
                                style={{ width: '100%' }}
                                size="small"
                                min={0}
                                precision={2}
                                onChange={(val) => handleCostChange(record.key, val)}
                            />
                        </Col>
                        <Col span={6}>
                            <div style={{ fontSize: 12, color: '#666' }}>
                                合计: <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>¥{record.totalCost.toFixed(2)}</span>
                            </div>
                        </Col>
                    </Row>
                    {/* Restore Button if modified */}
                    {(record.supplier !== record.originalSupplier || record.cost !== record.originalCost) && (
                        <div style={{ marginTop: 4, textAlign: 'right' }}>
                             <Space size="small">
                                 <Typography.Text type="warning" style={{ fontSize: 12 }}>
                                     <ExclamationCircleOutlined /> 已修改 (原: {record.originalSupplier}/¥{record.originalCost})
                                 </Typography.Text>
                                 <Button type="link" size="small" icon={<UndoOutlined />} onClick={() => handleRestoreDefault(record.key)}>恢复</Button>
                             </Space>
                        </div>
                    )}
                </div>
             </Col>
             <Col span={6}>
                 <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                     <Button type="primary" icon={<CheckOutlined />} onClick={() => handleConfirm(record.key)}>确认采购</Button>
                     <Button danger icon={<CloseOutlined />} onClick={() => handleReject(record.key)}>拒回</Button>
                     <Tooltip title="直接从自有仓库发货，生成出库单">
                        <Button type="dashed" icon={<HomeOutlined />} onClick={() => handleSubWarehouseShip(record)}>分仓发货</Button>
                     </Tooltip>
                 </Space>
             </Col>
          </Row>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
        <PageDoc 
            pageTitle="供应链管理 > 采购管理 > 平台待确认订单"
            description="处理来自上游（如销售订单、售后补发）的采购需求。在此环节确认供应商分配、采购成本，并支持自动拆单、合单操作。"
            fields={[
                { name: '供应商', desc: '可修改，修改后若存在主数据协议价将自动关联', type: 'text' },
                { name: '采购成本', desc: '可修改，修改将记录日志', type: 'text' },
                { name: '费用承担', desc: '平台承担或供应商承担（如售后）', type: 'text' }
            ]}
        />
        
        <Card bordered={false}>
            {/* Search Form (Simplified) */}
            <Form layout="inline" style={{ marginBottom: 16 }}>
                <Form.Item label="单号"><Input placeholder="平台单号/业务单号" /></Form.Item>
                <Form.Item label="供应商"><Input placeholder="供应商名称" /></Form.Item>
                <Form.Item>
                    <Button type="primary" onClick={handleSearch}>查询</Button>
                </Form.Item>
                <Form.Item>
                     <Space>
                        <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
                            {exporting ? `导出中 ${progress}%` : '导出待确认清单'}
                        </Button>
                     </Space>
                </Form.Item>
            </Form>

            <Table 
                rowSelection={{ selectedRowKeys, onChange: onSelectChange }}
                columns={columns} 
                dataSource={dataSource} 
                showHeader={false} // Custom Card-like Row
                pagination={{ pageSize: 5 }}
            />

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Space>
                    <Button type="primary" onClick={handleBatchConfirm} disabled={selectedRowKeys.length === 0}>批量确认</Button>
                    <Upload 
                        accept=".xls,.xlsx" 
                        showUploadList={false} 
                        beforeUpload={handleFileUpload}
                    >
                        <Button icon={<ImportOutlined />}>导入文件批量确认</Button>
                    </Upload>
                    <Button danger onClick={handleBatchReject} disabled={selectedRowKeys.length === 0}>批量拒回</Button>
                </Space>
            </div>
        </Card>

        {/* Sub-warehouse Ship Modal */}
        <Modal
            title="分仓直接发货"
            open={shipModalOpen}
            onCancel={() => setShipModalOpen(false)}
            onOk={submitSubWarehouseShip}
        >
            <p>将订单转换为出库单，由自有仓库直接发货。</p>
            <Form layout="vertical">
                <Form.Item label="发货仓库">
                    <Select 
                        options={warehouses.map(w => ({ label: w.name, value: w.code }))}
                        onChange={setSelectedWarehouse}
                        value={selectedWarehouse}
                    />
                </Form.Item>
                {/* Inventory Selection (Simplified) */}
                {selectedWarehouse && (
                     <Form.Item label="库存批次">
                         <Select 
                            mode="multiple"
                            options={getAvailableBatches()
                                .map(i => ({ label: `${i.batchNo} (余${i.currentQty})`, value: i.batchNo }))
                            }
                            onChange={setSelectedBatches}
                            value={selectedBatches}
                         />
                     </Form.Item>
                )}
            </Form>
        </Modal>

        {/* Import Modal */}
        <Modal
            title={importSummary.total > 0 ? "批量导入确认" : "批量导入修改"}
            open={isImportModalOpen}
            onCancel={() => {
                setIsImportModalOpen(false);
                setImportSummary({ total: 0, success: 0, error: 0, changes: [], errors: [] });
            }}
            width={importSummary.total > 0 ? 800 : 520}
            footer={importSummary.total > 0 ? [
                <Button key="cancel" onClick={() => setIsImportModalOpen(false)}>取消</Button>,
                <Button key="submit" type="primary" onClick={confirmBatchImport}>确认变更</Button>
            ] : null}
        >
             {importSummary.total === 0 ? (
                 <div style={{ textAlign: 'center', padding: 20 }}>
                     <Upload.Dragger beforeUpload={handleFileUpload} showUploadList={false}>
                         <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                         <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                         <p className="ant-upload-hint">支持 .xlsx, .xls 格式</p>
                     </Upload.Dragger>
                 </div>
             ) : (
                 <div style={{ marginBottom: 16 }}>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col span={8}>
                            <div style={{ textAlign: 'center', background: '#f0f2f5', padding: 16, borderRadius: 4 }}>
                                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{importSummary.total}</div>
                                <div style={{ color: '#666' }}>总记录数</div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div style={{ textAlign: 'center', background: '#f6ffed', padding: 16, borderRadius: 4, border: '1px solid #b7eb8f' }}>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{importSummary.success}</div>
                                <div style={{ color: '#52c41a' }}>匹配成功</div>
                            </div>
                        </Col>
                        <Col span={8}>
                            <div style={{ textAlign: 'center', background: '#fff1f0', padding: 16, borderRadius: 4, border: '1px solid #ffa39e' }}>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>{importSummary.error}</div>
                                <div style={{ color: '#f5222d' }}>匹配失败</div>
                            </div>
                        </Col>
                    </Row>
                    
                    {importSummary.changes.length > 0 && (
                        <>
                            <Divider>变更预览 ({importSummary.changes.length})</Divider>
                            <Table
                                dataSource={importSummary.changes}
                                size="small"
                                scroll={{ y: 300 }}
                                pagination={false}
                                columns={[
                                    { title: '单号', dataIndex: 'orderNo', width: 150 },
                                    { title: '商品', dataIndex: 'productName' },
                                    { title: '供应商变更', render: (_, r) => r.isSupplierChanged ? <span style={{color: '#faad14'}}>{r.oldSupplier} &rarr; {r.newSupplier}</span> : '-' },
                                    { title: '成本变更', render: (_, r) => r.isCostChanged ? <span style={{color: '#faad14'}}>{r.oldCost} &rarr; {r.newCost}</span> : '-' },
                                ]}
                            />
                        </>
                    )}
                    
                    {importSummary.errors.length > 0 && (
                        <>
                            <Divider style={{ borderColor: '#ffccc7', color: '#f5222d' }}>失败记录 ({importSummary.errors.length})</Divider>
                            <Table
                                dataSource={importSummary.errors}
                                size="small"
                                scroll={{ y: 200 }}
                                pagination={false}
                                rowKey={(r) => r.rowInfo.orderNo}
                                columns={[
                                    { title: '单号', dataIndex: ['rowInfo', 'orderNo'], width: 150 },
                                    { title: '失败原因', dataIndex: 'reason', render: (t) => <span style={{color: '#f5222d'}}>{t}</span> },
                                ]}
                            />
                        </>
                    )}
                 </div>
             )}
        </Modal>
    </div>
  );
};

export default PlatformConfirmList;
