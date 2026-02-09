import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, Modal, Upload, message, Form, Row, Col, Tooltip, Cascader, DatePicker, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { useExport } from '../../utils/exportUtils';
import request from '../../utils/request';

interface ProductDataType {
  key: string;
  productId: string;
  productName: string;
  skus: any[]; // Changed from individual spec fields to skus array
  status: 'PENDING_SELECTION' | 'SELECTED' | 'ON_SHELF' | 'OFF_SHELF';
  brand: string;
}

const mockProducts: ProductDataType[] = [
  {
    key: '1',
    productId: 'PROD001',
    productName: '晨光A4打印纸',
    skus: [{ skuCode: 'SPEC001', name: '70g/500张/包', costPrice: 20.00 }],
    status: 'ON_SHELF',
    brand: '晨光',
  },
  {
    key: '2',
    productId: 'PROD002',
    productName: '得力黑色中性笔',
    skus: [{ skuCode: 'SPEC002', name: '0.5mm/12支/盒', costPrice: 12.50 }],
    status: 'PENDING_SELECTION',
    brand: '得力',
  },
  {
    key: '3',
    productId: 'PROD003',
    productName: '惠普激光打印机',
    skus: [{ skuCode: 'SPEC003', name: 'M126a/台', costPrice: 1500.00 }],
    status: 'SELECTED',
    brand: '惠普',
  },
  {
    key: '4',
    productId: 'PROD004',
    productName: '佳能喷墨打印机',
    skus: [{ skuCode: 'SPEC004', name: 'G3800/台', costPrice: 800.00 }],
    status: 'OFF_SHELF',
    brand: '佳能',
  },
];

const ProductPoolList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Restore missing states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  // Category & Tax Options
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const [taxOptions, setTaxOptions] = useState<any[]>([]);

  // Error Modal State
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorProductId, setErrorProductId] = useState<string | null>(null);
  
  // Fetch Tax & Categories
  useEffect(() => {
      fetchTaxCategories();
      fetchCategoryOptions('0');
  }, []);

  const fetchTaxCategories = async () => {
      try {
          const res: any = await request.get('/tax-categories');
          if (Array.isArray(res)) setTaxOptions(res);
      } catch (e) {
          console.error('Failed to fetch tax categories', e);
      }
  };

  const fetchCategoryOptions = async (parentId: string) => {
      try {
          const res: any = await request.get('/product-categories', { params: { parentId } });
          const list = Array.isArray(res) ? res : [];
          const options = list.map((c: any) => ({
              value: c.categoryId,
              label: c.name,
              isLeaf: c.level >= 4,
          }));
          if (parentId === '0') {
              setCategoryOptions(options);
          }
          return options;
      } catch (e) {
          console.error(e);
          return [];
      }
  };

  const loadCategoryData = async (selectedOptions: any[]) => {
      const targetOption = selectedOptions[selectedOptions.length - 1];
      targetOption.loading = true;
      const children = await fetchCategoryOptions(targetOption.value);
      targetOption.loading = false;
      targetOption.children = children;
      setCategoryOptions([...categoryOptions]);
  };
  
  const fetchProducts = async (params: any = {}) => {
      setLoading(true);
      try {
          const res: any = await request.get('/products', { 
              params: { 
                  page: params.page !== undefined ? params.page - 1 : currentPage - 1,
                  size: params.size || pageSize,
                  keyword: params.keyword,
                  categoryCode: params.categoryCode,
                  taxClass: params.taxClass,
                  status: params.status,
                  type: 'NORMAL', // Explicitly request only NORMAL products
                  minPrice: params.minPrice,
                  maxPrice: params.maxPrice,
                  createdAfter: params.dateRange?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),
                  createdBefore: params.dateRange?.[1]?.format('YYYY-MM-DDTHH:mm:ss'),
              },
              paramsSerializer: (params) => {
                  const searchParams = new URLSearchParams();
                  Object.keys(params).forEach(key => {
                      const val = params[key];
                      if (val === undefined || val === null || val === '') return;
                      if (Array.isArray(val)) {
                          val.forEach(v => searchParams.append(key, v));
                      } else {
                          searchParams.append(key, val);
                      }
                  });
                  return searchParams.toString();
              }
          });
          // Adapt backend response to table data
          // Interceptor unwraps response.data.data, so res IS the data object containing records
          const list = (res.records || []).map((item: any) => ({
              key: item.id,
              productId: item.skuCode || `P${item.id}`,
              productName: item.name,
              skus: item.skus || [],
              status: item.status,
              brand: item.brandZhName || item.brandEnName || '-',
              taxClass: item.taxClass || '-',
              taxRate: item.taxRate,
          }));
          setProducts(list);
          setTotal(res.total || 0);
      } catch (error) {
          console.error('Failed to fetch products', error);
          message.error('获取商品列表失败');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchProducts();
  }, []);

  // Search History State
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  // Load History
  useEffect(() => {
      const history = localStorage.getItem('productSearchHistory');
      if (history) {
          try {
              setSearchHistory(JSON.parse(history));
          } catch (e) {
              console.error('Failed to parse search history', e);
          }
      }
  }, []);

  const saveSearchHistory = (values: any) => {
      // Filter out empty values
      const validValues = Object.fromEntries(
          Object.entries(values).filter(([_, v]) => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
      );
      
      if (Object.keys(validValues).length === 0) return;

      const newHistory = [validValues, ...searchHistory.filter(h => JSON.stringify(h) !== JSON.stringify(validValues))].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('productSearchHistory', JSON.stringify(newHistory));
  };

  const handleSearch = (values: any) => {
    saveSearchHistory(values);
    const categoryCode = values.category ? values.category[values.category.length - 1] : undefined;
    fetchProducts({ ...values, categoryCode, page: 1 });
    setCurrentPage(1);
  };
  
  const handleHistoryClick = (historyItem: any) => {
      form.setFieldsValue(historyItem);
      handleSearch(historyItem);
  };

  const clearHistory = () => {
      setSearchHistory([]);
      localStorage.removeItem('productSearchHistory');
  };
  
  const handleReset = () => {
      form.resetFields();
      fetchProducts({ page: 1 });
      setCurrentPage(1);
  };
  
  const handleTableChange = (pagination: any) => {
      setCurrentPage(pagination.current);
      setPageSize(pagination.pageSize);
      const values = form.getFieldsValue();
      const categoryCode = values.category ? values.category[values.category.length - 1] : undefined;
      fetchProducts({ 
          page: pagination.current, 
          size: pagination.pageSize,
          keyword: values.keyword,
          categoryCode,
          taxClass: values.taxClass,
          status: values.status
      });
  };

  const { handleExport, exporting, progress } = useExport<ProductDataType>({
    filenamePrefix: '商品池列表',
    fetchData: async () => {
        // Use backend export endpoint instead of frontend pagination
        try {
            const values = form.getFieldsValue();
            const categoryCode = values.category ? values.category[values.category.length - 1] : undefined;
            const params = {
                keyword: values.keyword,
                categoryCode,
                taxClass: values.taxClass,
                status: values.status,
                // Add new filters
                minPrice: values.minPrice,
                maxPrice: values.maxPrice,
                createdAfter: values.dateRange?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),
                createdBefore: values.dateRange?.[1]?.format('YYYY-MM-DDTHH:mm:ss'),
            };
            
            const response = await request.get('/products/export', { 
                params, 
                responseType: 'blob' 
            });
            
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response as any]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `products_export_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            return []; // Return empty as we handled download manually
        } catch (e) {
            console.error('Export failed', e);
            message.error('导出失败');
            return [];
        }
    },
    columns: [] // Not used since we use backend export
  });

  // Batch Selection State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };
  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个商品吗？`,
      onOk: async () => {
        try {
          await request.post('/products/batch/delete', selectedRowKeys);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchProducts();
        } catch (e) {
          console.error(e);
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleBatchStatus = (status: 'ON_SHELF' | 'OFF_SHELF') => {
    if (selectedRowKeys.length === 0) return;
    const actionName = status === 'ON_SHELF' ? '上架' : '下架';
    Modal.confirm({
      title: `确认${actionName}`,
      content: `确定要${actionName}选中的 ${selectedRowKeys.length} 个商品吗？`,
      onOk: async () => {
        try {
          await request.post('/products/batch/status', { ids: selectedRowKeys, status });
          message.success(`批量${actionName}成功`);
          setSelectedRowKeys([]);
          fetchProducts();
        } catch (e) {
          console.error(e);
          message.error(`批量${actionName}失败`);
        }
      }
    });
  };

  const handleAction = async (key: string, action: string) => {
    let newStatus: ProductDataType['status'];
    let msg = '';

    switch (action) {
      case 'Select': // Submit for selection (Pending -> Selected)
        newStatus = 'SELECTED';
        msg = '选品完成';
        break;
      case 'OnShelf': // Selected -> OnShelf
        newStatus = 'ON_SHELF';
        msg = '上架成功';
        break;
      case 'OffShelf': // OnShelf -> OffShelf
        newStatus = 'OFF_SHELF';
        msg = '下架成功';
        break;
      case 'ReShelf': // OffShelf -> OnShelf
        newStatus = 'ON_SHELF';
        msg = '重新上架成功';
        break;
      default:
        return;
    }

    if (!key) {
        message.error('无效的商品ID');
        return;
    }

    try {
      await request.patch(`/products/${key}/status`, null, { params: { status: newStatus } });
      message.success(`商品 ${key} ${msg}`);
      fetchProducts(); // Refresh list to get updated data from backend
    } catch (error: any) {
      console.error('Update status failed', error);
      
      // Handle specific validation errors from backend
      const resData = error.response?.data;

      if (resData && resData.code === 400 && resData.message) {
          if (resData.message.includes('必填项')) {
              setErrorMessage(resData.message);
              setErrorProductId(key);
              setErrorModalVisible(true);
              return; 
          } else if (resData.message.includes('商品名称已存在')) {
              // Deduplication error
              Modal.confirm({
                  title: '商品名称重复',
                  content: '该商品名称已存在，无法提交选品。请修改名称后再试。',
                  okText: '去修改',
                  cancelText: '取消',
                  onOk: () => navigate(`/supply-chain/product-pool/edit/${key}`)
              });
              return;
          }
      }
      
      // Only show generic error if request.ts hasn't already handled it (though request.ts likely did)
      // We can rely on request.ts for the toast, but we want to avoid double toast if possible.
      // Since we can't control request.ts easily, we accept the toast but add the modal for better UX.
    }
  };

  const handleErrorModalEdit = () => {
      setErrorModalVisible(false);
      if (errorProductId) {
          navigate(`/supply-chain/product-pool/edit/${errorProductId}`);
      }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
        const res: any = await request.post('/products/import/cost-price', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.code === 200) {
            if (res.errors && res.errors.length > 0) {
                Modal.warning({
                    title: '导入完成但有错误',
                    content: (
                        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                            <p>{res.message}</p>
                            <ul>
                                {res.errors.map((err: string, idx: number) => <li key={idx}>{err}</li>)}
                            </ul>
                        </div>
                    )
                });
            } else {
                message.success(res.message);
            }
            setIsImportModalOpen(false);
            fetchProducts();
        } else {
            message.error(res.message || '导入失败');
        }
    } catch (error) {
        console.error('Import failed', error);
        message.error('导入失败，请检查文件格式');
    } finally {
        setLoading(false);
    }
    return false;
  };

  const columns: ColumnsType<ProductDataType> = [
    { title: '商品ID', dataIndex: 'productId', key: 'productId', width: 120 },
    { title: '商品名称', dataIndex: 'productName', key: 'productName', width: 200, ellipsis: true },
    { 
      title: '规格数量', 
      dataIndex: 'skus', 
      key: 'skus',
      width: 150,
      render: (skus: any[]) => {
        if (!skus || skus.length === 0) return '-';
        const content = (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {skus.map((sku: any) => (
              <div key={sku.skuCode}>
                {sku.skuCode}: {sku.name}
              </div>
            ))}
          </div>
        );
        return (
          <Tooltip 
            title={content} 
            placement="top" 
            color="#000"
            styles={{ root: { maxWidth: '500px' } }}
          >
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>{skus.length}种规格</span>
          </Tooltip>
        );
      }
    },
    { 
        title: '成本价范围', 
        dataIndex: 'costPrice', 
        key: 'costPrice',
        width: 150,
        render: (_: any, record: ProductDataType) => {
            const skus = record.skus || [];
            if (skus.length === 0) return '¥0.00';
            
            const prices = skus
                .map((s: any) => Number(s.costPrice))
                .filter(p => !isNaN(p));
                
            if (prices.length === 0) return '¥0.00';
            
            const min = Math.min(...prices).toFixed(2);
            const max = Math.max(...prices).toFixed(2);
            
            return `¥${min === max ? min : `${min}—${max}`}`;
        }
    },
    { title: '品牌', dataIndex: 'brand', key: 'brand', width: 120 },
    { title: '税务分类', dataIndex: 'taxClass', key: 'taxClass', width: 120 },
    { title: '税率', dataIndex: 'taxRate', key: 'taxRate', width: 80, render: (val: any) => val ? `${(Number(val) * 100).toFixed(0)}%` : '-' },
    // { title: '默认供应商', dataIndex: 'defaultSupplier', key: 'defaultSupplier' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap: Record<string, { color: string, text: string }> = {
           PENDING_SELECTION: { color: 'default', text: '待选品' },
           SELECTED: { color: 'processing', text: '已选品' },
           ON_SHELF: { color: 'success', text: '已上架' },
           OFF_SHELF: { color: 'error', text: '已下架' },
        };
        const { color, text } = statusMap[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/supply-chain/product-pool/edit/${record.key}`)}>编辑</Button>
          
          {record.status === 'PENDING_SELECTION' && (
             <Button type="link" onClick={() => handleAction(record.key, 'Select')}>确认选品</Button>
          )}

          {record.status === 'SELECTED' && (
             <Button type="link" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.key, 'OnShelf')}>上架</Button>
          )}
          
          {record.status === 'ON_SHELF' && (
             <Button type="link" danger icon={<StopOutlined />} onClick={() => handleAction(record.key, 'OffShelf')}>下架</Button>
          )}

          {record.status === 'OFF_SHELF' && (
             <Button type="link" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.key, 'ReShelf')}>上架</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, minHeight: 360 }}>
      <PageDoc 
        pageTitle="供应链管理 > 商品池管理"
        description={`商品池管理页面为商品池列表页。

1. **列表字段**：
   - 商品名称、商品ID。
   - 规格名称、规格ID。
   - 状态（待选品、已选品、已上架、已下架）。

2. **状态说明**：
   - **待选品**：商品必填字段不全。
   - **已选品**：必填字段全但未执行上架操作。
   - **已上架**：已选品且执行上架操作，出现在运营平台商品池。
   - **已下架**：已上架且执行下架操作，从运营平台移除。

3. **操作功能**：
   - **编辑**：修改商品信息。
   - **上架**：仅“已选品”状态展示。
   - **下架**：仅“已上架”状态展示。
   - **新增商品**：跳转至新增页面（不展示在菜单栏）。

4. **高级功能**：
   - **搜索**：商品信息（名称）、默认供应商（模糊搜索）、商品状态（多选）。
   - **批量导出**：导出商品及规格信息（Excel）。

5. **异常处理**：
   - **操作限制**：未选品商品不可上架。`}
        fields={[
          { name: 'productId', type: 'String', length: '32', required: true, unique: true, desc: '商品ID' },
          { name: 'productName', type: 'String', length: '200', required: true, unique: false, desc: '商品名称' },
          { name: 'status', type: 'Enum', required: true, defaultValue: 'PENDING_SELECTION', desc: '状态：PENDING_SELECTION, SELECTED, ON_SHELF, OFF_SHELF' },
        ]}
      />
      
      <Modal
          title="无法完成操作"
          open={errorModalVisible}
          onCancel={() => setErrorModalVisible(false)}
          footer={[
              <Button key="cancel" onClick={() => setErrorModalVisible(false)}>
                  关闭
              </Button>,
              <Button key="edit" type="primary" onClick={handleErrorModalEdit}>
                  去编辑完善信息
              </Button>
          ]}
      >
          <div style={{ marginBottom: 16 }}>
             <div style={{ color: '#ff4d4f', fontWeight: 'bold', marginBottom: 8 }}>
                 <StopOutlined style={{ marginRight: 8 }} />
                 无法提交选品，因为缺失以下必填信息：
             </div>
             <div style={{ padding: '8px 0' }}>
                 {errorMessage.includes('必填项') ? (
                    errorMessage.split(': ')[1]?.split(', ')
                        .filter(field => field !== '品牌' && field !== '税务分类')
                        .map(field => (
                        <Tag color="error" style={{ fontSize: '14px', padding: '4px 8px' }} key={field}>
                           {field}
                        </Tag>
                    ))
                ) : (
                     errorMessage
                 )}
             </div>
          </div>
          <p>请点击“去编辑”按钮补充缺失的必填信息（如商品名称、商品分类、规格等），保存后再尝试提交选品。</p>
      </Modal>

      <Form form={form} layout="inline" style={{ marginBottom: 24 }} onFinish={handleSearch}>
         <Row gutter={[16, 16]}>
            <Col>
              <Form.Item name="keyword" label="商品信息">
                 <Input placeholder="商品名称/ID/规格ID" style={{ width: 200 }} />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item name="category" label="商品分类">
                  <Cascader 
                      options={categoryOptions} 
                      loadData={loadCategoryData} 
                      changeOnSelect 
                      placeholder="请选择分类" 
                      style={{ width: 200 }}
                  />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item name="taxClass" label="税务分类">
                  <Select placeholder="请选择" allowClear showSearch style={{ width: 150 }}>
                      {taxOptions.map((t: any) => <Select.Option key={t.id} value={t.name}>{t.name}</Select.Option>)}
                  </Select>
              </Form.Item>
            </Col>
            <Col>
              <Form.Item name="status" label="状态">
                 <Select mode="multiple" placeholder="请选择" style={{ minWidth: 160 }} allowClear maxTagCount="responsive">
                    <Select.Option value="PENDING_SELECTION">待选品</Select.Option>
                    <Select.Option value="SELECTED">已选品</Select.Option>
                    <Select.Option value="ON_SHELF">已上架</Select.Option>
                    <Select.Option value="OFF_SHELF">已下架</Select.Option>
                 </Select>
              </Form.Item>
            </Col>
            <Col>
              <Form.Item name="dateRange" label="创建时间">
                 <DatePicker.RangePicker showTime style={{ width: 220 }} />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label="成本价">
                 <Space>
                   <Form.Item name="minPrice" noStyle>
                     <InputNumber placeholder="Min" style={{ width: 80 }} min={0} />
                   </Form.Item>
                   -
                   <Form.Item name="maxPrice" noStyle>
                     <InputNumber placeholder="Max" style={{ width: 80 }} min={0} />
                   </Form.Item>
                 </Space>
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

      {searchHistory.length > 0 && (
          <div style={{ marginBottom: 16 }}>
              <Space wrap>
                  <span style={{ color: '#999' }}>搜索历史:</span>
                  {searchHistory.map((h, idx) => (
                      <Tag 
                          key={idx} 
                          closable 
                          onClose={(e) => {
                              e.preventDefault();
                              const newH = searchHistory.filter((_, i) => i !== idx);
                              setSearchHistory(newH);
                              localStorage.setItem('productSearchHistory', JSON.stringify(newH));
                          }}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleHistoryClick(h)}
                      >
                          {Object.entries(h).map(([k, v]) => {
                              if (k === 'category') return '分类'; 
                              if (k === 'status' && Array.isArray(v)) return `状态(${v.length})`;
                              if (Array.isArray(v)) return `${k}:[${v.length}]`;
                              return `${v}`;
                          }).join(', ')}
                      </Tag>
                  ))}
                  <Button type="link" size="small" onClick={clearHistory}>清空</Button>
              </Space>
          </div>
      )}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
         <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/supply-chain/product-pool/add')}>新增商品</Button>
            {selectedRowKeys.length > 0 && (
              <>
                <Button danger onClick={handleBatchDelete}>批量删除</Button>
                <Button onClick={() => handleBatchStatus('ON_SHELF')}>批量上架</Button>
                <Button onClick={() => handleBatchStatus('OFF_SHELF')}>批量下架</Button>
              </>
            )}
         </Space>
         <Space>
            <Button icon={<ImportOutlined />} onClick={() => setIsImportModalOpen(true)}>批量导入</Button>
            <Tooltip title="支持Excel/CSV格式导出，最大支持10000条数据">
                <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
                {exporting ? `导出中 ${progress}%` : '批量导出'}
                </Button>
            </Tooltip>
         </Space>
      </div>

      <Table 
        rowKey="key"
        loading={loading}
        dataSource={products} 
        columns={columns} 
        rowSelection={rowSelection}
        pagination={{
            total,
            current: currentPage,
            pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`
        }}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
      />
      
      <Modal
        title="批量变价导入"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
            <p>请下载模板，填写后上传。注意：<b>新成本价必须大于0且小于9999999.99，保留2位小数</b>。</p>
            <Button type="link" onClick={handleExport}>下载模板 (使用导出文件作为模板)</Button>
            <Upload.Dragger beforeUpload={handleImport} maxCount={1}>
                <p className="ant-upload-drag-icon">
                    <ImportOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            </Upload.Dragger>
        </Space>
      </Modal>
    </div>
  );
};

export default ProductPoolList;
