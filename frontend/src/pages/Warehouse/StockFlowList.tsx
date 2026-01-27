import React, { useState } from 'react';
import { Card, Table, Form, Input, Select, Button, DatePicker, Space, Tag, message } from 'antd';
import { SearchOutlined, ExportOutlined } from '@ant-design/icons';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';

const { RangePicker } = DatePicker;

interface StockFlowRecord {
  key: string;
  id: string;
  warehouse: string;
  productName: string;
  specName: string;
  type: 'In' | 'Out';
  quantity: number;
  balance: number;
  relatedBillNo: string;
  createTime: string;
  operator: string;
}

const MOCK_DATA: StockFlowRecord[] = [
  { key: '1', id: 'SF20231027001', warehouse: '杭州中心仓', productName: '无线鼠标', specName: '黑色', type: 'In', quantity: 100, balance: 100, relatedBillNo: 'IN20231027001', createTime: '2023-10-27 10:00:00', operator: '张三' },
  { key: '2', id: 'SF20231027002', warehouse: '杭州中心仓', productName: '无线鼠标', specName: '黑色', type: 'Out', quantity: 20, balance: 80, relatedBillNo: 'OUT20231027001', createTime: '2023-10-27 14:00:00', operator: '李四' },
  { key: '3', id: 'SF20231028001', warehouse: '上海分仓', productName: '机械键盘', specName: '青轴', type: 'In', quantity: 50, balance: 50, relatedBillNo: 'IN20231028001', createTime: '2023-10-28 09:00:00', operator: '王五' },
];

const StockFlowList: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StockFlowRecord[]>(MOCK_DATA);

  const { handleExport, exporting, progress } = useExport<StockFlowRecord>({
    filenamePrefix: '出入库流水',
    fetchData: () => data,
    columns: [
        { title: '流水号', dataIndex: 'id' },
        { title: '仓库', dataIndex: 'warehouse' },
        { title: '商品名称', dataIndex: 'productName' },
        { title: '规格', dataIndex: 'specName' },
        { title: '类型', dataIndex: 'type', render: (val) => val === 'In' ? '入库' : '出库' },
        { title: '变动数量', dataIndex: 'quantity' },
        { title: '结存数量', dataIndex: 'balance' },
        { title: '关联单据', dataIndex: 'relatedBillNo' },
        { title: '操作时间', dataIndex: 'createTime' },
        { title: '操作人', dataIndex: 'operator' },
    ]
  });

  const onFinish = (values: any) => {
    setLoading(true);
    // Mock Search
    setTimeout(() => {
        const filtered = MOCK_DATA.filter(item => {
            if (values.warehouse && item.warehouse !== values.warehouse) return false;
            if (values.product && !item.productName.includes(values.product)) return false;
            if (values.type && item.type !== values.type) return false;
            return true;
        });
        setData(filtered);
        setLoading(false);
        message.success('查询成功');
    }, 500);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 库存管理 > 出入库记录"
        description="查看所有仓库的商品出入库流水记录。"
        fields={[
            { name: 'warehouse', type: 'String', desc: '仓库名称' },
            { name: 'productName', type: 'String', desc: '商品名称' },
            { name: 'type', type: 'Enum', desc: '类型：入库、出库' }
        ]}
      />

      <Card bordered={false}>
        <Form form={form} layout="inline" onFinish={onFinish} style={{ marginBottom: 24 }}>
           <Form.Item name="warehouse" label="仓库">
              <Select style={{ width: 150 }} placeholder="选择仓库" allowClear>
                 <Select.Option value="杭州中心仓">杭州中心仓</Select.Option>
                 <Select.Option value="上海分仓">上海分仓</Select.Option>
                 <Select.Option value="北京分仓">北京分仓</Select.Option>
              </Select>
           </Form.Item>
           <Form.Item name="product" label="商品">
              <Input placeholder="商品名称/编码" />
           </Form.Item>
           <Form.Item name="type" label="类型">
              <Select style={{ width: 120 }} placeholder="出入库类型" allowClear>
                 <Select.Option value="In">入库</Select.Option>
                 <Select.Option value="Out">出库</Select.Option>
              </Select>
           </Form.Item>
           <Form.Item name="date" label="日期">
              <RangePicker />
           </Form.Item>
           <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>查询</Button>
                <Button onClick={() => { form.resetFields(); setData(MOCK_DATA); }}>重置</Button>
                <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
                    {exporting ? `导出中 ${progress}%` : '批量导出'}
                </Button>
              </Space>
           </Form.Item>
        </Form>

        <Table
          dataSource={data}
          loading={loading}
          columns={[
             { title: '流水号', dataIndex: 'id' },
             { title: '仓库', dataIndex: 'warehouse' },
             { title: '商品信息', render: (_, r) => <>{r.productName} <Tag>{r.specName}</Tag></> },
             { title: '类型', dataIndex: 'type', render: (val) => (
                <Tag color={val === 'In' ? 'green' : 'red'}>{val === 'In' ? '入库' : '出库'}</Tag>
             )},
             { title: '变动数量', dataIndex: 'quantity', render: (val, r) => (
                <span style={{ color: r.type === 'In' ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>
                    {r.type === 'In' ? '+' : '-'}{val}
                </span>
             )},
             { title: '结存数量', dataIndex: 'balance' },
             { title: '关联单据', dataIndex: 'relatedBillNo' },
             { title: '操作时间', dataIndex: 'createTime' },
             { title: '操作人', dataIndex: 'operator' },
          ]}
        />
      </Card>
    </div>
  );
};

export default StockFlowList;
