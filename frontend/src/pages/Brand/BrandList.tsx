import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Input, Space, Tag, Avatar, message, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, UserOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';
import { getBrands, updateBrand, Brand } from '../../services/brandService';

const BrandList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBrands({
        page: pagination.current - 1,
        size: pagination.pageSize,
        name: query
      });
      setBrands(res.records || []);
      setTotal(res.total || 0);
    } catch {
      message.error('加载品牌列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination, query]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleSearch = () => {
    setQuery(searchText);
    setPagination({ ...pagination, current: 1 });
  };

  const handleReset = () => {
    setSearchText('');
    setQuery('');
    setPagination({ ...pagination, current: 1 });
  };
  
  const { handleExport, exporting, progress } = useExport<Brand>({
    filenamePrefix: '品牌列表',
    fetchData: () => brands, // This only exports current page. Ideally should fetch all.
    columns: [
        { title: '品牌名称', dataIndex: 'name' },
        { title: '商标注册号', dataIndex: 'trademarkNo' },
        { title: '关联供应商数量', dataIndex: 'suppliers', render: (val) => val?.length || 0 },
        { title: '关联商品数量', dataIndex: 'productCount' },
        { title: '品牌状态', dataIndex: 'status', render: (val) => val === 'ENABLED' ? '已启用' : '已禁用' },
    ]
  });

  const handleStatusChange = async (record: Brand, newStatus: 'ENABLED' | 'DISABLED') => {
    try {
      await updateBrand(record.id, { ...record, status: newStatus });
      message.success(`品牌状态已更新为 ${newStatus === 'ENABLED' ? '已启用' : '已禁用'}`);
      fetchBrands();
    } catch (error) {
      console.error(error);
      message.error('更新状态失败');
    }
  };

  const columns: ColumnsType<Brand> = [
    {
      title: '品牌图标',
      dataIndex: 'icon',
      key: 'icon',
      render: (src) => <Avatar src={src} icon={<UserOutlined />} />,
    },
    { title: '品牌名称', dataIndex: 'name', key: 'name' },
    { title: '商标注册号', dataIndex: 'trademarkNo', key: 'trademarkNo' },
    { title: '关联供应商数量', key: 'supplierCount', render: (_, record) => record.suppliers?.length || 0 },
    { title: '关联商品数量', dataIndex: 'productCount', key: 'productCount' },
    {
      title: '品牌状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ENABLED' ? 'success' : 'error'}>
          {status === 'ENABLED' ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/supply-chain/brand/edit/${record.id}`)}
          >
            编辑
          </Button>
          {record.status === 'ENABLED' ? (
            <Button 
              type="link" 
              danger 
              icon={<StopOutlined />} 
              onClick={() => handleStatusChange(record, 'DISABLED')}
            >
              禁用
            </Button>
          ) : (
            <Button 
              type="link" 
              icon={<CheckCircleOutlined />} 
              onClick={() => handleStatusChange(record, 'ENABLED')}
            >
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 品牌管理"
        description={`品牌管理页面为品牌列表页。
        
1. **列表字段**：
   - 品牌名称、商标注册号、品牌图标。
   - 关联供应商数量、关联商品数量。
   - 品牌状态（已启用、已禁用）。
   - 操作列：编辑、启用（禁用状态时显示）、禁用（启用状态时显示）。`}
        fields={[
          { name: 'brandName', type: 'String', length: '100', required: true, desc: '品牌名称' },
          { name: 'trademarkNo', type: 'String', length: '50', required: false, desc: '商标注册号' },
          { name: 'status', type: 'Enum', required: true, defaultValue: 'ENABLED', desc: '状态：ENABLED, DISABLED' },
        ]}
      />
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
           <Input 
             placeholder="请输入品牌名称" 
             style={{ width: 200 }} 
             value={searchText}
             onChange={(e) => setSearchText(e.target.value)}
             onPressEnter={handleSearch}
           />
           <Button type="primary" onClick={handleSearch}>查询</Button>
           <Button onClick={handleReset}>重置</Button>
        </Space>
        <Space>
           <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/brand/add')}>
             新增品牌
           </Button>
           <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
             <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
             </Button>
           </Tooltip>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={brands} 
        loading={loading} 
        rowKey="id"
        pagination={{
          ...pagination,
          total,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize: pageSize || 10 })
        }}
      />
    </div>
  );
};

export default BrandList;
