import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Button, InputNumber, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { productService, Product } from '../../services/productService';

interface BundleSelectorProps {
  value?: any[];
  onChange?: (value: any[]) => void;
}

const BundleSelector: React.FC<BundleSelectorProps> = ({ value = [], onChange }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getAll({ page: 0, size: 50, name: searchText });
      if (res && res.data && res.data.records) {
        setProducts(res.data.records);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalVisible) {
      fetchProducts();
    }
  }, [isModalVisible, searchText]);

  const handleAdd = (product: Product) => {
    // Check if already added
    if (value.some(item => item.childProductId === product.id)) {
      message.warning('该商品已添加');
      return;
    }
    const newItem = {
      childProductId: product.id,
      childProductName: product.name,
      quantity: 1
    };
    onChange?.([...value, newItem]);
    message.success('添加成功');
  };

  const handleRemove = (childProductId: number) => {
    onChange?.(value.filter(item => item.childProductId !== childProductId));
  };

  const handleQuantityChange = (childProductId: number, quantity: number) => {
    const newValue = value.map(item => {
      if (item.childProductId === childProductId) {
        return { ...item, quantity };
      }
      return item;
    });
    onChange?.(newValue);
  };

  return (
    <div>
      <Table
        dataSource={value}
        rowKey="childProductId"
        pagination={false}
        size="small"
        columns={[
          { title: '子商品名称', dataIndex: 'childProductName' },
          { 
            title: '数量', 
            dataIndex: 'quantity',
            render: (val, record) => (
              <InputNumber 
                min={1} 
                value={val} 
                onChange={(v) => handleQuantityChange(record.childProductId, v || 1)} 
              />
            )
          },
          {
            title: '操作',
            render: (_, record) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record.childProductId)} />
            )
          }
        ]}
      />
      <Button type="dashed" style={{ width: '100%', marginTop: 8 }} onClick={() => setIsModalVisible(true)}>
        <PlusOutlined /> 添加子商品
      </Button>

      <Modal
        title="选择子商品"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16, display: 'flex' }}>
          <Input.Search 
            placeholder="搜索商品名称" 
            onSearch={setSearchText} 
            style={{ width: 300 }} 
            allowClear
          />
        </div>
        <Table
          dataSource={products}
          rowKey="id"
          loading={loading}
          size="small"
          columns={[
            { title: 'SKU编码', dataIndex: 'skuCode' },
            { title: '商品名称', dataIndex: 'name' },
            { title: '规格', dataIndex: 'spec' },
            { 
              title: '操作', 
              render: (_, record) => (
                <Button size="small" type="primary" onClick={() => handleAdd(record)}>
                  选择
                </Button>
              )
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default BundleSelector;
