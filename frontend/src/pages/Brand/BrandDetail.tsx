import React, { useState } from 'react';
import { Form, Input, Button, Card, Space, Table, Breadcrumb, message, Upload, Modal, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';

const BrandDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  
  // State for supplier selection modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Mock Data Loading
  React.useEffect(() => {
    if (id) {
      // Mock fetch brand data
      const mockBrand = {
        brandName: '晨光文具',
        trademarkNo: 'TM2023001',
        icon: 'https://example.com/icon.png',
      };
      // Simulate API call
      setTimeout(() => {
        try {
           form.setFieldsValue(mockBrand);
           // In a real app, we would also fetch the associated suppliers here
           // setSuppliers(fetchedSuppliers);
        } catch (error) {
           message.error('加载品牌信息失败');
        }
      }, 500);
    }
  }, [id, form]);

  // Mock enabled suppliers (database source)
  const mockEnabledSuppliers = [
    { id: 'SUP002', name: '齐心办公用品有限公司', contact: '李经理', phone: '13900000000', email: 'li@qixin.com', address: '深圳市福田区' },
    { id: 'SUP003', name: '得力集团有限公司', contact: '王经理', phone: '13700000000', email: 'wang@deli.com', address: '宁波市宁海县' },
  ];
  
  // Mock suppliers for the brand
  const [suppliers, setSuppliers] = useState([
     { key: 1, name: '晨光文具销售有限公司', id: 'SUP001', contact: '张经理', phone: '13800000000', email: 'zhang@chenguang.com', address: '上海市奉贤区金钱公路' }
  ]);

  const onFinish = (values: any) => {
    console.log('Success:', values);
    message.success('品牌信息保存成功');
    navigate('/supply-chain/brand');
  };

  const handleDeleteSupplier = (key: number) => {
     setSuppliers(suppliers.filter(item => item.key !== key));
  };

  const handleAddSupplier = () => {
     setIsSupplierModalOpen(true);
     setSelectedSupplierId(null);
  };

  const handleConfirmAddSupplier = () => {
    if (!selectedSupplierId) {
      message.error('请选择供应商');
      return;
    }
    
    // Check if already exists
    if (suppliers.some(s => s.id === selectedSupplierId)) {
      message.warning('该供应商已关联');
      return;
    }

    const supplier = mockEnabledSuppliers.find(s => s.id === selectedSupplierId);
    if (supplier) {
      setSuppliers([...suppliers, { ...supplier, key: Date.now() }]);
      message.success('添加关联供应商成功');
      setIsSupplierModalOpen(false);
    }
  };

  return (
    <div>
      <PageDoc 
        pageTitle="供应链管理 > 品牌管理 > 品牌详情"
        description={`品牌详情页用于新增或编辑品牌信息。

1. **基本信息**：
   - 品牌名称（必填）、商标注册号、品牌图标。

2. **数据来源说明**：
   - **关联供应商**：调用[供应商管理]模块数据（更新频率：实时；权限：读取已启用供应商）。

3. **关联供应商**：
   - 展示关联的供应商列表（供应商名称、供应商ID、联系人、手机号、邮箱、地址）。
   - 支持新增（选择已启用供应商）、删除关联供应商。

4. **数据交互**：
   - **数据加载**：进入页面时自动加载品牌基础信息及关联供应商数据。
   - **异常处理**：数据加载失败时，需展示友好的错误提示（如"加载品牌信息失败"），并提供重试或返回机制。

5. **操作按钮**：
   - **提交**：提交品牌信息及关联供应商列表并返回品牌列表。
   - **取消**：返回品牌列表页不保存任何操作。

5. **异常处理**：
   - 必填校验：品牌名称为空时提示"请输入品牌名称"。
   - 网络异常：提交失败时弹出错误提示。`}
        fields={[
          { name: 'brandName', type: 'String', length: '100', required: true, desc: '品牌名称' },
          { name: 'trademarkNo', type: 'String', length: '50', required: false, desc: '商标注册号' },
          { name: 'icon', type: 'String', required: false, desc: '品牌图标' },
        ]}
      />
      <Breadcrumb style={{ marginBottom: 16 }} items={[
         { title: '供应链管理' },
         { title: <a onClick={() => navigate('/supply-chain/brand')}>品牌管理</a> },
         { title: id ? '编辑品牌' : '新增品牌' }
      ]} />
      
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="品牌基本信息" bordered={false} style={{ marginBottom: 24 }}>
           <Form.Item name="brandName" label="品牌名称" rules={[{ required: true, message: '请输入品牌名称' }]}>
              <Input placeholder="请输入品牌名称" />
           </Form.Item>
           <Form.Item name="trademarkNo" label="商标注册号">
              <Input placeholder="请输入商标注册号" />
           </Form.Item>
           <Form.Item name="icon" label="品牌图标">
              <Upload>
                 <Button icon={<UploadOutlined />}>上传图标</Button>
              </Upload>
           </Form.Item>
        </Card>

        <Card title="关联供应商" bordered={false} style={{ marginBottom: 24 }}>
           <Table
              dataSource={suppliers}
              pagination={false}
              columns={[
                 { title: '供应商名称', dataIndex: 'name' },
                 { title: '供应商ID', dataIndex: 'id' },
                 { title: '联系人', dataIndex: 'contact' },
                 { title: '手机号', dataIndex: 'phone' },
                 { title: '邮箱', dataIndex: 'email' },
                 { title: '地址', dataIndex: 'address' },
                 {
                    title: '操作',
                    render: (_, record) => (
                       <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSupplier(record.key)} />
                    )
                 }
              ]}
           />
           <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddSupplier} style={{ marginTop: 16 }}>
              新增关联供应商
           </Button>
        </Card>

        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
           <Space size="large">
              <Button onClick={() => navigate('/supply-chain/brand')}>取消</Button>
              <Button type="primary" htmlType="submit">提交</Button>
           </Space>
        </div>
      </Form>

      <Modal
        title="选择供应商"
        open={isSupplierModalOpen}
        onOk={handleConfirmAddSupplier}
        onCancel={() => setIsSupplierModalOpen(false)}
      >
        <Form layout="vertical">
          <Form.Item label="选择已启用供应商" required>
            <Select
              showSearch
              placeholder="请输入供应商名称搜索"
              optionFilterProp="children"
              onChange={(value: string) => setSelectedSupplierId(value)}
              filterOption={(input: string, option: any) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={mockEnabledSuppliers.map(s => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BrandDetail;
