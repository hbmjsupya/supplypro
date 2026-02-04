import React, { useState } from 'react';
import { Form, Input, Button, Card, Space, Select, Table, InputNumber, Upload, Row, Col, message, Breadcrumb } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';

const BundleAdd: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  
  const [subProducts, setSubProducts] = useState<any[]>([
     { key: 1, name: undefined, spec: undefined, supplier: undefined, cost: 0, count: 1, total: 0 }
  ]);

  const mockProductOptions = [
    { label: '可口可乐 330ml', value: 'p1', spec: '330ml*24/箱', supplier: '北京饮料总厂', cost: 45.00 },
    { label: '百事可乐 330ml', value: 'p2', spec: '330ml*24/箱', supplier: '上海饮料二厂', cost: 42.50 },
    { label: '康师傅红烧牛肉面', value: 'p3', spec: '袋装*24', supplier: '天津顶益', cost: 38.00 },
  ];

  const handleUpdateSubProduct = (key: number, field: string, value: any) => {
    const newSubProducts = subProducts.map(item => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };
        
        // Special handling for product selection
        if (field === 'name') {
           const product = mockProductOptions.find(p => p.value === value);
           if (product) {
             updatedItem.spec = product.spec;
             updatedItem.supplier = product.supplier;
             updatedItem.cost = product.cost;
           }
        }

        // Recalculate total
        updatedItem.total = Number((updatedItem.cost * updatedItem.count).toFixed(2));
        return updatedItem;
      }
      return item;
    });
    setSubProducts(newSubProducts);
  };

  const onFinish = (values: any) => {
    if (subProducts.some(p => !p.name)) {
        message.error('请完善子商品信息');
        return;
    }
    console.log('Success:', values, 'SubProducts:', subProducts);
    message.success('组合商品保存成功');
    navigate('/supply-chain/bundle');
  };

  const handleAddSubProduct = () => {
     const newKey = subProducts.length > 0 ? Math.max(...subProducts.map(s => s.key)) + 1 : 1;
     setSubProducts([...subProducts, { key: newKey, name: undefined, spec: undefined, supplier: undefined, cost: 0, count: 1, total: 0 }]);
  };

  const handleDeleteSubProduct = (key: number) => {
     setSubProducts(subProducts.filter(item => item.key !== key));
  };

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 组合商品管理 > 新增/编辑组合商品"
        description={`新增/编辑组合商品页面（子页面）。

1. **基本信息（必填）**：
   - 组合商品名称。
   - 售卖方式（仅支持打包方式，不可选）。

2. **商品规格（必填）**：
   - 支持一级及二级规格，可动态新增。
   - 每个规格包含：SKUID、规格名称、子商品种类数量、组合商品规格默认成本价。
   - **子商品信息**：
     - 子商品名称（支持模糊搜索已选品商品）。
     - 子商品规格（下拉选择）。
     - 子商品默认供应商（带入默认信息，可修改）。
     - 子商品默认成本价（带入默认信息，可修改）。
     - 子商品数量（必填，初始为空）。
     - 子商品成本合计（默认成本价*数量）。

3. **辅助信息（非必填）**：
   - 宣传资料（上传压缩包）、品牌。

4. **操作按钮**：
   - **取消**：不保存并返回。
   - **选品通过**：状态变更为“已选品”并返回。
   - **选品通过并上架**：状态变更为“已上架”并返回。
   - **校验**：保存时高亮显示未填写的必填项。

5. **异常处理**：
   - **必填项校验**：若未填写组合商品名称或未添加子商品，点击保存时提示“请完善必填信息”。
   - **子商品校验**：若添加了子商品行但未选择商品，保存时提示错误。
   - **网络异常**：保存失败时提示“网络错误，请稍后重试”。`}
        fields={[
          { name: 'bundleName', type: 'String', length: '200', required: true, desc: '组合商品名称' },
          { name: 'salesMode', type: 'Enum', required: true, defaultValue: 'Package', desc: '售卖方式' },
          { name: 'specs', type: 'List', required: true, desc: '商品规格列表' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/bundle')}>组合商品管理</a> },
         { title: id ? '编辑组合商品' : '新增组合商品' }
      ]} />
      
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ saleType: 'Bundle', status: 'PendingSelection' }}>
        <Card title="基本信息" variant="borderless" style={{ marginBottom: 24 }}>
           <Row gutter={24}>
              <Col span={12}>
                 <Form.Item name="bundleName" label="组合商品名称" rules={[{ required: true }]}>
                    <Input placeholder="请输入" />
                 </Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="saleType" label="售卖方式" rules={[{ required: true }]}>
                    <Select disabled>
                       <Select.Option value="Bundle">打包售卖</Select.Option>
                    </Select>
                 </Form.Item>
              </Col>
              <Col span={24}>
                 <Form.Item name="promo" label="宣传资料">
                    <Upload>
                       <Button icon={<UploadOutlined />}>上传文件 (100M以内)</Button>
                    </Upload>
                 </Form.Item>
              </Col>
           </Row>
        </Card>

        <Card title="商品规格 (组合内容)" variant="borderless" style={{ marginBottom: 24 }}>
           <Table
              dataSource={subProducts}
              pagination={false}
              columns={[
                 { 
                    title: '子商品名称', 
                    dataIndex: 'name', 
                    render: (_, record) => (
                        <Select 
                            showSearch 
                            placeholder="搜索选择" 
                            style={{ width: '100%' }} 
                            options={mockProductOptions}
                            value={record.name}
                            onChange={(value) => handleUpdateSubProduct(record.key, 'name', value)}
                        />
                    )
                 },
                 { 
                    title: '子商品规格', 
                    dataIndex: 'spec', 
                    render: (_, record) => <Input value={record.spec} disabled placeholder="自动带入" />
                 },
                 { 
                    title: '默认供应商', 
                    dataIndex: 'supplier', 
                    render: (_, record) => <Input value={record.supplier} disabled placeholder="自动带入" />
                 },
                 { 
                    title: '默认成本价', 
                    dataIndex: 'cost', 
                    render: (_, record) => <InputNumber value={record.cost} disabled style={{ width: '100%' }} prefix="¥" />
                 },
                 { 
                    title: '数量', 
                    dataIndex: 'count', 
                    render: (_, record) => (
                        <InputNumber 
                            min={1} 
                            value={record.count} 
                            onChange={(value) => handleUpdateSubProduct(record.key, 'count', value)}
                            style={{ width: '100%' }} 
                        />
                    )
                 },
                 { 
                    title: '成本合计', 
                    dataIndex: 'total', 
                    render: (_, record) => <span>¥{record.total ? record.total.toFixed(2) : '0.00'}</span>
                 },
                 {
                    title: '操作',
                    render: (_, record) => (
                       <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSubProduct(record.key)} />
                    )
                 }
              ]}
           />
           <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddSubProduct} style={{ marginTop: 16 }}>
              新增子商品
           </Button>
        </Card>

        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
           <Space size="large">
              <Button onClick={() => navigate('/supply-chain/bundle')}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
           </Space>
        </div>
      </Form>
    </div>
  );
};

export default BundleAdd;
