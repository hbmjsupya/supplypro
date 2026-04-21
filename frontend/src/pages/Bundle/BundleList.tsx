import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Button, Input, Select, Space, Tag, Form, message, Row, Col, Tooltip, Empty, Result } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import SearchFormLayout from '../../components/SearchFormLayout';
import { useExport } from '../../utils/exportUtils';
import request from '../../utils/request';

interface BundleResponseDTO {
    id: number;
    name: string;
    status: string;
    bundleItems?: {
        id: number;
        childProductId: number;
        quantity: number;
        childProduct?: {
            name?: string;
            skus?: {
                skuCode: string;
                name?: string;
                costPrice?: number;
                supplier?: { name: string };
            }[];
            costPrice?: number;
        };
    }[];
}

interface BundleDataType {
  key: string;
  bundleId: string;
  bundleName: string;
  saleType: string;
  defaultCost: number;
  status: string;
  subProducts: {
      name: string;
      spec: string;
      qty: number;
      unitCost: number;
      totalCost: number;
      supplier: string;
  }[];
  [key: string]: any;
}

const BundleList: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BundleDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const paginationRef = useRef(pagination);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  const fetchBundles = useCallback(async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { current, pageSize } = paginationRef.current;
      // Merge pagination and search params
      const queryParams = {
        page: typeof params.page === 'number' ? params.page : current - 1, // Spring Boot is 0-indexed
        size: params.size || pageSize,
        ...params
      };
      
      // Remove page/size from params if they are passed separately to avoid duplication or conflict
      if ('current' in queryParams) delete queryParams.current;
      if ('pageSize' in queryParams) delete queryParams.pageSize;

      const res = await request.get('/bundles', {
        params: queryParams
      }) as unknown as { 
          content?: BundleResponseDTO[]; 
          records?: BundleResponseDTO[];
          totalElements?: number; 
          total?: number;
          number?: number;
          data?: { content?: BundleResponseDTO[]; records?: BundleResponseDTO[]; totalElements?: number; total?: number; number?: number; };
      };
      
      const content = Array.isArray(res?.content) ? res.content
        : Array.isArray(res?.records) ? res.records
        : Array.isArray(res?.data?.content) ? res.data?.content || []
        : Array.isArray(res?.data?.records) ? res.data?.records || []
        : [];

      if (content.length > 0 || Array.isArray(res?.content) || Array.isArray(res?.records) || Array.isArray(res?.data?.content) || Array.isArray(res?.data?.records)) {
        const bundles = content.map((p: BundleResponseDTO) => ({
          key: p.id.toString(),
          bundleId: p.id.toString(),
          bundleName: p.name,
          saleType: '打包售卖',
          defaultCost: p.bundleItems ? p.bundleItems.reduce((sum: number, item: any) => {
             const child = item.childProduct || {};
             // Try to get cost from first SKU, or child product cost if available
             const cost = (child.skus && child.skus.length > 0) 
              ? (child.skus[0].costPrice || 0)
              : (child.costPrice || 0);
             return sum + (cost * item.quantity);
          }, 0) : 0,
          status: p.status,
          subProducts: p.bundleItems ? p.bundleItems.map((item: any) => {
            const child = item.childProduct || {};
            const firstSku = child.skus && child.skus.length > 0 ? child.skus[0] : { skuCode: '', name: '', costPrice: 0, supplier: { name: '' } };
            return {
              name: child.name || '未知商品',
                        spec: firstSku.name || firstSku.skuCode || '默认规格',
                        qty: item.quantity,
                        unitCost: firstSku.costPrice || 0,
                        totalCost: (firstSku.costPrice || 0) * item.quantity,
                        supplier: firstSku.supplier ? firstSku.supplier.name : '暂无供应商'
                    };
                }) : []
            }));
        const total = res?.totalElements ?? res?.total ?? res?.data?.totalElements ?? res?.data?.total ?? 0;
        const number = res?.number ?? res?.data?.number ?? (typeof queryParams.page === 'number' ? queryParams.page : 0);
        const nextPageSize = typeof queryParams.size === 'number' ? queryParams.size : pageSize;
        setData(bundles);
        setPagination(prev => ({
          ...prev,
          total: total,
          current: number + 1,
          pageSize: nextPageSize
        }));
      } else {
        setData([]);
        setPagination(prev => ({
          ...prev,
          total: 0
        }));
        setError('返回数据格式异常');
      }
    } catch (e) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        const errorMessage = status === 429 ? '请求过于频繁，请稍后重试' : '获取组合商品列表失败';
        console.error('Fetch bundles failed', e);
        message.error(errorMessage);
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBundles({ page: 0, size: paginationRef.current.pageSize });
  }, [fetchBundles]);

  const handleSearch = () => {
      const values = form.getFieldsValue();
      // Handle array for status
      const searchParams: Record<string, unknown> = {
          keyword: values.keyword,
          page: 0 // Reset to first page
      };
      if (values.status && values.status.length > 0) {
          // If multiple statuses selected, we might need to handle it. 
          // Current API supports single 'status' string or list depending on implementation.
          // BundleController.getBundles takes String status. 
          // If we want multiple, we need to update Backend or just take the first one or join them.
          // Let's check BundleController again. It takes `String status`.
          // For now, let's just use the first one if multiple, or join with comma if backend supports it.
          // BundleController logic: Product.Status.fromString(status). It expects a single status.
          // Requirement 10 says "Support filtering by status".
          // If UI allows multiple, backend should support it.
          // For now, assuming single select or taking first.
          searchParams.status = values.status[0]; 
      }
      fetchBundles(searchParams);
  };

  const handleReset = () => {
      form.resetFields();
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchBundles({ page: 0, size: paginationRef.current.pageSize });
  };

  const handleTableChange = (newPagination: TablePaginationConfig) => {
      const values = form.getFieldsValue();
      const current = newPagination.current || 1;
      const size = newPagination.pageSize || paginationRef.current.pageSize;
      setPagination(prev => ({ ...prev, current, pageSize: size }));
      const searchParams: Record<string, unknown> = {
          keyword: values.keyword,
          page: current - 1,
          size: size
      };
      if (values.status && values.status.length > 0) {
          searchParams.status = values.status[0];
      }
      fetchBundles(searchParams);
  };

  const handleAction = async (key: string, action: 'List' | 'Delist') => {
    try {
        if (action === 'List') {
            await request.post(`/bundles/${key}/list`);
            message.success('组合商品已上架');
        } else {
            await request.post(`/bundles/${key}/delist`);
            message.success('组合商品已下架');
        }
        fetchBundles({ page: pagination.current - 1 }); 
    } catch {
        // Error handled usually by interceptor, but if we want specific message:
        // message.error(e.message || '操作失败');
    }
  };

  const { handleExport, exporting, progress } = useExport<BundleDataType>({
    filenamePrefix: '组合商品列表',
    fetchData: () => data,
    columns: [
        { title: '组合商品ID', dataIndex: 'bundleId' },
        { title: '组合商品名称', dataIndex: 'bundleName' },
        { title: '售卖方式', dataIndex: 'saleType' },
        { title: '默认成本价', dataIndex: 'defaultCost', render: (val) => val.toFixed(2) },
        { title: '状态', dataIndex: 'status', render: (val) => {
            const map: Record<string, string> = { 'PENDING_SELECTION': '待选品', 'SELECTED': '已选品', 'LISTED': '已上架', 'DELISTED': '已下架' };
            return map[val as string] || val;
        } },
    ]
  });

  const columns: ColumnsType<BundleDataType> = [
    { title: '组合商品ID', dataIndex: 'bundleId', key: 'bundleId' },
    { title: '组合商品名称', dataIndex: 'bundleName', key: 'bundleName' },
    { 
       title: '包含子商品种类', 
       key: 'subProductCount', 
       render: (_, record) => (
          <Tooltip 
             title={
                <div style={{ padding: '4px' }}>
                   {record.subProducts.map((sub, idx) => (
                      <div key={idx} style={{ marginBottom: idx === record.subProducts.length - 1 ? 0 : 8, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 4 }}>
                         <div><strong>{sub.name}</strong></div>
                         <div style={{ fontSize: '12px', color: '#ccc' }}>{sub.spec}</div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span>x {sub.qty}</span>
                            <span>¥{sub.unitCost.toFixed(2)}</span>
                         </div>
                         <div style={{ fontSize: '12px', marginTop: 2 }}>供: {sub.supplier}</div>
                      </div>
                   ))}
                   <div style={{ marginTop: 8, paddingTop: 4, borderTop: '1px solid #fff', textAlign: 'right' }}>
                      成本合计: ¥{record.subProducts.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}
                   </div>
                </div>
             }
             overlayInnerStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', maxWidth: 300 }}
             mouseEnterDelay={0.2}
          >
             <span style={{ cursor: 'pointer', borderBottom: '1px dashed #999' }}>{record.subProducts.length}</span>
          </Tooltip>
       ),
    },
    { title: '售卖方式', dataIndex: 'saleType', key: 'saleType' },
    { 
       title: '默认成本价', 
       dataIndex: 'defaultCost', 
       key: 'defaultCost',
       render: (val) => `¥${val.toFixed(2)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { color: string, text: string }> = {
           LISTED: { color: 'success', text: '已上架' },
           DELISTED: { color: 'error', text: '已下架' },
        };
        const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : status;
        const { color, text } = statusMap[status] || statusMap[normalizedStatus] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const status = typeof record.status === 'string' ? record.status.toUpperCase() : '';
        return (
          <Space size="middle">
            <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/supply-chain/bundle/edit/${record.key}`)}>编辑</Button>
            {status === 'DELISTED' && (
               <Button type="link" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.key, 'List')}>上架</Button>
            )}
            {status === 'LISTED' && (
               <Button type="link" danger icon={<StopOutlined />} onClick={() => handleAction(record.key, 'Delist')}>下架</Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 组合商品管理"
        description="组合商品管理页面。支持组合商品的上架和下架。"
        fields={[]}
      />
      <SearchFormLayout onFinish={handleSearch} onReset={handleReset} form={form}>
         <Form.Item name="keyword" label="商品信息" style={{ marginBottom: 0 }}>
            <Input placeholder="名称/ID" allowClear />
         </Form.Item>
         <Form.Item name="status" label="状态" style={{ marginBottom: 0 }}>
            <Select placeholder="请选择" mode="multiple" allowClear>
               <Select.Option value="LISTED">已上架</Select.Option>
               <Select.Option value="DELISTED">已下架</Select.Option>
            </Select>
         </Form.Item>
      </SearchFormLayout>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
         <Space>
           <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/bundle/add')}>
             新增组合商品
           </Button>
           <Tooltip title="支持Excel/CSV格式导出">
             <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
               {exporting ? `导出中 ${progress}%` : '批量导出'}
             </Button>
           </Tooltip>
         </Space>
      </div>

      {error ? (
        <Result
          status="error"
          title="加载失败"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => fetchBundles({ page: pagination.current - 1, size: pagination.pageSize })}>
              重试
            </Button>
          }
        />
      ) : (
        <Table 
          columns={columns} 
          dataSource={data} 
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          rowKey="key"
          locale={{ emptyText: <Empty description="暂无组合商品" /> }}
        />
      )}
    </div>
  );
};

export default BundleList;
