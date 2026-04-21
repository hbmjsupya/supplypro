import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Space, Select, InputNumber, message, Breadcrumb } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import request from '../../utils/request';

interface Sku {
    skuCode: string;
    name?: string;
    costPrice?: number;
    supplier?: { name: string };
}

interface Product {
    id: number;
    name: string;
    skuCode: string;
    skus?: Sku[];
    status?: string;
    bundleItems?: {
        id: number;
        childProductId: number;
        quantity: number;
        childProduct?: Product;
    }[];
}

interface ProductOption {
    label: string;
    value: number;
    product: Product;
}

interface SubProduct {
    key: number;
    productId?: number;
    name?: string;
    spec?: string; // SKU Name or Code
    skuCode?: string; // Actual SKU Code
    supplier?: string;
    cost?: number;
    count?: number;
    total?: number;
    skuOptions?: Sku[]; // Available SKUs for this product
}

const BundleAdd: React.FC = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { id } = useParams();
    const [subProducts, setSubProducts] = useState<SubProduct[]>([
        { key: Date.now(), count: 1 }
    ]);
    const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchProducts = async (keyword: string = '') => {
        setLoading(true);
        try {
            const res = await request.get<{ records: Product[] }>('/products', {
                params: {
                    status: ['ON_SHELF', 'SELECTED'],
                    keyword,
                    page: 0,
                    size: 100
                },
                paramsSerializer: params => {
                    const searchParams = new URLSearchParams();
                    Object.keys(params).forEach(key => {
                        const val = (params as Record<string, unknown>)[key];
                        if (Array.isArray(val)) {
                            val.forEach((v: unknown) => searchParams.append(key, String(v)));
                        } else if (val !== undefined && val !== null) {
                            searchParams.append(key, String(val));
                        }
                    });
                    return searchParams.toString();
                }
            }) as unknown as { records: Product[] };
            
            if (res && res.records) {
                const options = res.records.map((p: Product) => ({
                    label: `${p.name} (${p.skuCode})`,
                    value: p.id,
                    product: p
                }));
                setProductOptions(options);
            }
        } catch (e) {
            console.error('Fetch products failed', e);
            if ((e as { response?: unknown; request?: unknown }).response || (e as { response?: unknown; request?: unknown }).request) {
                message.error('获取商品列表失败，请稍后重试');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts('');
    }, []);

    useEffect(() => {
        if (id) {
            const fetchDetail = async () => {
                try {
                    const res = await request.get<Product>(`/products/${id}`);
                    const p = res as unknown as Product;
                    if (p) {
                        form.setFieldsValue({
                            bundleName: p.name,
                            saleType: 'Bundle',
                        });
                        
                        if (p.bundleItems) {
                            const items = p.bundleItems.map((item: any) => {
                                const child = item.childProduct || { name: '', skuCode: '' } as Product;
                                const skus = child.skus || [];
                                // Find specific SKU if we were storing childSkuId, but currently we just default to first or matching logic
                                // Since we don't store childSkuId in ProductBundle yet (based on entity), we assume first or logic needs enhancement.
                                // But for display, we show what we have.
                                const firstSku = skus.length > 0 ? skus[0] : { skuCode: '' } as Sku;
                                
                                return {
                                    key: item.id || (Date.now() + Math.random()),
                                    productId: item.childProductId,
                                    name: child.name,
                                    spec: firstSku.name || firstSku.skuCode || '默认规格',
                                    skuCode: firstSku.skuCode,
                                    supplier: firstSku.supplier ? firstSku.supplier.name : '暂无供应商',
                                    cost: firstSku.costPrice || 0,
                                    count: item.quantity,
                                    total: (firstSku.costPrice || 0) * item.quantity,
                                    skuOptions: skus
                                };
                            });
                            setSubProducts(items);
                            
                            // Pre-fill options
                            const existingOptions = p.bundleItems.map((item: any) => ({
                                label: `${item.childProduct?.name} (${item.childProduct?.skuCode})`,
                                value: item.childProductId,
                                product: item.childProduct as Product
                            }));
                            setProductOptions(prev => {
                                const newOptions = [...prev];
                                existingOptions.forEach((opt: ProductOption) => {
                                    if (!newOptions.find(o => o.value === opt.value)) {
                                        newOptions.push(opt);
                                    }
                                });
                                return newOptions;
                            });
                        }
                    }
                } catch {
                    message.error('获取详情失败');
                }
            };
            fetchDetail();
        }
    }, [id, form]);

    const handleAddSubProduct = () => {
        setSubProducts([...subProducts, { key: Date.now(), count: 1 }]);
    };

    const handleRemoveSubProduct = (key: number) => {
        setSubProducts(subProducts.filter(item => item.key !== key));
    };

    const handleUpdateSubProduct = (key: number, field: string, value: number | string | null) => {
        const newSubProducts = subProducts.map(item => {
            if (item.key === key) {
                const updatedItem = { ...item, [field]: value };
                
                if (field === 'productId') {
                    const selectedOption = productOptions.find(opt => opt.value === value);
                    if (selectedOption) {
                        const p = selectedOption.product;
                        updatedItem.name = p.name;
                        updatedItem.skuOptions = p.skus || [];
                        
                        // Default to first SKU
                        if (p.skus && p.skus.length > 0) {
                            const firstSku = p.skus[0];
                            updatedItem.spec = firstSku.name || firstSku.skuCode;
                            updatedItem.skuCode = firstSku.skuCode;
                            updatedItem.supplier = firstSku.supplier ? firstSku.supplier.name : '暂无供应商';
                            updatedItem.cost = firstSku.costPrice || 0;
                        } else {
                            updatedItem.spec = '默认规格';
                            updatedItem.skuCode = p.skuCode;
                            updatedItem.supplier = '暂无供应商';
                            updatedItem.cost = 0;
                        }
                        updatedItem.count = 1;
                    }
                }

                if (field === 'skuCode') {
                    // Find SKU in options
                    const sku = item.skuOptions?.find((s: Sku) => s.skuCode === value);
                    if (sku) {
                        updatedItem.spec = sku.name || sku.skuCode;
                        updatedItem.skuCode = sku.skuCode;
                        updatedItem.supplier = sku.supplier ? sku.supplier.name : '暂无供应商';
                        updatedItem.cost = sku.costPrice || 0;
                    }
                }

                if (field === 'count' || field === 'productId' || field === 'skuCode') {
                    updatedItem.total = (updatedItem.cost || 0) * (updatedItem.count || 0);
                }
                return updatedItem;
            }
            return item;
        });
        setSubProducts(newSubProducts);
    };

    const onFinish = async (values: { bundleName: string }) => {
        // Strict validation: count must be > 0
        const invalidCount = subProducts.some(item => !item.count || item.count <= 0);
        if (invalidCount) {
             message.error('子商品数量不能为空且必须大于0');
             return;
        }

        const validSubProducts = subProducts.filter(item => item.productId && item.count && item.count > 0);
        if (validSubProducts.length === 0) {
            message.error('请至少添加一个有效的子商品');
            return;
        }

        const payload = {
            name: values.bundleName,
            type: 'BUNDLE',
            status: 'LISTED',
            bundleItems: validSubProducts.map(item => ({
                childProductId: item.productId,
                quantity: item.count,
                // TODO: Add childSkuId support in backend entity if needed to persist specific SKU choice
            }))
        };

        try {
            if (id) {
                await request.put(`/products/${id}`, payload);
            } else {
                await request.post('/products', payload);
            }
            
            message.success('组合商品保存成功');
            navigate('/supply-chain/bundle');
        } catch {
            // Error handled by interceptor usually
            // message.error('网络错误，请稍后重试');
        }
    };

    const columns = [
        {
            title: '子商品名称',
            dataIndex: 'name',
            key: 'name',
            width: 250,
            render: (text: string, record: SubProduct) => (
                <Select
                    showSearch
                    placeholder="请选择子商品"
                    style={{ width: '100%' }}
                    value={record.productId}
                    filterOption={false}
                    onSearch={fetchProducts}
                    onChange={(val) => handleUpdateSubProduct(record.key, 'productId', val)}
                    options={productOptions}
                    loading={loading}
                />
            )
        },
        {
            title: '规格',
            dataIndex: 'spec',
            key: 'spec',
            width: 200,
            render: (text: string, record: SubProduct) => {
                if (record.skuOptions && record.skuOptions.length > 1) {
                    return (
                        <Select
                            style={{ width: '100%' }}
                            value={record.skuCode}
                            onChange={(val) => handleUpdateSubProduct(record.key, 'skuCode', val)}
                            placeholder="请选择规格"
                        >
                            {record.skuOptions.map((sku) => (
                                <Select.Option key={sku.skuCode} value={sku.skuCode}>
                                    {sku.name || sku.skuCode}
                                </Select.Option>
                            ))}
                        </Select>
                    );
                }
                return <Input value={text} disabled />;
            }
        },
        {
            title: '默认供应商',
            dataIndex: 'supplier',
            key: 'supplier',
            render: (text: string) => <Input value={text} disabled />
        },
        {
            title: '默认成本单价',
            dataIndex: 'cost',
            key: 'cost',
            render: (val: number) => <InputNumber value={val} disabled formatter={value => `¥ ${value}`} />
        },
        {
            title: '数量',
            dataIndex: 'count',
            key: 'count',
            render: (val: number, record: SubProduct) => (
                <Form.Item
                    validateStatus={(!val || val <= 0) ? 'error' : ''}
                    help={(!val || val <= 0) ? '必须大于0' : ''}
                    style={{ margin: 0 }}
                >
                    <InputNumber 
                        min={1} 
                        precision={0}
                        value={val} 
                        onChange={(val) => handleUpdateSubProduct(record.key, 'count', val)} 
                        onBlur={() => {
                            if (!val || val <= 0) {
                                message.error('子商品数量不能为空且必须大于0');
                            }
                        }}
                    />
                </Form.Item>
            )
        },
        {
            title: '成本小计',
            dataIndex: 'total',
            key: 'total',
            render: (val: number) => `¥ ${(val || 0).toFixed(2)}`
        },
        {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: SubProduct) => (
                <MinusCircleOutlined onClick={() => handleRemoveSubProduct(record.key)} />
            )
        }
    ];

    return (
        <div style={{ background: '#fff', padding: 24 }}>
            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item>供应链管理</Breadcrumb.Item>
                <Breadcrumb.Item>组合商品管理</Breadcrumb.Item>
                <Breadcrumb.Item>{id ? '编辑' : '新增'}组合商品</Breadcrumb.Item>
            </Breadcrumb>
            
            <PageDoc 
                pageTitle={id ? '编辑组合商品' : '新增组合商品'}
                description="在此页面配置组合商品的基本信息及其包含的子商品。"
                fields={[]}
            />

            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item label="组合商品名称" name="bundleName" rules={[{ required: true, message: '请输入组合商品名称' }]}>
                    <Input placeholder="请输入组合商品名称" style={{ width: 400 }} />
                </Form.Item>
                <Form.Item label="售卖方式" name="saleType" initialValue="Bundle">
                    <Select disabled style={{ width: 200 }}>
                        <Select.Option value="Bundle">打包售卖</Select.Option>
                    </Select>
                </Form.Item>
                
                <Form.Item label="子商品明细" required>
                    <Table
                        dataSource={subProducts}
                        columns={columns}
                        pagination={false}
                        footer={() => (
                            <Button type="dashed" onClick={handleAddSubProduct} block icon={<PlusOutlined />}>
                                新增子商品
                            </Button>
                        )}
                    />
                </Form.Item>

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">保存</Button>
                        <Button onClick={() => navigate('/supply-chain/bundle')}>取消</Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
};

export default BundleAdd;