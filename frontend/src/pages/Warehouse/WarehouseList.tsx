import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Modal, Form, Input, Select, message, Tag, Dropdown, Cascader, DatePicker, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Warehouse, InventoryBatch } from '../../types/warehouse';
import { getWarehouses, saveWarehouse, deleteWarehouse, getInventoryBatches, getNextWarehouseCode, updateWarehouseStatus } from '../../services/warehouseService';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import request from '../../utils/request';
import dayjs from 'dayjs';

import WarehouseSearch from './components/WarehouseSearch';

const { RangePicker } = DatePicker;

const WarehouseList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  
  // New States
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [addressOptions, setAddressOptions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [previewCode, setPreviewCode] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchParams, setSearchParams] = useState<any>({});

  // Load Address Data
  useEffect(() => {
    fetch('/data/china_regions.json')
      .then(res => res.json())
      .then(data => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transform = (node: any) => ({
          value: node.code || node.name,
          label: node.name,
          children: node.children ? node.children.map(transform) : undefined
        });
        setAddressOptions(data.map(transform));
      })
      .catch(e => console.error("Failed to load regions", e));
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = { size: 20, ...searchParams }; 
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }
      
      // Transform search params
      if (params.region && params.region.length > 0) {
          params.provinceCode = params.region[0];
          params.cityCode = params.region[1];
          params.districtCode = params.region[2];
          delete params.region;
      }
      if (params.productKeyword && Array.isArray(params.productKeyword)) {
          // Take the first one for now as backend supports single keyword
          if(params.productKeyword.length > 0) params.productKeyword = params.productKeyword[0];
      }
      if (params.statuses && Array.isArray(params.statuses)) {
          params.statuses = params.statuses.join(',');
      }

      const [warehouses, batches] = await Promise.all([getWarehouses(params), getInventoryBatches()]);
      setData(warehouses);
      setInventory(batches);
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange, searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchUsers = async (username: string) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await request.get('/users/list', { params: { username, size: 20 } });
        const users = res.content || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUserOptions(users.map((u: any) => ({ label: u.username, value: u.id })));
    } catch (e) {
        console.error(e);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAdd = async (_e: React.MouseEvent) => {
    setEditingId(null);
    form.resetFields();
    // Default Status is Active (hidden in form)
    // Fetch Next Code
    const code = await getNextWarehouseCode();
    setPreviewCode(code);
    form.setFieldValue('code', code); // Hidden or ReadOnly
    setIsModalOpen(true);
    fetchUsers(''); // Load initial users
  };

  const handleEdit = async (record: Warehouse) => {
    setEditingId(record.id);
    
    try {
        // Fetch detail to get managerIds and full info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await request.get(`/warehouses/${record.id}`);
        const detail = res; // Interceptor already unwraps response.data
        
        // Construct region array from codes or names
        // Prefer codes if available for Cascader
        const region = [
            detail.provinceCode || detail.province, 
            detail.cityCode || detail.city, 
            detail.districtCode || detail.district
        ].filter(Boolean);
        
        // Pre-populate user options with existing managers so they display correctly
        if(detail.managers) {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             setUserOptions(detail.managers.map((m: any) => ({ label: m.username, value: m.id })));
        }

        form.resetFields(); // Reset first
        form.setFieldsValue({
             ...detail,
             addressRegion: region,
             managerIds: detail.managerIds || []
        });
        
        // Set preview code
        setPreviewCode(detail.code);
        
        setIsModalOpen(true);
    } catch (e) {
        console.error("Failed to load warehouse details", e);
        message.error("加载仓库详情失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWarehouse(id);
      message.success('删除成功');
      loadData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      const region = values.addressRegion || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const warehouse: any = {
        id: editingId,
        name: values.name,
        code: editingId ? previewCode : undefined, // Code is immutable or auto-gen
        address: values.address,
        provinceCode: region[0],
        cityCode: region[1],
        districtCode: region[2],
        province: findLabel(addressOptions, region[0]),
        city: findLabel(addressOptions, region[1]),
        district: findLabel(addressOptions, region[2]),
        managerIds: values.managerIds,
        status: editingId ? values.status : 'ACTIVE', // Default ACTIVE for new
      };
      
      await saveWarehouse(warehouse);
      message.success(editingId ? '更新成功' : '创建成功');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Validation failed:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(error as any).errorFields) {
        message.error('操作失败');
      }
    }
  };

  // Helper to get stats (Mock logic, adapting to real ID)
  const getWarehouseStats = (code: string) => {
    const batches = inventory.filter(b => b.warehouseCode === code);
    const skuCount = new Set(batches.map(b => b.skuId)).size;
    const totalValue = batches.reduce((sum, b) => sum + (b.currentQty * b.unitCost), 0);
    return { skuCount, totalValue };
  };

  const handleStatusChange = async (checked: boolean, record: Warehouse) => {
    setStatusLoading(prev => ({ ...prev, [record.id]: true }));
    try {
        await updateWarehouseStatus(record.id, checked ? 'ACTIVE' : 'INACTIVE');
        message.success('状态更新成功');
        setData(prev => prev.map(item => 
            item.id === record.id ? { ...item, status: checked ? 'ACTIVE' : 'INACTIVE' } : item
        ));
    } catch {
        message.error('状态更新失败');
    } finally {
        setStatusLoading(prev => ({ ...prev, [record.id]: false }));
    }
  };

  // Helper to find label by value in Cascader options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findLabel = (options: any[], value: string): string => {
      if (!options || !value) return value;
      for(const opt of options) {
          if(opt.value === value) return opt.label;
          if(opt.children) {
              const found = findLabel(opt.children, value);
              if(found && found !== value) return found;
          }
      }
      return value;
  };

  const getRegionName = (record: Warehouse) => {
      // If we have codes, try to lookup names
      if (record.provinceCode && addressOptions.length > 0) {
          const p = findLabel(addressOptions, record.provinceCode);
          const c = findLabel(addressOptions, record.cityCode || '');
          const d = findLabel(addressOptions, record.districtCode || '');
          // If lookup failed (returned code), fallback to stored names or empty
          const pName = p !== record.provinceCode ? p : (record.province || '');
          const cName = c !== (record.cityCode || '') ? c : (record.city || '');
          const dName = d !== (record.districtCode || '') ? d : (record.district || '');
          return `${pName}${cName}${dName}`;
      }
      // Fallback: if region codes exist but lookup failed, show codes for debugging
      if (record.provinceCode || record.cityCode || record.districtCode) {
          return `${record.provinceCode || ''} ${record.cityCode || ''} ${record.districtCode || ''}`;
      }
      // Fallback to stored names
      return `${record.province || ''}${record.city || ''}${record.district || ''}`;
  };

  const columns: ColumnsType<Warehouse> = [
    { title: '库名', dataIndex: 'name', key: 'name' },
    { title: '仓库代码', dataIndex: 'code', key: 'code' },
    { title: '所在地区', key: 'area', render: (_, record) => getRegionName(record) },
    { 
        title: '分仓商品数', 
        key: 'skuCount', 
        render: (_, record) => getWarehouseStats(record.code).skuCount 
    },
    { 
        title: '分仓成本合计', 
        key: 'totalValue', 
        dataIndex: 'totalCost',
        render: (val) => `¥${(val || 0).toFixed(2)}` 
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { title: '仓库管理员', dataIndex: 'managers', key: 'managers', render: (managers: any[]) => managers ? managers.map(m => m.username).join(', ') : '' },
    { 
        title: '创建时间', 
        dataIndex: 'createdAt', 
        key: 'createdAt',
        render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'error'}>
          {status === 'ACTIVE' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
            <Switch 
                checked={record.status === 'ACTIVE'}
                loading={statusLoading[record.id]}
                onChange={(checked) => handleStatusChange(checked, record)}
                checkedChildren="启"
                unCheckedChildren="禁"
            />
            <Dropdown menu={{
                items: [
                    {
                        key: 'goods',
                        label: '分仓商品列表',
                        icon: <AppstoreOutlined />,
                        onClick: () => navigate(`/supply-chain/warehouse-product?warehouseCode=${record.code}`)
                    },
                    { type: 'divider' },
                    {
                        key: 'edit',
                        label: '编辑',
                        icon: <EditOutlined />,
                        onClick: () => handleEdit(record)
                    },
                    {
                        key: 'delete',
                        label: '删除',
                        danger: true,
                        icon: <DeleteOutlined />,
                        onClick: () => handleDelete(record.id)
                    }
                ]
            }}>
              <Button type="link">
                操作 <DownOutlined />
              </Button>
            </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageDoc 
        pageTitle="仓储管理 > 分仓管理"
        description="管理所有分仓信息、库存及管理员权限。"
      />
      
      <WarehouseSearch 
        onSearch={(values) => setSearchParams(values)}
        addressOptions={addressOptions}
      />

      <Card title="分仓管理" extra={
          <Space>
              <RangePicker onChange={(dates, dateStrings) => setDateRange(dates ? [dateStrings[0], dateStrings[1]] : undefined)} />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增仓库</Button>
          </Space>
      }>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={editingId ? "编辑仓库" : "新增仓库"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="库名" rules={[{ required: true, message: '请输入库名' }, { max: 30 }]}>
            <Input />
          </Form.Item>
          
          <Form.Item label="仓库代码">
             <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{previewCode || '生成中...'}</span>
             <span style={{ marginLeft: 8, color: '#999', fontSize: '12px' }}>
                 {editingId ? '(不可修改)' : '(自动生成)'}
             </span>
          </Form.Item>

          <Form.Item name="addressRegion" label="所在地区" rules={[{ required: true, message: '请选择所在地区' }]}>
            <Cascader options={addressOptions} placeholder="请选择省/市/区" />
          </Form.Item>

          <Form.Item 
            name="address" 
            label="详细地址" 
            rules={[
                { required: true, message: '请输入详细地址' }
            ]}
          >
            <Input.TextArea placeholder="请输入详细地址" />
          </Form.Item>
          
          <Form.Item name="managerIds" label="仓库管理员" rules={[{ required: true, message: '请选择管理员' }]}>
            <Select 
                mode="multiple" 
                placeholder="搜索并选择管理员"
                filterOption={false}
                onSearch={fetchUsers}
                showSearch
                options={userOptions}
            />
          </Form.Item>
          
          {editingId && (
              <Form.Item name="status" label="状态" initialValue="ACTIVE">
                <Select options={[{ label: '启用', value: 'ACTIVE' }, { label: '禁用', value: 'INACTIVE' }]} />
              </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default WarehouseList;
