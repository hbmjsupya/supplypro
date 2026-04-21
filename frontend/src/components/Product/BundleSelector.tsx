import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, Input, Button, InputNumber, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { productService, Product } from '../../services/productService';

interface BundleItem {
  childProductId: number;
  childProductName: string;
  quantity: number;
}

interface BundleSelectorProps {
  value?: BundleItem[];
  onChange?: (value: BundleItem[]) => void;
}

const BundleSelector: React.FC<BundleSelectorProps> = ({ value = [], onChange }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getAll({
        page: 0,
        size: 20,
        keyword: searchText
      });
      // Ensure we access records correctly based on response structure
      // request.get returns AxiosResponse or data directly depending on interceptor
      // Assuming res is the response object or data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res as any).records || (res as any).data?.records || [];
      setProducts(data);
    } catch (error) {
      console.error(error);
      message.error('加载商品失败');
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => {
    if (isModalVisible) {
      fetchProducts();
    }
  }, [isModalVisible, fetchProducts]);

  const handleAdd = (product: Product) => {
    if (!product.id) return;
    const newItem: BundleItem = {
      childProductId: product.id,
      childProductName: product.name,
      quantity: 1
    };
    onChange?.([...value, newItem]);
    setIsModalVisible(false);
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
