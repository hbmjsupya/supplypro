import React, { useState } from 'react';
import { Form, Input, Button, Card, Space, Select, Table, InputNumber, Upload, Row, Col, message, Breadcrumb, Modal, Cascader, Switch } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import BundleSelector from '../../components/Product/BundleSelector';

interface Option {
  value: string;
  label: string;
  children?: Option[];
}

const categoryOptions: Option[] = [
  {
    value: 'office',
    label: '办公用品',
    children: [
      {
        value: 'writing',
        label: '书写工具',
        children: [
          {
            value: 'pen',
            label: '中性笔',
            children: [
              { value: '0.5mm', label: '0.5mm中性笔' },
              { value: '0.7mm', label: '0.7mm中性笔' },
            ],
          },
        ],
      },
      {
        value: 'paper',
        label: '纸张本册',
        children: [
          {
              value: 'copy_paper',
              label: '复印纸',
              children: [
                  { value: 'a4', label: 'A4复印纸' },
                  { value: 'a3', label: 'A3复印纸' }
              ]
          }
        ]
      }
    ],
  },
];

const ProductAdd: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();

  // Mock brands data
  const mockBrands = [
     { label: '晨光文具', value: 'brand1' },
     { label: '得力集团', value: 'brand2' },
     { label: '齐心文具', value: 'brand3' },
     { label: '惠普', value: 'brand4' },
  ];

  // 新增规格 Modal 相关状态
  const [isSpecModalVisible, setIsSpecModalVisible] = useState(false);
  const [specForm] = Form.useForm();
  const [hasLevel2, setHasLevel2] = useState(false);
  
  // Mock specs data
  const [specs, setSpecs] = useState<any[]>([]);
  
  // Bundle state
  const [isBundle, setIsBundle] = useState(false);
  const [bundleItems, setBundleItems] = useState<any[]>([]);

  const onFinish = (values: any) => {
    // 验证规格
    if (!isBundle && specs.length === 0) {
        message.error('普通商品请至少添加一个商品规格');
        return;
    }
    // 验证组合商品
    if (isBundle && bundleItems.length === 0) {
        message.error('组合商品请至少添加一个子商品');
        return;
    }

    console.log('Success:', values);
    // 这里应该合并 specs/bundleItems 数据到 values 中，或者单独处理
    const submitData = { 
        ...values, 
        isBundle,
        specs: isBundle ? [] : specs,
        bundleItems: isBundle ? bundleItems : []
    };
    console.log('Submit Data:', submitData);
    message.success('商品保存成功');
    navigate('/supply-chain/product-pool');
  };

  // 处理规格列表字段变更
  const handleSpecChange = (key: number, field: string, value: any) => {
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
        const { baseName, level1Name, level1Values, level2Name, level2Values } = values;
        
        let newSpecs: any[] = [];
        
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
                            cost: undefined
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
                        cost: undefined
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

  const handleDeleteSpec = (key: number) => {
     setSpecs(specs.filter(item => item.key !== key));
  };

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 商品池管理 > 新增/编辑商品"
        description={`新增/编辑商品页面（子页面）。

1. **基本信息（必填）**：
   - 商品名称、默认供应商、默认成本价。
   - 物流模板（默认为全国包邮）。
   - 商品分类（支持四级分类）。
   - 商品状态。

2. **商品规格（必填）**：
   - 支持一级及二级规格，可动态新增。
   - 每个规格包含：规格名称、默认供应商、默认成本价。
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
          { name: 'defaultCost', type: 'Decimal', length: '10,2', required: true, desc: '默认成本价' },
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
      
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'PendingSelection', logistics: '全国包邮' }}>
        <Card title="基本信息" bordered={false} style={{ marginBottom: 24 }}>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item name="productName" label="商品名称" rules={[{ required: true }]}>
                    <Input placeholder="请输入商品名称" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="isBundle" label="是否组合商品" valuePropName="checked">
                    <Switch onChange={setIsBundle} />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="defaultSupplier" label="默认供应商" rules={[{ required: true }]}>
                    <Select placeholder="请选择供应商">
                       <Select.Option value="晨光文具">晨光文具</Select.Option>
                       <Select.Option value="得力集团">得力集团</Select.Option>
                    </Select>
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="defaultCost" label="默认成本价" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} prefix="¥" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                    <Select>
                       <Select.Option value="PendingSelection">待选品</Select.Option>
                       <Select.Option value="Selected">已选品</Select.Option>
                    </Select>
                 </Form.Item>
              </Col>
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
                    <Cascader options={categoryOptions} placeholder="请选择分类（四级）" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="brandId" label="关联品牌">
                    <Select
                        placeholder="请选择关联品牌"
                        showSearch
                        optionFilterProp="label"
                        options={mockBrands}
                    />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="taxClass" label="税务分类">
                    <Input placeholder="请输入税务分类" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="taxRate" label="商品税率">
                     <InputNumber style={{ width: '100%' }} suffix="%" placeholder="请输入" />
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

        {isBundle ? (
            <Card title="组合商品明细" bordered={false} style={{ marginBottom: 24 }}>
                <BundleSelector value={bundleItems} onChange={setBundleItems} />
            </Card>
        ) : (
            <Card 
               title="规格信息" 
               bordered={false} 
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
                        title: '默认供应商', 
                        dataIndex: 'supplier', 
                        render: (_, record) => (
                           <Select 
                              value={record.supplier} 
                              style={{ width: '100%' }} 
                              placeholder="请选择供应商"
                              onChange={(value) => handleSpecChange(record.key, 'supplier', value)}
                           >
                              <Select.Option value="晨光文具">晨光文具</Select.Option>
                              <Select.Option value="得力集团">得力集团</Select.Option>
                           </Select>
                        ) 
                     },
                     { 
                        title: '默认成本价', 
                        dataIndex: 'cost', 
                        render: (_, record) => (
                           <InputNumber 
                              value={record.cost} 
                              style={{ width: '100%' }} 
                              placeholder="请输入"
                              onChange={(value) => handleSpecChange(record.key, 'cost', value)}
                           /> 
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
        )}

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
                                {fields.map((field, index) => (
                                    <Form.Item
                                        {...field}
                                        label={index === 0 ? "规格属性" : ""}
                                        required={false}
                                        key={field.key}
                                    >
                                        <Space style={{ display: 'flex' }} align="baseline">
                                            <Form.Item
                                                {...field}
                                                validateTrigger={['onChange', 'onBlur']}
                                                rules={[{ required: true, whitespace: true, message: "请输入规格属性或删除此行" }]}
                                                noStyle
                                            >
                                                <Input placeholder="属性值，如：128G" style={{ width: 300 }} />
                                            </Form.Item>
                                            {fields.length > 1 ? (
                                                <MinusCircleOutlined onClick={() => remove(field.name)} />
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
                                    {fields.map((field, index) => (
                                        <Form.Item
                                            {...field}
                                            label={index === 0 ? "规格属性" : ""}
                                            required={false}
                                            key={field.key}
                                        >
                                            <Space style={{ display: 'flex' }} align="baseline">
                                                <Form.Item
                                                    {...field}
                                                    validateTrigger={['onChange', 'onBlur']}
                                                    rules={[{ required: true, whitespace: true, message: "请输入规格属性或删除此行" }]}
                                                    noStyle
                                                >
                                                    <Input placeholder="属性值，如：红色" style={{ width: 300 }} />
                                                </Form.Item>
                                                {fields.length > 1 ? (
                                                    <MinusCircleOutlined onClick={() => remove(field.name)} />
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
              <Button type="primary" htmlType="submit">选品通过</Button>
              <Button type="primary">选品通过并上架</Button>
           </Space>
        </div>
      </Form>
    </div>
  );
};

export default ProductAdd;
