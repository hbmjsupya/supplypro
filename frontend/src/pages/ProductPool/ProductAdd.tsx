import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, Space, Select, Table, InputNumber, Upload, Row, Col, message, Breadcrumb, Modal, Cascader } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, MinusCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import request from '../../utils/request';

interface Option {
  value: string;
  label: string;
  children?: Option[];
  isLeaf?: boolean;
  loading?: boolean;
}

interface Supplier {
    id: string;
    name: string;
    status?: string;
}

interface Brand {
    id: string;
    name: string;
    logo?: string;
    icon?: string;
}

interface TaxCategory {
    id: string;
    categoryCode: string;
    categoryName: string;
    taxRate: number;
}

interface SpecItem {
    key: number | string;
    id?: string;
    name: string;
    skuCode?: string;
    costPrice?: number;
    supplier?: { value: string; label: string };
}

interface BackendSku {
    id: string;
    name: string;
    skuCode: string;
    costPrice: number;
    supplier?: { id: string; name: string };
}

interface Product {
    id: string;
    name: string;
    logisticsTemplate: string;
    status: string;
    taxRate: number;
    taxCode: string;
    brandId: string;
    brandZhName: string;
    brandLogo: string;
    taxClass: string;
    categoryCode: string;
    categoryName: string;
    skus: BackendSku[];
}

interface ProductFormValues {
    productName: string;
    defaultSupplier: string;
    status: string;
    logistics: string;
    category: string[];
    categoryVersion?: string;
    brandObj?: { value: string; label: string };
    taxRate: number;
    taxClass?: { label: string };
}

interface SpecFormValues {
    baseName?: string;
    level1Values?: string[];
    level2Values?: string[];
}

const ProductAdd: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // 新增规格 Modal 相关状态
  const [isSpecModalVisible, setIsSpecModalVisible] = useState(false);
  const [specForm] = Form.useForm<SpecFormValues>();
  const [hasLevel2, setHasLevel2] = useState(false);
  
  // Mock specs data
  const [specs, setSpecs] = useState<SpecItem[]>([]);

  // Category State
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  
  const onCategoryChange = (_: unknown, selectedOptions: Option[]) => {
      if (selectedOptions && selectedOptions.length > 0) {
          const names = selectedOptions.map(o => o.label).join('/');
          setSelectedCategoryName(names);
      }
  };
  
  // Tax State
  const [taxOptions, setTaxOptions] = useState<TaxCategory[]>([]);
  const [taxLoading, setTaxLoading] = useState(false);

  // Brand Search State
  const [brandLoading, setBrandLoading] = useState(false);

  // API for Categories (New Product Categories API)
  const fetchCategories = async (level: number, parentId?: string): Promise<Option[]> => {
      try {
          const params: Record<string, string | number> = { level };
          if (parentId) params.parentId = parentId;
          
          const res = await request.get('/product-categories', { params });
          // Backend returns List<ProductCategory>
          const list = Array.isArray(res) ? res : [];
          
          return list.map((item: { categoryId: string; name: string; level: number }) => ({
              value: item.categoryId,
              label: item.name,
              isLeaf: item.level === 4,
              children: item.level === 4 ? undefined : [], // Initialize children for non-leaf
          }));
      } catch (error) {
          console.error('Failed to fetch categories', error);
          return [];
      }
  };

  const [supplierLoading, setSupplierLoading] = useState(false);

  const fetchSuppliers = async (keyword: string = '') => {
      setSupplierLoading(true);
      try {
          const res = await request.get('/suppliers', { 
              params: { 
                  name: keyword, 
                  status: 'ACTIVE', 
                  size: 50 
              } 
          }) as { content: Supplier[] };
          setSuppliers(res.content || []); // Use res.content for Page
      } catch (err) {
          console.error('Failed to fetch suppliers', err);
      } finally {
          setSupplierLoading(false);
      }
  };

  // Init Categories and Suppliers
  useEffect(() => {
      fetchCategories(1).then(data => setCategoryOptions(data));
      fetchSuppliers(); // Initial load
  }, []);

  // Fetch Product Detail
  useEffect(() => {
    if (id && !isNaN(Number(id))) {
      const fetchProductDetail = async () => {
        // setLoading(true); // We don't have a global loading state for the whole page, but we can use generic loading if available or just proceed
        try {
          const res = await request.get(`/products/${id}`) as Product;
          const product = res;
          
          form.setFieldsValue({
            productName: product.name,
            logistics: product.logisticsTemplate,
            status: product.status,
            taxRate: product.taxRate,
            taxCode: product.taxCode,
            // Restore Brand
            brandObj: product.brandId ? { value: product.brandId, label: product.brandZhName } : undefined,
            // Restore Tax Class
            taxClass: product.taxClass ? { label: product.taxClass, value: product.taxClass } : undefined,
          });

          // Restore Category
          if (product.categoryCode) {
             try {
                const pathRes = await request.get(`/product-categories/${product.categoryCode}/path`) as { categoryId: string; name: string }[];
                if (Array.isArray(pathRes) && pathRes.length > 0) {
                    // Construct the options tree from the path
                    // pathRes is [Root, Level2, Level3, Leaf]
                    // We need to merge this into categoryOptions or build a structure
                    
                    // Helper to recursively build tree from path list
                    const buildTree = (list: { categoryId: string; name: string }[], index: number): Option[] => {
                        if (index >= list.length) return [];
                        
                        const current = list[index];
                        const node: Option = {
                            value: current.categoryId,
                            label: current.name,
                            isLeaf: index === list.length - 1,
                            children: index < list.length - 1 ? buildTree(list, index + 1) : undefined
                        };
                        return [node];
                    };

                    // Note: This replaces the root options if we just use buildTree.
                    // Ideally we should merge with existing options or just set it if we accept only this path is visible initially.
                    // For simplicity in Edit mode, we can just set this structure, 
                    // and if user wants to change, they can click root again (but that might require fetching roots again if we overwrote).
                    // Better approach: fetch roots (already done in other useEffect), and merge this path into it.
                    // Since fetchCategories(1) is async, we might race.
                    // Let's just set the options to this path structure for now to ensure display is correct.
                    // The Cascader loadData will fetch children if user expands other nodes.
                    // But if we overwrite root, user can't select other roots easily without page reload logic.
                    // So we should try to merge into current categoryOptions if possible, or wait for it.
                    
                    // Actually, if we just set the value, Cascader needs the options to display the label.
                    // Let's set the options based on this path.
                    
                    const pathTree = buildTree(pathRes, 0);
                    // If we want to keep other roots, we need to fetch them or check if they exist.
                    // Since we fetch roots on mount, let's just assume we can set this specific branch.
                    // If the root of this path matches an existing root, we should merge.
                    
                    // Simple approach: Set options to just this path. 
                    // If user clears, we might need to re-fetch roots.
                    // But for "View/Edit", showing the current selection is priority.
                    setCategoryOptions(pathTree);
                    
                    // Set Form Value
                    const pathIds = pathRes.map((c) => c.categoryId);
                    form.setFieldsValue({ category: pathIds });
                    
                    // Set Name
                    setSelectedCategoryName(product.categoryName);
                }
             } catch (err) {
                 console.error('Failed to restore category path', err);
             }
          }

          // Restore Brand Icon
          if (product.brandId) {
             setSelectedBrand({
                 id: product.brandId,
                 name: product.brandZhName,
                 icon: product.brandLogo
             });
          }

          // Restore Specs
          if (product.skus && product.skus.length > 0) {
             const loadedSpecs = product.skus.map((sku) => ({
                 key: sku.id || Date.now() + Math.random(),
                 id: sku.id,
                 name: sku.name,
                 skuCode: sku.skuCode,
                 costPrice: sku.costPrice,
                 supplier: sku.supplier ? { value: sku.supplier.id, label: sku.supplier.name } : undefined
             }));
             setSpecs(loadedSpecs);
          }
          
          targetStatusRef.current = product.status;

        } catch (error) {
          console.error('Failed to fetch product detail', error);
          message.error('获取商品详情失败');
        }
      };
      fetchProductDetail();
    }
  }, [id, form]);

  const onCategoryLoadData = (selectedOptions: Option[]) => {
      const targetOption = selectedOptions[selectedOptions.length - 1];
      targetOption.loading = true;

      // Determine next level
      const level = selectedOptions.length + 1;
      
      fetchCategories(level, targetOption.value).then((data) => {
          targetOption.loading = false;
          targetOption.children = data;
          setCategoryOptions([...categoryOptions]);
      });
  };

  // API for Tax (Tax Categories)
  const handleTaxSearch = async (value: string) => {
      // Remote search supports keyword
      setTaxLoading(true);
      try {
          // Use new Tax Category API
          const res = await request.get('/tax-categories', { params: { keyword: value } }) as TaxCategory[];
          setTaxOptions(res || []);
      } catch (error) {
          console.error('Failed to search tax categories', error);
      } finally {
          setTaxLoading(false);
      }
  };

  // Brand Search
  const handleBrandSearch = async (value: string) => {
      // Always fetch on search, but can optimize. 
      // The previous implementation used "keyword" but BrandController uses "name".
      setBrandLoading(true);
      try {
          const res = await request.get('/brands', { params: { name: value, status: 'ENABLED', size: 50 } }) as { records: Brand[] };
          setBrands(res.records || []);
      } catch (error) {
          console.error('Failed to search brands', error);
      } finally {
          setBrandLoading(false);
      }
  };

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const targetStatusRef = useRef('PENDING_SELECTION');

  const onBrandSelect = (_: unknown, option: { brandData: Brand }) => {
      setSelectedBrand(option.brandData);
  };

  // Tax Auto-fill Handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTaxChange = (_: unknown, option: any) => {
        if (option) {
            form.setFieldsValue({ 
                taxRate: option.rate,
                // taxCode: option.code 
                // Product entity expects taxCode? Let's use taxCategoryId or categoryCode
                taxCode: option.categoryCode
            });
        }
  };

  const handleTaxRefresh = async () => {
      setTaxLoading(true);
      try {
          // Trigger backend re-init
          await request.post('/tax-categories/sync');
          message.success('税务数据已刷新');
          setTaxOptions([]); // Clear options to force re-search
      } catch {
          message.error('刷新失败');
      } finally {
          setTaxLoading(false);
      }
  };

  const onFinish = async (values: ProductFormValues) => {
    // 验证规格
    if (specs.length === 0) {
        message.error('请至少添加一个商品规格');
        return;
    }

    // 校验规格必填项
    if (specs.some(item => !item.name || item.costPrice === null || item.costPrice === undefined)) {
        message.error('请完善规格信息（名称、成本价）');
        return;
    }

    // Extract category info
    const categoryCode = values.category && values.category.length > 0 ? values.category[values.category.length - 1] : null;
    
    // Extract Brand ID from labelInValue object
    const brandIdVal = values.brandObj ? values.brandObj.value : null;

    const submitData = { 
        ...values,
        name: values.productName,
        logisticsTemplate: values.logistics,
        status: targetStatusRef.current,
        categoryCode: categoryCode,
        categoryName: selectedCategoryName, 
        categoryVersion: values.categoryVersion || 'v1.0',
        
        brandId: brandIdVal, // Use extracted ID
        brandZhName: values.brandObj ? values.brandObj.label : null,
        brandEnName: null, 
        brandLogo: selectedBrand?.icon,

        taxRate: values.taxRate,
        // taxClass is now an object in form, but backend might expect string? 
        // Product entity has taxClass string. Let's send the label (name).
        taxClass: values.taxClass ? values.taxClass.label : null,

        skus: specs.map(s => ({
            ...s,
            supplier: s.supplier ? { id: s.supplier.value } : null
        })),
    };

    
    try {
        if (id && !isNaN(Number(id))) {
            await request.put(`/products/${id}`, submitData);
            message.success('商品更新成功');
        } else {
            await request.post('/products', submitData);
            message.success('商品创建成功');
        }
        navigate('/supply-chain/product-pool');
    } catch (error) {
        console.error('Failed to submit product', error);
        message.error('提交失败，请重试');
    }
  };

  const handleButtonClick = (status: string) => {
      targetStatusRef.current = status;
      form.submit();
  };

  // 处理规格列表字段变更
  const handleSpecChange = (key: number | string, field: string, value: string | number | null | { value: string; label: string }) => {
    const newSpecs = specs.map(item => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setSpecs(newSpecs);
  };

  // 批量生成规格逻辑
  const handleGenerateSpecs = async () => {
     try {
        const values = await specForm.validateFields();
        const { baseName, level1Values, level2Values } = values;
        
        const newSpecs: SpecItem[] = [];
        
        const l1Vals = level1Values || [];
        const l2Vals = (hasLevel2 && level2Values) ? level2Values : [];

        // 生成逻辑
        if (l1Vals.length > 0) {
            if (hasLevel2 && l2Vals.length > 0) {
                // 有二级规格：L1 x L2
                l1Vals.forEach((v1: string) => {
                    l2Vals.forEach((v2: string) => {
                        // 规格名称为一级规格属性+二级规格属性
                        const specName = `${baseName ? baseName + ' ' : ''}${v1} ${v2}`.trim();
                        newSpecs.push({
                            key: Date.now() + Math.random(),
                            name: specName,
                            supplier: undefined,
                            costPrice: undefined
                        });
                    });
                });
            } else {
                // 只有一级规格
                l1Vals.forEach((v1: string) => {
                    const specName = `${baseName ? baseName + ' ' : ''}${v1}`.trim();
                    newSpecs.push({
                        key: Date.now() + Math.random(),
                        name: specName,
                        supplier: undefined,
                        costPrice: undefined
                    });
                });
            }
        }

        // 如果原有规格只有一条且是默认空数据，则覆盖；否则追加
        setSpecs([...specs, ...newSpecs]);
        
        setIsSpecModalVisible(false);
        specForm.resetFields();
        setHasLevel2(false); // 重置二级规格状态
        message.success(`成功生成 ${newSpecs.length} 个规格`);

     } catch (error) {
        console.error('Validation failed:', error);
     }
  };

  const handleDeleteSpec = (key: number | string) => {
     setSpecs(specs.filter(item => item.key !== key));
  };

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 商品池管理 > 新增/编辑商品"
        description={`新增/编辑商品页面（子页面）。

1. **基本信息（必填）**：
   - 商品名称、默认供应商。
   - 物流模板（默认为全国包邮）。
   - 商品分类（支持四级分类）。
   - 商品状态。

2. **商品规格（必填）**：
   - 支持一级及二级规格，可动态新增。
   - 每个规格包含：规格名称、默认供应商。
   - 规格可删除，保存时必须存在至少一个规格。

3. **辅助信息（非必填）**：
   - 宣传资料（支持上传100M以内压缩包，显示缩略图及名称）。
   - 关联品牌（可搜索选择已启用品牌，单选）。
   - 税务信息（税务分类、商品税率、商品税务编码）。

4. **操作按钮**：
   - **取消**：不保存并返回列表页。
   - **选品通过**：商品状态变更为“已选品”并返回列表页。
   - **选品通过并上架**：商品状态变更为“已上架”并返回列表页。
   - **校验**：保存时若必填字段未完善，在页面顶部高亮显示报错。

5. **异常处理**：
   - **规格必填**：必须至少包含一个规格，否则无法提交。
   - **网络异常**：保存失败时保留页面数据并提示重试。`}
        fields={[
          { name: 'productName', type: 'String', length: '200', required: true, desc: '商品名称' },
          { name: 'defaultSupplier', type: 'String', required: true, desc: '默认供应商' },
          { name: 'status', type: 'Enum', required: true, defaultValue: 'PendingSelection', desc: '状态' },
          { name: 'brandId', type: 'String', required: false, desc: '关联品牌' },
          { name: 'taxClass', type: 'String', required: false, desc: '税务分类' },
          { name: 'taxRate', type: 'Decimal', required: false, desc: '商品税率' },
          { name: 'taxCode', type: 'String', required: false, desc: '商品税务编码' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/product-pool')}>商品池管理</a> },
         { title: id ? '编辑商品' : '新增商品' }
      ]} />
      
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'PENDING_SELECTION', logistics: '全国包邮' }}>
        <Card title="基本信息" variant="borderless" style={{ marginBottom: 24 }}>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item 
                    name="productName" 
                    label="商品名称" 
                    validateTrigger="onBlur"
                    rules={[
                        { required: true, message: '请输入商品名称' },
                        {
                            validator: async (_, value) => {
                                if (!value) return Promise.resolve();
                                try {
                                    const params: Record<string, string | number> = { name: value };
                                    // Ensure excludeId is a valid number
                                    if (id && !isNaN(Number(id))) {
                                        params.excludeId = id;
                                    }
                                    const res = await request.get('/products/validation/name', { params }) as { exists: boolean };
                                    if (res && res.exists) {
                                        return Promise.reject(new Error('商品名称已存在，请使用其他名称'));
                                    }
                                    return Promise.resolve();
                                } catch (error) {
                                    console.error('Validation check failed', error);
                                    return Promise.resolve();
                                }
                            }
                        }
                    ]}
                 >
                    <Input placeholder="请输入商品名称" />
                 </Form.Item>
              </Col>
              {/* Removed Default Supplier as per requirement */}
              {/*
              <Col span={12}>
                 <Form.Item name="defaultSupplier" label="默认供应商" rules={[{ required: true }]}>
                    <Select placeholder="请选择供应商">
                       {suppliers.map(s => (
                           <Select.Option key={s.id} value={s.name}>{s.name}</Select.Option>
                       ))}
                    </Select>
                 </Form.Item>
              </Col>
              */}
              {/* Removed Status as per requirement */}
              {/*
              <Col span={12}>
                 <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                    <Select>
                       <Select.Option value="PendingSelection">待选品</Select.Option>
                       <Select.Option value="Selected">已选品</Select.Option>
                    </Select>
                 </Form.Item>
              </Col>
              */}
              <Col span={12}>
                 <Form.Item name="logistics" label="物流模板" rules={[{ required: true }]}>
                    <Select placeholder="请选择物流模板">
                       <Select.Option value="全国包邮">全国包邮</Select.Option>
                       <Select.Option value="顺丰包邮">顺丰包邮</Select.Option>
                       <Select.Option value="满99包邮">满99包邮</Select.Option>
                    </Select>
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="category" label="商品分类" rules={[{ required: true, message: '请选择商品分类' }]}>
                    <Cascader 
                        options={categoryOptions} 
                        loadData={onCategoryLoadData} 
                        changeOnSelect 
                        placeholder="请选择分类（四级）" 
                        onChange={onCategoryChange}
                    />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="brandObj" label="关联品牌">
                    <Select
                        labelInValue
                        placeholder="请输入品牌名称搜索"
                        showSearch
                        defaultActiveFirstOption={false}
                        filterOption={false}
                        onSearch={handleBrandSearch}
                        onFocus={() => {
                            if (brands.length === 0) {
                                handleBrandSearch('');
                            }
                        }}
                        loading={brandLoading}
                        notFoundContent={null}
                        onSelect={onBrandSelect}
                    >
                        {brands.map(b => (
                            <Select.Option key={b.id} value={b.id} label={b.name} brandData={b}>{b.name}</Select.Option>
                        ))}
                    </Select>
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item 
                    name="taxClass" 
                    label={
                        <Space>
                            税务分类
                            <Button 
                                type="link" 
                                icon={<SyncOutlined />} 
                                size="small" 
                                onClick={handleTaxRefresh}
                                style={{ padding: 0, height: 'auto' }}
                            >
                                刷新
                            </Button>
                        </Space>
                    }
                 >
                    <Select
                        labelInValue
                        optionLabelProp="label"
                        showSearch
                        placeholder="请输入税务分类名称或编码"
                        defaultActiveFirstOption={false}
                        filterOption={false}
                        onSearch={handleTaxSearch}
                        onChange={handleTaxChange}
                        onFocus={() => {
                            if (taxOptions.length === 0) {
                                handleTaxSearch('');
                            }
                        }}
                        loading={taxLoading}
                        notFoundContent={
                            <div style={{ textAlign: 'center', padding: '8px' }}>
                                <div>暂无数据</div>
                                <Button type="link" size="small" onClick={handleTaxRefresh}>
                                    重新初始化
                                </Button>
                            </div>
                        }
                    >
                        {taxOptions.map(t => (
                            <Select.Option key={t.id} value={t.categoryCode} rate={t.taxRate} categoryCode={t.categoryCode} label={t.categoryName}>{t.categoryName} ({t.categoryCode})</Select.Option>
                        ))}
                    </Select>
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="taxRate" label="商品税率">
                     <InputNumber<number>
                        style={{ width: '100%' }} 
                        min={0 as number} 
                        max={1 as number} 
                        step={0.01} 
                        precision={2}
                        formatter={(value) => value ? `${(value * 100).toFixed(0)}%` : ''}
                        parser={(value) => value ? parseFloat(value.replace('%', '')) / 100 : 0}
                     />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="taxCode" label="商品税务编码">
                    <Input placeholder="请输入税务编码" />
                 </Form.Item>
              </Col>
           </Row>
           <Row gutter={24}>
               <Col span={24}>
                  <Form.Item name="promo" label="宣传资料">
                     <Upload>
                        <Button icon={<UploadOutlined />}>上传文件 (100M以内)</Button>
                     </Upload>
                  </Form.Item>
               </Col>
           </Row>
        </Card>

        <Card 
           title="规格信息" 
           variant="borderless" 
           style={{ marginBottom: 24 }}
           extra={
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => setIsSpecModalVisible(true)}>
                 新增规格
              </Button>
           }
        >
           <Table
              dataSource={specs}
              pagination={false}
              columns={[
                 { 
                    title: '规格名称', 
                    dataIndex: 'name', 
                    render: (_, record) => (
                       <Input 
                          value={record.name} 
                          placeholder="请输入规格名称" 
                          onChange={(e) => handleSpecChange(record.key, 'name', e.target.value)}
                       /> 
                    )
                 },
                 {
                    title: '默认成本价',
                    dataIndex: 'costPrice',
                    render: (_, record) => (
                        <InputNumber
                            value={record.costPrice}
                            min={0}
                            max={9999999.99}
                            precision={2}
                            prefix="¥"
                            style={{ width: '100%' }}
                            placeholder="请输入"
                            onChange={(value) => handleSpecChange(record.key, 'costPrice', value)}
                        />
                    )
                 },
                 { 
                    title: '默认供应商', 
                    dataIndex: 'supplier', 
                    render: (_, record) => (
                       <Select 
                          value={record.supplier} 
                          labelInValue
                          style={{ width: '100%' }} 
                          placeholder="请选择供应商"
                          showSearch
                          filterOption={false}
                          onSearch={(val) => fetchSuppliers(val)}
                          loading={supplierLoading}
                          onChange={(value) => handleSpecChange(record.key, 'supplier', value)}
                       >
                          {suppliers.map(s => (
                              <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                          ))}
                       </Select>
                    ) 
                 },
                 {
                    title: '操作',
                    render: (_, record) => (
                       <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSpec(record.key)} />
                    )
                 }
              ]}
           />
        </Card>

        <Modal
            title="新增规格"
            open={isSpecModalVisible}
            onOk={handleGenerateSpecs}
            onCancel={() => setIsSpecModalVisible(false)}
            width={800}
        >
            <Form form={specForm} layout="vertical" initialValues={{ level1Values: [''] }}>
                <Form.Item name="baseName" label="规格品名（选填）">
                    <Input placeholder="例如：IPhone 15，若不填则直接使用属性组合" />
                </Form.Item>
                
                {/* 一级规格 */}
                <Card type="inner" title="一级规格（必填）" size="small" style={{ marginBottom: 16 }}>
                    <Form.Item name="level1Name" label="一级规格名称" rules={[{ required: true, message: '请输入一级规格名称' }]}>
                         <Input placeholder="例如：内存" />
                    </Form.Item>
                    <Form.List name="level1Values">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, ...restField }, index) => (
                                    <Form.Item
                                        {...restField}
                                        label={index === 0 ? "规格属性" : ""}
                                        required={false}
                                        key={key}
                                    >
                                        <Space style={{ display: 'flex' }} align="baseline">
                                            <Form.Item
                                                {...restField}
                                                validateTrigger={['onChange', 'onBlur']}
                                                rules={[{ required: true, whitespace: true, message: "请输入规格属性或删除此行" }]}
                                                noStyle
                                            >
                                                <Input placeholder="属性值，如：128G" style={{ width: 300 }} />
                                            </Form.Item>
                                            {fields.length > 1 ? (
                                                <MinusCircleOutlined onClick={() => remove(restField.name)} />
                                            ) : null}
                                        </Space>
                                    </Form.Item>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        新增规格属性
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Card>

                {/* 二级规格 */}
                {hasLevel2 ? (
                    <Card 
                        type="inner" 
                        title="二级规格" 
                        size="small" 
                        extra={<Button type="link" danger onClick={() => setHasLevel2(false)}>删除二级规格</Button>}
                    >
                         <Form.Item name="level2Name" label="二级规格名称" rules={[{ required: true, message: '请输入二级规格名称' }]}>
                             <Input placeholder="例如：颜色" />
                        </Form.Item>
                        <Form.List name="level2Values">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, ...restField }, index) => (
                                        <Form.Item
                                            {...restField}
                                            label={index === 0 ? "规格属性" : ""}
                                            required={false}
                                            key={key}
                                        >
                                            <Space style={{ display: 'flex' }} align="baseline">
                                                <Form.Item
                                                    {...restField}
                                                    validateTrigger={['onChange', 'onBlur']}
                                                    rules={[{ required: true, whitespace: true, message: "请输入规格属性或删除此行" }]}
                                                    noStyle
                                                >
                                                    <Input placeholder="属性值，如：红色" style={{ width: 300 }} />
                                                </Form.Item>
                                                {fields.length > 1 ? (
                                                    <MinusCircleOutlined onClick={() => remove(restField.name)} />
                                                ) : null}
                                            </Space>
                                        </Form.Item>
                                    ))}
                                    <Form.Item>
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            新增规格属性
                                        </Button>
                                    </Form.Item>
                                </>
                            )}
                        </Form.List>
                    </Card>
                ) : (
                     <Button type="dashed" block icon={<PlusOutlined />} onClick={() => {
                         setHasLevel2(true);
                         // 默认添加一个空属性输入框
                         const current = specForm.getFieldValue('level2Values') || [];
                         if (current.length === 0) specForm.setFieldsValue({ level2Values: [''] });
                     }}>
                        新增二级规格
                     </Button>
                )}
            </Form>
        </Modal>

        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
           <Space size="large">
              <Button onClick={() => navigate('/supply-chain/product-pool')}>取消</Button>
              <Button type="primary" onClick={() => handleButtonClick('SELECTED')}>选品通过</Button>
              <Button type="primary" onClick={() => handleButtonClick('ON_SHELF')}>选品通过并上架</Button>
           </Space>
        </div>
      </Form>
    </div>
  );
};

export default ProductAdd;
