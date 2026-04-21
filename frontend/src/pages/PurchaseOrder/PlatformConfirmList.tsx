import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Tag, Form, Row, Col, message, InputNumber, Select, Tooltip, Typography, Modal, Divider, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, ExportOutlined, UndoOutlined, ExclamationCircleOutlined, ImportOutlined, UploadOutlined, HomeOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import type { RcFile } from 'antd/es/upload/interface';
import { Upload } from 'antd';
import { useExport } from '../../utils/exportUtils';
import { getWarehouses, getInventoryBatches, createOutboundOrder } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { getSuppliers } from '../../services/supplierService';
import { confirmPlatformOrder } from '../../services/purchaseOrderService';
import type { OutboundOrder } from '../../types/warehouse';
import request from '../../utils/request';

interface ConfirmItemType {
  key: string;
  orderNo: string;
  orderType: 'OrderPurchase' | 'Replenishment' | 'Refund' | 'SubOrder';
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
  orderRemark?: string;
  expectedReceiveTime?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

const PlatformConfirmList: React.FC = () => {
  const [dataSource, setDataSource] = useState<ConfirmItemType[]>([]);
  const [originalData, setOriginalData] = useState<ConfirmItemType[]>([]);
  const [loading, setLoading] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<{label: string, value: string}[]>([]);
  const [paginationConfig, setPaginationConfig] = useState({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: false,
    pageSizeOptions: ['10', '50', '100'],
    showTotal: (total: number) => `共 ${total} 条记录`
  });

  // Load data from API
  useEffect(() => {
    const fetchAndGenerateData = async () => {
      setLoading(true);
      try {
        // Fetch active suppliers for dropdown
        const supRes: any = await getSuppliers({ page: 0, size: 1000, status: 'ACTIVE' });
        const suppliers = supRes.content || supRes.records || supRes.data?.content || [];
        setSupplierOptions(suppliers.map((s: any) => ({ label: s.name, value: String(s.id) })));

        // Try to fetch data from API
        try {
          const apiRes: any = await request.get('/platform-pending-orders', { params: { size: 1000, status: 'PENDING' } });
          const records = apiRes?.data?.records || apiRes?.records || [];
          
          if (records.length > 0) {
            const mappedData: ConfirmItemType[] = records.map((item: any, index: number) => ({
              key: String(item.id || index + 1),
              id: item.id,
              orderNo: item.orderNo,
              orderType: item.orderType || 'OrderPurchase',
              bizNo: item.bizNo,
              thirdPartyNo: item.thirdPartyNo,
              platformName: item.platformName,
              platformOrderNo: item.platformOrderNo,
              productName: item.productName,
              specName: item.specName || '-',
              quantity: item.quantity,
              cost: item.cost,
              supplier: item.supplierName || '',
              supplierId: item.supplierId ? String(item.supplierId) : undefined,
              totalCost: item.totalCost,
              receiver: item.receiver,
              address: item.address,
              projectName: item.projectName,
              costType: item.costType || 'Platform',
              originalCost: item.cost,
              originalSupplier: item.supplierName,
              productId: String(item.productId),
              skuId: item.skuId ? String(item.skuId) : undefined,
              expectedReceiveTime: item.expectedReceiveTime,
              orderRemark: item.orderRemark,
            }));
            
            setDataSource(mappedData);
            setOriginalData(mappedData);
            setLoading(false);
            return;
          }
        } catch (apiError) {
          console.log('API not available, falling back to mock data generation', apiError);
        }
        
        // Fallback to mock data generation if API fails or returns empty
        const res: any = await productService.getAll({ page: 0, size: 100, status: 'ON_SHELF' });
        const products = res.data?.records || res.records || [];
        
        // Extract all SKUs
        const allSkus: { product: any, sku: any }[] = [];
        products.forEach((p: any) => {
          if (p.skus && p.skus.length > 0) {
            p.skus.forEach((s: any) => {
              allSkus.push({ product: p, sku: s });
            });
          }
        });

        if (allSkus.length === 0) {
          message.warning('商品池中没有启用的商品规格，无法生成虚拟数据');
          setLoading(false);
          return;
        }

        // 尝试从 sessionStorage 获取已缓存的模拟数据
        const cachedData = sessionStorage.getItem('mockPlatformConfirmData');
        if (cachedData) {
            try {
                const parsedData = JSON.parse(cachedData);
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    // Check if cached data has the new platform fields, if not, patch them
                    const hasPlatformInfo = parsedData[0].platformName !== undefined;
                    
                    if (!hasPlatformInfo) {
                        const platforms = ['得物', '天猫', '京东', '淘宝', '拼多多'];
                        const patchedData = parsedData.map((item, index) => {
                            const platformName = platforms[Math.floor(Math.random() * platforms.length)];
                            const platformOrderNo = `PO${Date.now()}${String(index).padStart(4, '0')}`;
                            const thirdPartyNo = `TP${Date.now()}${String(index).padStart(4, '0')}`; // 独立的三方单号
                            return {
                                ...item,
                                platformName,
                                platformOrderNo,
                                thirdPartyNo: thirdPartyNo // 使用独立的三方单号
                            };
                        });
                        sessionStorage.setItem('mockPlatformConfirmData', JSON.stringify(patchedData));
                        setDataSource(patchedData);
                        setOriginalData(patchedData);
                    } else {
                        setDataSource(parsedData);
                        setOriginalData(parsedData);
                    }
                    
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.error('Failed to parse cached mock data', e);
            }
        }

        const generatedData: ConfirmItemType[] = [];
        let currentOrderNo = `ORD${Date.now()}000`;
        const orderTypes: ('SubOrder' | 'Replenishment' | 'Refund')[] = ['SubOrder', 'Replenishment', 'Refund'];

        for (let i = 0; i < 100; i++) {
          // Change orderNo every 2-3 items to simulate multi-item orders
          if (i > 0 && Math.random() > 0.6) {
            currentOrderNo = `ORD${Date.now()}${String(i).padStart(3, '0')}`;
          }

          const skuObj = allSkus[i % allSkus.length];
          const product = skuObj.product;
          const sku = skuObj.sku;
          
          const qty = Math.floor(Math.random() * 50) + 1;
          const cost = sku.costPrice || 0;
          const totalCost = cost * qty;
          const supplierName = sku.supplier?.name || product.defaultSupplierName || '默认供应商';

          const orderType = i % 2 === 0 ? 'OrderPurchase' : 'Replenishment'; // Randomly assign OrderPurchase or Replenishment for testing
          
          let costType: 'Platform' | 'Supplier' = 'Platform';
          if (orderType === 'Replenishment') {
              costType = Math.random() > 0.7 ? 'Supplier' : 'Platform'; // 30% chance of Supplier for Replenishment
          }

          // Generate mock expectedReceiveTime (1-10 days from now)
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 10) + 1);
          const expectedReceiveTime = futureDate.toISOString().replace('T', ' ').substring(0, 19);

          // Generate mock orderRemark
          const remarks = [
            '加急处理，客户要求包装完好，千万不要破损。',
            '请在工作日配送，周末无人收货。',
            '送货前请提前电话联系。',
            '包含易碎品，请小心轻放。',
            '',
            '',
            ''
          ];
          const orderRemark = remarks[Math.floor(Math.random() * remarks.length)];

          // 补充独立的 bizNo, platformName, platformOrderNo 和 thirdPartyNo
          const platforms = ['得物', '天猫', '京东', '淘宝', '拼多多'];
          const platformName = platforms[Math.floor(Math.random() * platforms.length)];
          const platformOrderNo = `PO${Date.now()}${String(i).padStart(4, '0')}`;
          const thirdPartyNo = `TP${Date.now()}${String(i).padStart(4, '0')}`; // 独立的三方单号
          const bizNo = `BIZ${Date.now()}${String(i).padStart(4, '0')}`;

          generatedData.push({
            key: String(i + 1),
            orderNo: currentOrderNo,
            orderType: orderType,
            bizNo: bizNo,
            thirdPartyNo: thirdPartyNo, // 使用独立的三方单号
            platformName: platformName,
            platformOrderNo: platformOrderNo,
            productName: product.name,
            specName: sku.specification || sku.name || '-',
            quantity: qty,
            cost: cost,
            supplier: supplierName,
            totalCost: totalCost,
            receiver: `用户${i} / 138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
            address: '上海市浦东新区张江高科园区',
            projectName: '日常采购项目',
            costType: costType,
            originalCost: cost,
            originalSupplier: supplierName,
            productId: String(product.id),
            skuId: String(sku.id),
            expectedReceiveTime,
            orderRemark,
          });
        }
        
        setDataSource(generatedData);
        setOriginalData(generatedData);
        // 将新生成的模拟数据存入 sessionStorage，保证当前会话内刷新页面数据不变
        sessionStorage.setItem('mockPlatformConfirmData', JSON.stringify(generatedData));
      } catch (error) {
        console.error('Failed to generate mock data:', error);
        message.error('生成虚拟数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchAndGenerateData();
  }, []);

  // Import Feature State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<{
      total: number;
      success: number;
      error: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changes: any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: any[];
  }>({ total: 0, success: 0, error: 0, changes: [], errors: [] });
  
  // Sub-warehouse Shipment State
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [currentShipItem, setCurrentShipItem] = useState<ConfirmItemType | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [warehouses, setWarehouses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  useEffect(() => {
    // Load warehouse data for sub-warehouse shipment feature
    Promise.all([getWarehouses(), getInventoryBatches()]).then(([whs, inv]) => {
        setWarehouses(whs);
        setInventory(inv);
    });
  }, []);

  const { handleExport, exporting, progress } = useExport<ConfirmItemType>({
    filenamePrefix: '平台订单采购确认列表',
    fetchData: () => dataSource,
    columns: [
        { title: '采购单号', dataIndex: 'orderNo' },
        { title: '采购类型', dataIndex: 'orderType', render: (val) => val === 'OrderPurchase' ? '订单采购' : val === 'SubOrder' ? '子订单' : val === 'Replenishment' ? '补货采购' : val === 'Refund' ? '退款单' : val },
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

  const [form] = Form.useForm();
  const businessTypeVal = Form.useWatch('businessType', form);
  const isSupplierCostDisabled = businessTypeVal && businessTypeVal.length > 0 && !businessTypeVal.includes('Replenishment');

  // Auto clear Supplier cost type if it's disabled
  useEffect(() => {
      if (isSupplierCostDisabled) {
          const currentCostType = form.getFieldValue('costType') || [];
          if (currentCostType.includes('Supplier')) {
              form.setFieldsValue({
                  costType: currentCostType.filter((t: string) => t !== 'Supplier')
              });
              handleSearch();
          }
      }
  }, [isSupplierCostDisabled, form]);
  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      const values = form.getFieldsValue();
      const { orderNo, supplier, businessType, costType, orderRemark, sortOrder } = values;
      
      let filteredData = [...originalData];
      
      if (orderNo) {
          filteredData = filteredData.filter(item => 
              item.orderNo.includes(orderNo) || item.bizNo.includes(orderNo)
          );
      }
      
      if (supplier) {
          filteredData = filteredData.filter(item => 
              item.supplier.includes(supplier)
          );
      }
      
      if (businessType && businessType.length > 0) {
          filteredData = filteredData.filter(item => 
              businessType.includes(item.orderType)
          );
      }

      if (costType && costType.length > 0) {
          filteredData = filteredData.filter(item => 
              costType.includes(item.costType)
          );
      }
      
      if (orderRemark) {
          filteredData = filteredData.filter(item => 
              item.orderRemark && item.orderRemark.includes(orderRemark)
          );
      }

      if (sortOrder === 'receiveTimeAsc') {
          filteredData.sort((a, b) => {
              if (!a.expectedReceiveTime) return 1;
              if (!b.expectedReceiveTime) return -1;
              return a.expectedReceiveTime.localeCompare(b.expectedReceiveTime);
          });
      } else if (sortOrder === 'receiveTimeDesc') {
          filteredData.sort((a, b) => {
              if (!a.expectedReceiveTime) return 1;
              if (!b.expectedReceiveTime) return -1;
              return b.expectedReceiveTime.localeCompare(a.expectedReceiveTime);
          });
      }
      
      setDataSource(filteredData);
      setPaginationConfig(prev => ({ ...prev, current: 1, total: filteredData.length }));
      setLoading(false);
      message.success('查询成功');
    }, 150); // Simulate < 200ms response time
  };

  // Mock Import Logic
  const handleFileUpload = (file: RcFile) => {
      // 1. Validate File Type
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
      if (!isExcel) {
          message.error('只能上传 Excel 文件!');
          return Upload.LIST_IGNORE;
      }

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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const changes: any[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // setImportLoading(false);
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
        async onOk() {
            try {
                // Call backend API
                await confirmPlatformOrder({
                    orderNo: item.orderNo,
                    supplierName: item.supplier,
                    supplierId: item.supplierId ? parseInt(item.supplierId) : undefined,
                    businessType: item.orderType,
                    productId: item.productId ? parseInt(item.productId) : 0,
                    skuId: item.skuId ? parseInt(item.skuId) : 0,
                    specName: item.specName,
                    quantity: item.quantity,
                    cost: item.cost,
                    costType: item.costType,
                    expectedReceiveTime: item.expectedReceiveTime,
                    remark: item.orderRemark,
                    receiver: item.receiver,
                    address: item.address,
                    bizNo: item.bizNo,
                    platformName: item.platformName,
                    platformOrderNo: item.platformOrderNo,
                    thirdPartyNo: item.thirdPartyNo, // 使用独立的三方单号
                    projectName: item.projectName
                });

                // Update UI state
                const newDataSource = dataSource.filter(i => i.key !== key);
                setDataSource(newDataSource);
                
                // Update session storage cache
                sessionStorage.setItem('mockPlatformConfirmData', JSON.stringify(newDataSource));
                
                message.success('已成功生成采购单');
            } catch (error) {
                console.error('Failed to confirm platform order:', error);
                message.error('生成采购单失败');
            }
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
      
      let remainingQty = currentShipItem.quantity;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderItems: any[] = [];
      const selectedBatchDetails = inventory
          .filter(b => selectedBatches.includes(b.batchNo))
          .map(b => ({
              ...b,
              availableForShip: b.availableForShip || (b.currentQty - (b.lockedQty || 0))
          }))
          .sort((a, b) => a.availableForShip - b.availableForShip);

      for (const batch of selectedBatchDetails) {
          if (remainingQty <= 0) break;
          const takeQty = Math.min(batch.availableForShip, remainingQty);
          orderItems.push({
              batchId: batch.id,
              productId: currentShipItem.productId || '',
              skuId: currentShipItem.skuId || '',
              productName: currentShipItem.productName,
              specName: currentShipItem.specName,
              quantity: takeQty,
              unitCost: batch.unitCost,
              batchNo: batch.batchNo
          });
          remainingQty -= takeQty;
      }
      
      if (remainingQty > 0) {
           message.error(`所选批次可发数量不足，还差 ${remainingQty} 件，请重新选择`);
           return;
      }

      try {
          await createOutboundOrder({
              sourceType: 'PURCHASE',
              sourceRefNo: currentShipItem.orderNo,
              warehouseId: selectedWarehouse,
              items: orderItems
          });
          message.success('已生成分仓出库单，库存已冻结');
          setDataSource(dataSource.filter(item => item.key !== currentShipItem.key));
          setShipModalOpen(false);
      } catch (e: any) {
          message.error(e?.response?.data?.message || '生成分仓出库单失败');
      }
  };

  const getAvailableBatches = () => {
      if (!currentShipItem || !selectedWarehouse) return [];
      
      return inventory.filter(b => {
          if (String(b.warehouseId) !== String(selectedWarehouse)) return false;
          const availableForShip = b.availableForShip || (b.currentQty - (b.lockedQty || 0));
          if (availableForShip <= 0) return false;
          
          if (!currentShipItem.productId || String(b.productId) !== String(currentShipItem.productId)) {
              return false;
          }
          
          if (currentShipItem.skuId) {
              return String(b.skuId) === String(currentShipItem.skuId);
          }
          
          if (currentShipItem.specName && b.specName) {
              return currentShipItem.specName === b.specName || 
                     b.specName.includes(currentShipItem.specName) ||
                     currentShipItem.specName.includes(b.specName);
          }
          
          return true;
      });
  };

  const hasAvailableInventory = (record: ConfirmItemType) => {
      if (!inventory || inventory.length === 0) {
          return false;
      }
      
      const warehouseQtyMap: Record<string, number> = {};
      
      inventory.forEach(b => {
          const availableForShip = b.availableForShip || (b.currentQty - (b.lockedQty || 0));
          if (availableForShip <= 0) return;
          
          const invProductId = String(b.productId || '');
          const invSkuId = String(b.skuId || '');
          const recProductId = String(record.productId || '');
          const recSkuId = String(record.skuId || '');
          
          if (invProductId && recProductId && invProductId === recProductId) {
              let isMatch = false;
              
              if (recSkuId && invSkuId) {
                  isMatch = recSkuId === invSkuId;
              } else if (recSkuId && !invSkuId) {
                  isMatch = false;
              } else if (!recSkuId && invSkuId) {
                  isMatch = false;
              } else {
                  if (record.specName && b.specName) {
                      isMatch = record.specName === b.specName || 
                                b.specName.includes(record.specName) ||
                                record.specName.includes(b.specName);
                  } else {
                      isMatch = true;
                  }
              }
              
              if (isMatch) {
                  const wCode = b.warehouseCode;
                  warehouseQtyMap[wCode] = (warehouseQtyMap[wCode] || 0) + availableForShip;
              }
          }
      });
      
      return Object.values(warehouseQtyMap).some(totalQty => totalQty >= record.quantity);
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
            <Col span={3}>订单号/采购类型</Col>
            <Col span={3}>业务单号</Col>
            <Col span={3}>三方信息</Col>
            <Col span={3}>期望收货时间</Col>
            <Col span={4}>收货信息</Col>
            <Col span={4}>订单备注</Col>
            <Col span={2}>归属项目</Col>
            <Col span={2}>成本承担方</Col>
          </Row>
          {/* Row 2: Header Values */}
          <Row gutter={16} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
            <Col span={3}>
                <Space direction="vertical" size={0}>
                    <Typography.Text copyable>{record.orderNo}</Typography.Text>
                    <Tag color={record.orderType === 'OrderPurchase' ? 'blue' : 'orange'}>
                        {record.orderType === 'OrderPurchase' ? '订单采购' : '补货采购'}
                    </Tag>
                </Space>
            </Col>
            <Col span={3}>
                <Typography.Text copyable>{record.bizNo}</Typography.Text>
            </Col>
            <Col span={3}>
                <Space direction="vertical" size={0}>
                    <Typography.Text>{record.platformName}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.platformOrderNo}</Typography.Text>
                </Space>
            </Col>
            <Col span={3}>
                <Typography.Text>{record.expectedReceiveTime || '-'}</Typography.Text>
            </Col>
            <Col span={4}>
                 <Space direction="vertical" size={0} style={{ maxWidth: '100%' }}>
                    <Typography.Text>{record.receiver}</Typography.Text>
                    <Tooltip title={record.address}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis={true}>
                            {record.address}
                        </Typography.Text>
                    </Tooltip>
                </Space>
            </Col>
            <Col span={4}>
                <Tooltip title={record.orderRemark || '无备注'} placement="topLeft">
                    <div style={{ 
                        fontSize: 12, 
                        color: '#666',
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-all',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        maxHeight: '36px'
                    }}>
                        {record.orderRemark || '-'}
                    </div>
                </Tooltip>
            </Col>
            <Col span={2}>
                <Typography.Text>{record.projectName}</Typography.Text>
            </Col>
            <Col span={2}>
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
                                showSearch
                                value={record.supplier}
                                style={{ width: '100%' }}
                                size="small"
                                placeholder="选择供应商"
                                options={supplierOptions}
                                filterOption={(input, option) =>
                                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
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
                 <Space style={{ width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                     <Button type="primary" icon={<CheckOutlined />} onClick={() => handleConfirm(record.key)}>确认采购</Button>
                     <Button danger icon={<CloseOutlined />} onClick={() => handleReject(record.key)}>拒回</Button>
                     {record.costType === 'Platform' && 
                      (record.orderType === 'OrderPurchase' || record.orderType === 'Replenishment') && 
                      hasAvailableInventory(record) && (
                         <Tooltip title="直接从自有仓库发货，生成出库单">
                            <Button icon={<HomeOutlined />} onClick={() => handleSubWarehouseShip(record)}>分仓发货</Button>
                         </Tooltip>
                     )}
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
        
        <SearchFormLayout onSearch={handleSearch} onReset={() => { form.resetFields(); handleSearch(); }} form={form}>
            <Form.Item name="orderNo" label="单号" style={{ marginBottom: 0 }}>
               <Input placeholder="平台单号/业务单号" allowClear />
            </Form.Item>
            <Form.Item name="supplier" label="供应商" style={{ marginBottom: 0 }}>
               <Input placeholder="供应商名称" allowClear />
            </Form.Item>
            <Form.Item name="businessType" label="采购类型" style={{ marginBottom: 0 }}>
                <Select
                    mode="multiple"
                    placeholder="请选择采购类型"
                     allowClear
                     options={[
                         { label: '订单采购', value: 'OrderPurchase' },
                         { label: '补货采购', value: 'Replenishment' }
                     ]}
                 />
             </Form.Item>
             <Form.Item name="costType" label="成本类型" style={{ marginBottom: 0 }}>
                 <Select
                     mode="multiple"
                     placeholder="请选择成本类型"
                     allowClear
                     options={[
                         { label: '平台承担', value: 'Platform' },
                         { 
                             label: '供应商承担', 
                             value: 'Supplier',
                             disabled: isSupplierCostDisabled,
                             title: isSupplierCostDisabled ? '仅补货采购支持供应商承担' : undefined
                         }
                     ]}
                 />
             </Form.Item>
             <Form.Item name="orderRemark" label="订单备注" style={{ marginBottom: 0 }}>
                <Input placeholder="模糊搜索备注信息" allowClear />
             </Form.Item>
             <Form.Item name="sortOrder" label="排序方式" style={{ marginBottom: 0 }}>
                 <Select
                     placeholder="默认排序"
                     allowClear
                     options={[
                         { label: '期望收货时间升序', value: 'receiveTimeAsc' },
                         { label: '期望收货时间降序', value: 'receiveTimeDesc' }
                     ]}
                 />
             </Form.Item>
        </SearchFormLayout>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
             <Space>
                <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
                    {exporting ? `导出中 ${progress}%` : '导出待确认清单'}
                </Button>
                <Upload 
                    accept=".xls,.xlsx" 
                    showUploadList={false} 
                    beforeUpload={handleFileUpload}
                >
                    <Button icon={<ImportOutlined />}>导入文件批量确认</Button>
                </Upload>
             </Space>
        </div>

        <Card variant="borderless">
            <Table 
                columns={columns} 
                dataSource={dataSource} 
                loading={loading}
                showHeader={false} // Custom Card-like Row
                scroll={{ x: 1200 }}
                pagination={{
                    ...paginationConfig,
                    onChange: (page, pageSize) => {
                        setPaginationConfig(prev => ({
                            ...prev,
                            current: page,
                            pageSize: pageSize
                        }));
                    }
                }}
            />
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
                        options={warehouses
                            .filter(w => {
                                if (!currentShipItem) return false;
                                
                                // Calculate total available inventory for this specific warehouse
                                let totalAvailableQty = 0;
                                inventory.forEach(b => {
                                     if (b.warehouseCode !== w.code) return;
                                     if (b.currentQty <= 0) return;
                                     if (currentShipItem.productId && String(b.productId) === String(currentShipItem.productId)) {
                                          let isMatch = true;
                                          if (currentShipItem.skuId && String(b.skuId) !== String(currentShipItem.skuId)) {
                                              if (!(currentShipItem.specName && b.specName && (currentShipItem.specName === b.specName || b.specName.includes(currentShipItem.specName)))) {
                                                  isMatch = false;
                                              }
                                          }
                                          if (isMatch) {
                                              totalAvailableQty += b.currentQty;
                                          }
                                     }
                                 });
                                 
                                 // Only show warehouse if its total inventory can fulfill the order
                                 return totalAvailableQty >= currentShipItem.quantity;
                            })
                            .map(w => ({ label: w.name, value: w.id }))}
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
                                .map(i => { 
                                    const availableForShip = i.availableForShip || (i.currentQty - (i.lockedQty || 0));
                                    return {
                                        label: `${i.batchNo} (可发${availableForShip}, 单价¥${i.unitCost?.toFixed(2) || '0.00'})`, 
                                        value: i.batchNo 
                                    };
                                })
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
