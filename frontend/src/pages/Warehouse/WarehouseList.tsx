import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Modal, Form, Input, Select, message, Tag, Dropdown, MenuProps, Drawer, Statistic, Row, Col, DatePicker, Descriptions } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, AppstoreOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Warehouse, InventoryBatch } from '../../types/warehouse';
import { getWarehouses, saveWarehouse, deleteWarehouse, getInventoryBatches } from '../../services/warehouseService';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';

import { REGION_DATA, getRegionPath } from '../../utils/regionMap';

const WarehouseList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Region Selection State
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [warehouses, batches] = await Promise.all([getWarehouses(), getInventoryBatches()]);
      setData(warehouses);
      setInventory(batches);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: Warehouse) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWarehouse(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const warehouse: Warehouse = {
        id: editingId || Date.now().toString(),
        createTime: editingId ? (data.find(w => w.id === editingId)?.createTime || new Date().toISOString()) : new Date().toISOString(),
        ...values,
      };
      await saveWarehouse(warehouse);
      message.success(editingId ? '更新成功' : '创建成功');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Helper to get stats
  const getWarehouseStats = (code: string) => {
    const batches = inventory.filter(b => b.warehouseCode === code);
    const skuCount = new Set(batches.map(b => b.skuId)).size;
    const totalValue = batches.reduce((sum, b) => sum + (b.currentQty * b.unitCost), 0);
    return { skuCount, totalValue };
  };

  // Menu Actions
  const getActionMenu = (record: Warehouse): MenuProps => ({
    items: [
      {
        key: 'goods',
        label: '分仓商品列表',
        icon: <AppstoreOutlined />,
        onClick: () => {
          navigate(`/supply-chain/warehouse-product?warehouseCode=${record.code}`);
        }
      },
      {
        type: 'divider',
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(record)
      },
      {
        key: 'toggle',
        label: record.status === 'enabled' ? '禁用' : '启用',
        danger: record.status === 'enabled',
        onClick: async () => {
           const updated = { ...record, status: record.status === 'enabled' ? 'disabled' : 'enabled' } as Warehouse;
           await saveWarehouse(updated);
           loadData();
           message.success('状态已更新');
        }
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        icon: <DeleteOutlined />,
        onClick: () => handleDelete(record.id)
      }
    ]
  });

  const columns: ColumnsType<Warehouse> = [
    { title: '库名', dataIndex: 'name', key: 'name' },
    { title: '仓库代码', dataIndex: 'code', key: 'code' },
    { title: '所在地区', key: 'area', render: (_, record) => getRegionPath(record.province, record.city, record.district) },
    { 
        title: '分仓商品数', 
        key: 'skuCount', 
        render: (_, record) => getWarehouseStats(record.code).skuCount 
    },
    { 
        title: '分仓成本合计', 
        key: 'totalValue', 
        render: (_, record) => `¥${getWarehouseStats(record.code).totalValue.toFixed(2)}` 
    },
    { title: '管理员', dataIndex: 'admins', key: 'admins', render: (admins: string[]) => admins.join(', ') },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'enabled' ? 'success' : 'error'}>
          {status === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Dropdown menu={getActionMenu(record)}>
          <Button type="link">
            操作 <DownOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 分仓管理"
        description={`
          **功能说明**：
          1. **仓库列表**：展示所有仓库的基础信息及实时库存统计（商品数、总成本）。
          2. **分仓商品管理**：点击“操作”->“分仓商品列表”查看该仓库下的库存商品及流水记录。
          3. **新增/编辑**：支持创建新仓库或修改现有仓库信息。
          4. **状态管理**：启用/禁用仓库，禁用后不可进行出入库操作。
        `}
        fields={[
          { name: 'skuCount', type: 'Number', desc: '分仓商品SKU总数 (实时)' },
          { name: 'totalValue', type: 'Decimal', desc: '分仓库存总货值 (实时)' },
        ]}
      />
      <Card title="分仓管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增仓库</Button>}>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={editingId ? "编辑仓库" : "新增仓库"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="库名" rules={[{ required: true, message: '请输入库名' }, { max: 30 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="仓库代码" rules={[{ required: true, message: '请输入代码' }]}>
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="province" label="省" rules={[{ required: true }]}>
                <Select 
                  style={{ width: 120 }} 
                  options={REGION_DATA.map(p => ({ label: p.name, value: p.name }))} 
                  onChange={(val) => {
                    setSelectedProvince(val);
                    setSelectedCity('');
                    form.setFieldsValue({ city: undefined, district: undefined });
                  }}
                />
            </Form.Item>
            <Form.Item name="city" label="市" rules={[{ required: true }]}>
                <Select 
                  style={{ width: 120 }} 
                  options={REGION_DATA.find(p => p.name === selectedProvince)?.children?.map(c => ({ label: c.name, value: c.name })) || []}
                  onChange={(val) => {
                    setSelectedCity(val);
                    form.setFieldsValue({ district: undefined });
                  }}
                  disabled={!selectedProvince}
                />
            </Form.Item>
            <Form.Item name="district" label="区" rules={[{ required: true }]}>
                <Select 
                  style={{ width: 120 }} 
                  options={REGION_DATA.find(p => p.name === selectedProvince)?.children?.find(c => c.name === selectedCity)?.children?.map(d => ({ label: d.name, value: d.name })) || []}
                  disabled={!selectedCity}
                />
            </Form.Item>
          </Space>
          <Form.Item 
            name="address" 
            label="详细地址" 
            rules={[
                { required: true, message: '请输入详细地址' },
                { 
                    validator: (_, value) => {
                        if (value && !/\d/.test(value)) { // Simple check for number as "house number" proxy
                            return Promise.reject(new Error('详细地址必须包含门牌号信息'));
                        }
                        return Promise.resolve();
                    }
                }
            ]}
          >
            <Input.TextArea placeholder="请输入详细地址（必须包含门牌号）" />
          </Form.Item>
          <Form.Item name="admins" label="管理员" rules={[{ required: true }]}>
            <Select mode="multiple" options={[{ label: 'Admin1', value: 'admin1' }, { label: 'User2', value: 'user2' }]} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="enabled">
            <Select options={[{ label: '启用', value: 'enabled' }, { label: '禁用', value: 'disabled' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WarehouseList;
