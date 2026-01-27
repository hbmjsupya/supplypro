import React, { useState, useEffect } from 'react';
import { Table, Card, Tabs, Button, DatePicker, Space, Statistic, Row, Col, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getInboundOrders, getOutboundOrders, getInventoryBatches, getWarehouseNameMap } from '../../services/warehouseService';
import PageDoc from '../../components/PageDoc';

const { RangePicker } = DatePicker;

const InventoryReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [inbound, setInbound] = useState<any[]>([]);
  const [outbound, setOutbound] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [inv, inb, out, whMap] = await Promise.all([
        getInventoryBatches(),
        getInboundOrders(),
        getOutboundOrders(),
        getWarehouseNameMap()
      ]);
      setInventory(inv);
      setInbound(inb);
      setOutbound(out);
      setWarehouseMap(whMap);
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- Calculations ---
  
  // Product Dimension Stats
  const productStats = inventory.reduce((acc: any, batch: any) => {
      if (!acc[batch.skuId]) {
          acc[batch.skuId] = {
              skuId: batch.skuId,
              productName: batch.productName,
              specName: batch.specName,
              currentQty: 0,
              totalValue: 0,
          };
      }
      acc[batch.skuId].currentQty += batch.currentQty;
      acc[batch.skuId].totalValue += batch.currentQty * batch.unitCost;
      return acc;
  }, {});
  const productData = Object.values(productStats);

  // Warehouse Dimension Stats
  const warehouseStats = inventory.reduce((acc: any, batch: any) => {
      if (!acc[batch.warehouseCode]) {
          acc[batch.warehouseCode] = {
              warehouseCode: batch.warehouseCode,
              totalQty: 0,
              totalValue: 0,
          };
      }
      acc[batch.warehouseCode].totalQty += batch.currentQty;
      acc[batch.warehouseCode].totalValue += batch.currentQty * batch.unitCost;
      return acc;
  }, {});
  const warehouseData = Object.values(warehouseStats);


  const handleExport = () => {
      // Mock export
      console.log('Exporting data...');
      message.success('导出Excel成功');
  };

  const productColumns = [
    { title: '商品名称', dataIndex: 'productName', key: 'productName' },
    { title: '规格', dataIndex: 'specName', key: 'specName' },
    { title: '当前库存', dataIndex: 'currentQty', key: 'currentQty' },
    { title: '库存货值', dataIndex: 'totalValue', key: 'totalValue', render: (val: number) => `¥${val.toFixed(2)}` },
  ];

  const warehouseColumns = [
    { 
        title: '仓库', 
        dataIndex: 'warehouseCode', 
        key: 'warehouseCode',
        render: (code: string) => warehouseMap[code] || code
    },
    { title: '总库存量', dataIndex: 'totalQty', key: 'totalQty' },
    { title: '总资产货值', dataIndex: 'totalValue', key: 'totalValue', render: (val: number) => `¥${val.toFixed(2)}` },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 库存报表"
        description={`
          **功能说明**：
          1. **多维度统计**：
             - **商品维度**：按SKU聚合，展示全网总库存及总货值。
             - **仓库维度**：按仓库聚合，展示各仓库的库存总量及资产分布。
          2. **关键指标 (KPI)**：
             - 顶部展示“总库存货值”、“涉及SKU数”、“活跃仓库数”等核心运营指标。
          3. **数据导出**：支持将当前统计结果导出为Excel文件，便于线下分析。
          4. **实时性**：基于当前实时库存批次数据计算，确保数据的准确性。
        `}
        fields={[
          { name: 'skuId', type: 'String', desc: '商品SKU' },
          { name: 'productName', type: 'String', desc: '商品名称' },
          { name: 'currentQty', type: 'Number', desc: '当前库存量' },
          { name: 'totalValue', type: 'Decimal', desc: '库存货值 (Quantity * UnitCost)' },
          { name: 'warehouseCode', type: 'String', desc: '仓库代码' },
        ]}
      />
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="总库存货值" value={productData.reduce((sum: number, p: any) => sum + p.totalValue, 0)} precision={2} prefix="¥" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="涉及SKU数" value={productData.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="活跃仓库数" value={warehouseData.length} />
          </Card>
        </Col>
      </Row>

      <Card 
        title="库存统计报表" 
        extra={
            <Space>
                <RangePicker />
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
            </Space>
        }
      >
        <Tabs items={[
            {
                key: '1',
                label: '商品维度',
                children: <Table columns={productColumns} dataSource={productData} rowKey="skuId" loading={loading} />
            },
            {
                key: '2',
                label: '仓库维度',
                children: <Table columns={warehouseColumns} dataSource={warehouseData} rowKey="warehouseCode" loading={loading} />
            }
        ]} />
      </Card>
    </div>
  );
};

export default InventoryReport;
