import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Modal, Form, Input, Select, message, Breadcrumb, DatePicker, Row, Col } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getWarehouses, getInventoryBatches, getWarehouseNameMap } from '../../services/warehouseService';
import { Warehouse, InventoryBatch } from '../../types/warehouse';
import type { ColumnsType } from 'antd/es/table';

const WarehouseProductList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialWarehouseCode = searchParams.get('warehouseCode');

  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({});
  
  // Filters
  const [filters, setFilters] = useState({
      warehouseCode: initialWarehouseCode || undefined,
      productName: '',
      specName: ''
  });

  // Batch Modal States
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [currentBatchProduct, setCurrentBatchProduct] = useState<any | null>(null);
  const [batchFilter, setBatchFilter] = useState<{ batchNo?: string, dateRange?: any }>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [whs, batches, whMap] = await Promise.all([getWarehouses(), getInventoryBatches(), getWarehouseNameMap()]);
      setWarehouses(whs);
      setInventory(batches);
      setWarehouseMap(whMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
      if (initialWarehouseCode) {
          setFilters(prev => ({ ...prev, warehouseCode: initialWarehouseCode }));
      }
  }, [initialWarehouseCode]);

  // Aggregate Inventory
  const getAggregatedData = () => {
      const filteredBatches = inventory.filter(b => {
          if (filters.warehouseCode && b.warehouseCode !== filters.warehouseCode) return false;
          if (filters.productName && !b.productName.includes(filters.productName)) return false;
          if (filters.specName && !b.specName.includes(filters.specName)) return false;
          return true;
      });

      const goodsMap = new Map();
      filteredBatches.forEach(b => {
          const key = `${b.warehouseCode}_${b.skuId}`;
          if (!goodsMap.has(key)) {
              const whName = warehouseMap[b.warehouseCode] || b.warehouseCode;
              goodsMap.set(key, {
                  key: key,
                  warehouseCode: b.warehouseCode,
                  warehouseName: whName,
                  productName: b.productName,
                  specName: b.specName,
                  qty: 0,
                  totalValue: 0,
                  skuId: b.skuId,
                  unitCost: b.unitCost // approximate
              });
          }
          const item = goodsMap.get(key);
          item.qty += b.currentQty;
          item.totalValue += b.currentQty * b.unitCost;
      });
      return Array.from(goodsMap.values());
  };

  const columns: ColumnsType<any> = [
      { title: '仓库', dataIndex: 'warehouseName' },
      { title: '商品名称', dataIndex: 'productName' },
      { title: '规格名称', dataIndex: 'specName' },
      { title: '库存数量', dataIndex: 'qty' },
      { title: '成本合计', dataIndex: 'totalValue', render: (val) => `¥${val.toFixed(2)}` },
      { 
          title: '操作', 
          render: (_, record) => (
            <Space>
              <Button type="link" onClick={() => {
                  navigate(`/supply-chain/stock-flow?productName=${encodeURIComponent(record.productName)}&warehouseName=${encodeURIComponent(record.warehouseName)}`);
              }}>
                  出入库记录
              </Button>
              <Button type="link" onClick={() => {
                  setCurrentBatchProduct(record);
                  setBatchModalOpen(true);
              }}>
                  查看批次
              </Button>
            </Space>
          ) 
      }
  ];

  return (
    <div style={{ padding: 24 }}>
        <PageDoc 
            pageTitle="仓储管理 > 分仓商品列表"
            description="查询各分仓的实时商品库存及批次信息。"
        />
        <Breadcrumb style={{ marginBottom: 16 }} items={[
            { title: '仓储管理' },
            { title: <a onClick={() => navigate('/supply-chain/warehouse')}>分仓管理</a> },
            { title: '分仓商品列表' }
        ]} />

        <Card bordered={false}>
            <Form layout="inline" style={{ marginBottom: 16 }}>
                <Form.Item label="仓库">
                    <Select 
                        style={{ width: 150 }} 
                        allowClear
                        placeholder="全部仓库"
                        value={filters.warehouseCode}
                        onChange={v => setFilters({...filters, warehouseCode: v})}
                        options={warehouses.map(w => ({ label: w.name, value: w.code }))}
                    />
                </Form.Item>
                <Form.Item label="商品名称">
                    <Input 
                        placeholder="请输入" 
                        value={filters.productName}
                        onChange={e => setFilters({...filters, productName: e.target.value})}
                    />
                </Form.Item>
                <Form.Item label="规格">
                    <Input 
                        placeholder="请输入" 
                        value={filters.specName}
                        onChange={e => setFilters({...filters, specName: e.target.value})}
                    />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" onClick={() => loadData()}>查询</Button>
                    <Button style={{ marginLeft: 8 }} onClick={() => setFilters({ warehouseCode: undefined, productName: '', specName: '' })}>重置</Button>
                </Form.Item>
            </Form>

            <Table 
                columns={columns} 
                dataSource={getAggregatedData()} 
                rowKey="key"
                loading={loading}
            />
        </Card>

        {/* Batch List Modal */}
        <Modal
            title={`库存批次 - ${currentBatchProduct?.productName} (${currentBatchProduct?.warehouseName})`}
            width={800}
            open={batchModalOpen}
            footer={null}
            onCancel={() => setBatchModalOpen(false)}
        >
            <Space style={{ marginBottom: 16 }}>
                <Input 
                placeholder="批次号" 
                onChange={e => setBatchFilter({...batchFilter, batchNo: e.target.value})} 
                />
                <DatePicker.RangePicker 
                    placeholder={['有效期起', '有效期止']}
                    onChange={dates => setBatchFilter({...batchFilter, dateRange: dates})}
                />
                <Button type="primary">查询</Button>
            </Space>
            <Table 
                size="small"
                rowKey="batchNo"
                dataSource={
                inventory.filter(b => {
                    if (!currentBatchProduct) return false;
                    if (b.skuId !== currentBatchProduct.skuId || b.warehouseCode !== currentBatchProduct.warehouseCode) return false;
                    if (batchFilter.batchNo && !b.batchNo.includes(batchFilter.batchNo)) return false;
                    return true;
                })
                }
                columns={[
                { title: '批次号', dataIndex: 'batchNo' },
                { title: '入库时间', dataIndex: 'inboundTime', render: t => t.split('T')[0] },
                { title: '有效期至', dataIndex: 'expiryDate' },
                { title: '剩余库存', dataIndex: 'currentQty' },
                { title: '入库成本', dataIndex: 'unitCost', render: v => `¥${v.toFixed(2)}` },
                ]}
            />
        </Modal>
    </div>
  );
};

export default WarehouseProductList;
