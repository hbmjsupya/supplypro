import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, Table, Breadcrumb, message, Upload, Modal, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { getBrandById, createBrand, updateBrand } from '../../services/brandService';
import { getSuppliers, SupplierDTO } from '../../services/supplierService';

const BrandDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  
  // State for supplier selection modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  // Data states
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]); // Selected suppliers
  const [allSuppliers, setAllSuppliers] = useState<SupplierDTO[]>([]); // All available suppliers for selection

  // Load all suppliers for selection (mocking "Enabled" filter by frontend)
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        // Fetch a large page to get most suppliers
        const res = await getSuppliers({ size: 1000 });
        // Filter only ACTIVE suppliers
        const activeSuppliers = (res.content || []).filter(s => s.status === 'ACTIVE');
        setAllSuppliers(activeSuppliers);
      } catch (error) {
        message.error('加载供应商列表失败');
      }
    };
    fetchSuppliers();
  }, []);

  // Load Brand Data
  useEffect(() => {
    if (id) {
      setLoading(true);
      getBrandById(Number(id))
        .then(data => {
           form.setFieldsValue(data);
           // Backend returns suppliers in the brand object
           setSuppliers(data.suppliers || []);
        })
        .catch(() => {
           message.error('加载品牌信息失败');
        })
        .finally(() => {
           setLoading(false);
        });
    }
  }, [id, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Construct payload with suppliers
      // We send the full supplier objects or just IDs wrapped in objects.
      // BrandController expects Brand entity structure.
      // Ideally we should send { ...values, suppliers: [{id: 1}, {id: 2}] }
      const payload = {
        ...values,
        suppliers: suppliers.map(s => ({ id: s.id }))
      };

      if (id) {
        await updateBrand(Number(id), payload);
        message.success('品牌信息更新成功');
      } else {
        await createBrand(payload);
        message.success('品牌创建成功');
      }
      navigate('/supply-chain/brand');
    } catch (error) {
      message.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = (supplierId: number) => {
     setSuppliers(suppliers.filter(item => item.id !== supplierId));
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

    const supplier = allSuppliers.find(s => s.id === selectedSupplierId);
    if (supplier) {
      setSuppliers([...suppliers, supplier]);
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

6. **异常处理**：
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
           <Form.Item name="name" label="品牌名称" rules={[{ required: true, message: '请输入品牌名称' }]}>
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
              rowKey="id"
              columns={[
                 { title: '供应商名称', dataIndex: 'name' },
                 { title: '供应商ID', dataIndex: 'id' }, // Display ID, but user might expect code/no
                 { title: '联系人', dataIndex: 'contactPerson' },
                 { title: '手机号', dataIndex: 'contactPhone' },
                 { title: '邮箱', dataIndex: 'email' },
                 { title: '地址', dataIndex: 'address' },
                 {
                    title: '操作',
                    render: (_, record) => (
                       <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSupplier(record.id)} />
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
              <Button type="primary" htmlType="submit" loading={loading}>提交</Button>
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
              onChange={(value: number) => setSelectedSupplierId(value)}
              filterOption={(input: string, option: any) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={allSuppliers.map(s => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BrandDetail;
