import React from 'react';
import { Table, Button, Input, Space, Tag, Avatar, message, Modal, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, UserOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';

interface BrandDataType {
  key: string;
  brandName: string;
  trademarkNo: string;
  icon: string;
  supplierCount: number;
  productCount: number;
  status: 'Enabled' | 'Disabled';
}

const mockBrands: BrandDataType[] = [
  {
    key: '1',
    brandName: '晨光文具',
    trademarkNo: 'TM2023001',
    icon: 'https://api.dicebear.com/7.x/initials/svg?seed=CG',
    supplierCount: 5,
    productCount: 120,
    status: 'Enabled',
  },
  {
    key: '2',
    brandName: '得力办公',
    trademarkNo: 'TM2023002',
    icon: 'https://api.dicebear.com/7.x/initials/svg?seed=DL',
    supplierCount: 3,
    productCount: 85,
    status: 'Enabled',
  },
  {
    key: '3',
    brandName: '联想',
    trademarkNo: 'TM2023003',
    icon: 'https://api.dicebear.com/7.x/initials/svg?seed=LX',
    supplierCount: 8,
    productCount: 200,
    status: 'Disabled',
  },
];

const BrandList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [brands, setBrands] = React.useState<BrandDataType[]>(mockBrands);

  const { handleExport, exporting, progress } = useExport<BrandDataType>({
    filenamePrefix: '品牌列表',
    fetchData: () => brands,
    columns: [
        { title: '品牌名称', dataIndex: 'brandName' },
        { title: '商标注册号', dataIndex: 'trademarkNo' },
        { title: '关联供应商数量', dataIndex: 'supplierCount' },
        { title: '关联商品数量', dataIndex: 'productCount' },
        { title: '品牌状态', dataIndex: 'status', render: (val) => val === 'Enabled' ? '已启用' : '已禁用' },
    ]
  });

  // Simulate loading
  React.useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleStatusChange = (key: string, newStatus: 'Enabled' | 'Disabled') => {
    const newBrands = brands.map(item => 
      item.key === key ? { ...item, status: newStatus } : item
    );
    setBrands(newBrands);
    message.success(`品牌状态已更新为 ${newStatus === 'Enabled' ? '已启用' : '已禁用'}`);
  };

  const columns: ColumnsType<BrandDataType> = [
    {
      title: '品牌图标',
      dataIndex: 'icon',
      key: 'icon',
      render: (src) => <Avatar src={src} icon={<UserOutlined />} />,
    },
    { title: '品牌名称', dataIndex: 'brandName', key: 'brandName' },
    { title: '商标注册号', dataIndex: 'trademarkNo', key: 'trademarkNo' },
    { title: '关联供应商数量', dataIndex: 'supplierCount', key: 'supplierCount' },
    { title: '关联商品数量', dataIndex: 'productCount', key: 'productCount' },
    {
      title: '品牌状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Enabled' ? 'success' : 'error'}>
          {status === 'Enabled' ? '已启用' : '已禁用'}
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
            onClick={() => navigate(`/supply-chain/brand/edit/${record.key}`)}
          >
            编辑
          </Button>
          {record.status === 'Enabled' ? (
            <Button 
              type="link" 
              danger 
              icon={<StopOutlined />} 
              onClick={() => handleStatusChange(record.key, 'Disabled')}
            >
              禁用
            </Button>
          ) : (
            <Button 
              type="link" 
              icon={<CheckCircleOutlined />} 
              onClick={() => handleStatusChange(record.key, 'Enabled')}
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
   - 操作列：编辑、启用（禁用状态时显示）、禁用（启用状态时显示）。

2. **功能说明**：
   - **状态控制**：只有启用状态的品牌方可在供应商及商品的相关操作中被选择。
   - **新增/编辑**：点击新增品牌及编辑品牌，进入品牌详情页。

3. **异常处理**：
   - **网络错误**：加载列表失败时提示"数据加载失败，请重试"。
   - **操作失败**：状态更新失败时保留原状态并提示错误信息。`}
        fields={[
          { name: 'brandName', type: 'String', length: '100', required: true, desc: '品牌名称' },
          { name: 'trademarkNo', type: 'String', length: '50', required: false, desc: '商标注册号' },
          { name: 'status', type: 'Enum', required: true, defaultValue: 'Enabled', desc: '状态：Enabled, Disabled' },
        ]}
      />
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
           <Input placeholder="请输入品牌名称" style={{ width: 200 }} />
           <Button type="primary">查询</Button>
           <Button>重置</Button>
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

      <Table columns={columns} dataSource={brands} loading={loading} />
    </div>
  );
};

export default BrandList;
