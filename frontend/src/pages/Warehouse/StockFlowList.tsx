import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Form, Input, Select, Button, DatePicker, Space, Tag, message } from 'antd';
import { SearchOutlined, ExportOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import { useExport } from '../../utils/exportUtils';
import { getStockFlows } from '../../services/warehouseService';

import { useSearchParams } from 'react-router-dom';

const { RangePicker } = DatePicker;

interface StockFlowRecord {
  key: string;
  id: string;
  warehouse: string;
  productName: string;
  specName: string;
  type: string;
  quantity: number;
  relatedBillNo: string;
  createTime: string;
  operator: string;
  costChange: number | null;
  balanceQuantity: number;
  balanceCost: number;
  unitCost: number | null;
  totalCost: number | null;
  [key: string]: unknown;
}

interface StockFlowFilter {
  warehouseName?: string;
  productName?: string;
  type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  date?: any;
}

const StockFlowList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StockFlowRecord[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    // Initialize form with URL parameters if present
    const warehouseName = searchParams.get('warehouseName');
    const productName = searchParams.get('productName');
    const specName = searchParams.get('specName');
    
    if (warehouseName || productName || specName) {
      form.setFieldsValue({
        warehouseName: warehouseName || undefined,
        productName: productName || undefined,
        specName: specName || undefined
      });
    }
  }, [searchParams, form]);

  const loadData = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params: any = {
        page: page - 1,
        size: pageSize,
        warehouseName: values.warehouseName,
        productName: values.productName,
        specName: values.specName,
        type: values.type
      };
      
      if (values.date && values.date.length === 2) {
        params.startDate = values.date[0].format('YYYY-MM-DD');
        params.endDate = values.date[1].format('YYYY-MM-DD');
      }

      const res = await getStockFlows(params);
      
      const formattedData: StockFlowRecord[] = res.records.map((item: any) => ({
        key: String(item.id),
        id: String(item.id),
        warehouse: item.warehouse?.name || '-',
        productName: item.product?.name || '-',
        specName: (item.specName && item.specName !== '-') ? item.specName : (item.sku?.specification || item.product?.specification || '-'),
        type: item.flowType,
        quantity: item.quantity,
        relatedBillNo: item.flowType === 'COST_ADJUSTMENT' ? (item.relatedSheetNo || item.referenceNo || '-') : (item.referenceNo || '-'),
        createTime: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-',
        operator: item.operator || '-',
        costChange: item.costChange || null,
        balanceQuantity: item.balanceAfter || 0,
        balanceCost: item.balanceCost || 0,
        unitCost: item.unitCost || null,
        totalCost: item.totalCost || null,
      }));
      
      setData(formattedData);
      setPagination(prev => ({ ...prev, current: page, pageSize, total: res.total }));
    } catch (error) {
      console.error('Failed to load stock flows:', error);
      message.error('加载流水数据失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { handleExport, exporting, progress } = useExport<StockFlowRecord> ({
    filenamePrefix: '仓库商品变动记录',
    fetchData: () => data,
    columns: [
        { title: '流水号', dataIndex: 'id' },
        { title: '仓库', dataIndex: 'warehouse' },
        { title: '商品名称', dataIndex: 'productName' },
        { title: '规格', dataIndex: 'specName' },
        { title: '类型', dataIndex: 'type', render: (val) => {
          if (val === 'COST_ADJUSTMENT') return '调价';
          if (val === 'INBOUND') return '入库';
          if (val === 'OUTBOUND') return '出库';
          if (val === 'ADJUSTMENT_IN') return '盘盈';
          if (val === 'ADJUSTMENT_OUT') return '盘亏';
          if (val === 'RETURN_IN') return '退货入库';
          return val;
        }},
        { title: '变动数量', dataIndex: 'quantity', render: (val, r) => {
          if (r.type === 'COST_ADJUSTMENT') return '-';
          return val;
        }},
        { title: '成本变动', dataIndex: 'costChange', render: (val) => val ? `¥${val.toFixed(2)}` : '-' },
        { title: '结存数量', dataIndex: 'balanceQuantity' },
        { title: '结存商品成本', dataIndex: 'balanceCost', render: (val) => val ? `¥${val.toFixed(2)}` : '¥0.00' },
        { title: '关联单据', dataIndex: 'relatedBillNo' },
        { title: '操作时间', dataIndex: 'createTime' },
        { title: '操作人', dataIndex: 'operator' },
    ]
  });

  const onFinish = () => {
    loadData(1, pagination.pageSize);
  };

  const handleTableChange = (newPagination: any) => {
    loadData(newPagination.current, newPagination.pageSize);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 库存管理 > 仓库商品变动记录"
        description="查看所有仓库的商品变动记录，包括入库、出库、调价等操作。"
        fields={[
            { name: 'warehouse', type: 'String', desc: '仓库名称' },
            { name: 'productName', type: 'String', desc: '商品名称' },
            { name: 'type', type: 'Enum', desc: '类型：入库、出库' },
            { name: 'costChange', type: 'Decimal', desc: '成本变动金额，正数表示成本增加，负数表示成本减少' }
        ]}
      />

      <SearchFormLayout onFinish={onFinish} onReset={() => { form.resetFields(); onFinish(); }} form={form}>
         <Form.Item name="warehouseName" label="仓库" style={{ marginBottom: 0 }}>
            <Input placeholder="仓库名称" allowClear />
         </Form.Item>
         <Form.Item name="productName" label="商品" style={{ marginBottom: 0 }}>
            <Input placeholder="商品名称" allowClear />
         </Form.Item>
         <Form.Item name="specName" label="规格" style={{ marginBottom: 0 }}>
            <Input placeholder="商品规格" allowClear />
         </Form.Item>
         <Form.Item name="type" label="类型" style={{ marginBottom: 0 }}>
            <Select placeholder="全部" allowClear>
               <Select.Option value="INBOUND">入库</Select.Option>
               <Select.Option value="OUTBOUND">出库</Select.Option>
               <Select.Option value="COST_ADJUSTMENT">调价</Select.Option>
               <Select.Option value="ADJUSTMENT_IN">盘盈</Select.Option>
               <Select.Option value="ADJUSTMENT_OUT">盘亏</Select.Option>
               <Select.Option value="RETURN_IN">退货入库</Select.Option>
            </Select>
         </Form.Item>
         <Form.Item name="date" label="时间" style={{ marginBottom: 0 }}>
            <RangePicker style={{ width: '100%' }} />
         </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
         <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
             {exporting ? `导出中 ${progress}%` : '批量导出'}
         </Button>
      </div>

      <Card variant="borderless">

        <Table
          dataSource={data}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={handleTableChange}
          columns={[
             { title: '流水号', dataIndex: 'id' },
             { title: '仓库', dataIndex: 'warehouse' },
             { title: '商品信息', render: (_, r) => (
                <>
                  {r.productName}
                  {r.specName && r.specName !== '-' && <Tag style={{ marginLeft: 8 }}>{r.specName}</Tag>}
                </>
             ) },
             { title: '类型', dataIndex: 'type', render: (val) => {
                if (val === 'COST_ADJUSTMENT') {
                  return <Tag color="purple">调价</Tag>;
                }
                if (val === 'RETURN_IN') {
                  return <Tag color="green">退货入库</Tag>;
                }
                const isIn = val === 'INBOUND' || val === 'ADJUSTMENT_IN';
                return <Tag color={isIn ? 'green' : 'red'}>{isIn ? '入库' : '出库'}</Tag>;
             }},
             { title: '变动数量', dataIndex: 'quantity', render: (val, r) => {
                if (r.type === 'COST_ADJUSTMENT') {
                  return <span style={{ color: '#999' }}>-</span>;
                }
                const isIn = r.type === 'INBOUND' || r.type === 'ADJUSTMENT_IN' || r.type === 'RETURN_IN';
                return (
                  <span style={{ color: isIn ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>
                      {isIn ? '+' : '-'}{Math.abs(val)}
                  </span>
                );
             }},
             { 
               title: '成本变动', 
               dataIndex: 'costChange', 
               render: (val: number | null) => {
                 if (val === null || val === undefined || val === 0) return '-';
                 const isPositive = val > 0;
                 return (
                   <span style={{ 
                     color: isPositive ? '#52c41a' : '#ff4d4f', 
                     fontWeight: 'bold' 
                   }}>
                     {isPositive ? '+' : ''}¥{val.toFixed(2)}
                   </span>
                 );
               }
             },
             { 
               title: '结存数量', 
               dataIndex: 'balanceQuantity', 
               render: (val) => <span style={{ fontWeight: 'bold' }}>{val || 0}</span>
             },
             { 
               title: '结存商品成本', 
               dataIndex: 'balanceCost', 
               render: (val) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>¥{val ? val.toFixed(2) : '0.00'}</span>
             },
             { title: '关联单据', dataIndex: 'relatedBillNo', render: (val, r) => {
                if (!val || val === '-') return val;
                
                let url = '';
                if (val.startsWith('RC')) {
                  url = `/supply-chain/price-adjustment/detail/${val}`;
                } else if (val.startsWith('IN')) {
                  url = `/supply-chain/inbound?inboundNo=${val}`;
                } else if (val.startsWith('OUT')) {
                  url = `/supply-chain/outbound?bizNo=${val}`;
                } else if (val.startsWith('PO') || val.startsWith('C')) {
                  url = `/supply-chain/purchase-order?keyword=${val}`;
                }

                return url ? (
                  <a onClick={() => window.open(url, '_blank')} style={{ cursor: 'pointer' }}>
                    {val}
                  </a>
                ) : val;
             }},
             { title: '操作时间', dataIndex: 'createTime' },
             { title: '操作人', dataIndex: 'operator' },
          ]}
        />
      </Card>
    </div>
  );
};

export default StockFlowList;
