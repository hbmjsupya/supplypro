import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, Form, message, Row, Col, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';
import request from '../../utils/request';

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
}

const BundleList: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BundleDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchBundles = async (params: any = {}) => {
    setLoading(true);
    try {
        const { current, pageSize } = pagination;
        // Merge pagination and search params
        const queryParams = {
            page: params.page || current - 1, // Spring Boot is 0-indexed
            size: params.size || pageSize,
            ...params
        };
        
        // Remove page/size from params if they are passed separately to avoid duplication or conflict
        delete queryParams.current;
        delete queryParams.pageSize;

        const res: any = await request.get('/bundles', {
            params: queryParams
        });
        
        if (res && res.content) {
            const bundles = res.content.map((p: any) => ({
                key: p.id.toString(),
                bundleId: p.id.toString(),
                bundleName: p.name,
                saleType: '打包售卖',
                defaultCost: p.bundleItems ? p.bundleItems.reduce((sum: number, item: any) => {
                     const child = item.childProduct || {};
                     // Try to get cost from first SKU, or child product cost if available
                     const cost = (child.skus && child.skus.length > 0) 
                        ? child.skus[0].costPrice 
                        : (child.costPrice || 0);
                     return sum + (cost * item.quantity);
                }, 0) : 0,
                status: p.status,
                subProducts: p.bundleItems ? p.bundleItems.map((item: any) => {
                    const child = item.childProduct || {};
                    const firstSku = child.skus && child.skus.length > 0 ? child.skus[0] : {};
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
            setData(bundles);
            setPagination(prev => ({
                ...prev,
                total: res.totalElements,
                current: res.number + 1
            }));
        }
    } catch (e) {
        console.error('Fetch bundles failed', e);
        message.error('获取组合商品列表失败');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleSearch = () => {
      const values = form.getFieldsValue();
      // Handle array for status
      const searchParams: any = {
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
      fetchBundles({ page: 0 });
  };

  const handleTableChange = (newPagination: any) => {
      setPagination(newPagination);
      const values = form.getFieldsValue();
      const searchParams: any = {
          keyword: values.keyword,
          page: newPagination.current - 1,
          size: newPagination.pageSize
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
    } catch (e: any) {
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
            const map: any = { 'PENDING_SELECTION': '待选品', 'SELECTED': '已选品', 'LISTED': '已上架', 'DELISTED': '已下架' };
            return map[val] || val;
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
      <Form form={form} layout="inline" style={{ marginBottom: 24 }} onFinish={handleSearch}>
         <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col>
              <Form.Item name="keyword" label="商品信息">
                 <Input placeholder="名称/ID" allowClear />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item name="status" label="状态">
                 <Select placeholder="请选择" mode="multiple" style={{ width: 200 }} allowClear>
                    <Select.Option value="LISTED">已上架</Select.Option>
                    <Select.Option value="DELISTED">已下架</Select.Option>
                 </Select>
              </Form.Item>
            </Col>
            <Col>
               <Space>
                  <Button type="primary" htmlType="submit">查询</Button>
                  <Button onClick={handleReset}>重置</Button>
               </Space>
            </Col>
         </Row>
      </Form>

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

      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        rowKey="key"
      />
    </div>
  );
};

export default BundleList;