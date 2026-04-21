import React, { useState, useEffect } from 'react';
import { Modal, Table, Form, Input, Button, message } from 'antd';
import { productService, Product } from '../../../services/productService';
import type { ColumnsType } from 'antd/es/table';

interface ProductPoolModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (selectedItems: FlattenedSku[]) => void;
  supplierId?: number;
}

export interface FlattenedSku {
  key: string;
  productId: number;
  productName: string;
  skuId: number;
  skuCode: string;
  specName: string; // SKU name is treated as spec usually, or need to verify
  costPrice: number;
  category?: string;
  brand?: string;
  defaultSupplierName?: string;
  defaultSupplierId?: number;
}

const ProductPoolModal: React.FC<ProductPoolModalProps> = ({ open, onCancel, onOk }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FlattenedSku[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<FlattenedSku[]>([]);
  const [form] = Form.useForm();

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await productService.getAll({
        page: 0,
        size: 100, // Fetch more to flatten
        keyword: values.keyword,
        status: 'ON_SHELF' // Only show ON_SHELF products
      });
      
      // Fix: Spring Data Page object returns 'content', not 'records'
      const products: Product[] = res.content || res.records || [];
      const flattened: FlattenedSku[] = [];
      
      products.forEach(p => {
        // Filter client side if API doesn't support status param yet or just to be safe
        if (p.status !== 'ON_SHELF') return;
        if (p.id === null || p.id === undefined) {
            console.warn('Product missing ID:', p);
            return;
        }

        if (p.skus && p.skus.length > 0) {
            p.skus.forEach(sku => {
                flattened.push({
                    key: `${p.id}-${sku.id}`,
                    productId: p.id!,
                    productName: p.name,
                    skuId: sku.id,
                    skuCode: sku.skuCode,
                    specName: sku.name, // Assuming sku.name is the spec/variant name
                    costPrice: sku.costPrice,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    category: (p as any).categoryName || ((typeof p.category === 'object' && p.category) ? (p.category as any).name : p.category),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    brand: (p as any).brandZhName || ((typeof p.brand === 'object' && p.brand) ? (p.brand as any).name : p.brand),
                    defaultSupplierName: sku.supplier?.name || p.defaultSupplierName,
                    defaultSupplierId: sku.supplier?.id || p.defaultSupplierId
                });
            });
        }
      });
      
      setData(flattened);
    } catch (error) {
      console.error(error);
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (open) {
      fetchData();
      setSelectedRowKeys([]);
      setSelectedRows([]);
    }
  }, [open, fetchData]);

  const columns: ColumnsType<FlattenedSku> = [
    { title: '商品编码', dataIndex: 'skuCode' },
    { title: '商品名称', dataIndex: 'productName' },
    { title: '规格', dataIndex: 'specName' },
    { 
      title: '分类', 
      dataIndex: 'category',
      render: (val) => val || '--'
    },
    { 
      title: '品牌', 
      dataIndex: 'brand',
      render: (val) => val || '--'
    },
    { 
      title: '默认供应商', 
      dataIndex: 'defaultSupplierName',
      render: (val) => val || '--'
    },
    { title: '采购价', dataIndex: 'costPrice', render: (val) => val ? `¥${val}` : <span style={{color:'red'}}>未维护</span> },
  ];

  const handleOk = () => {
    // Validate cost price
    const invalidItems = selectedRows.filter(r => !r.costPrice || r.costPrice <= 0);
    if (invalidItems.length > 0) {
        message.error(`存在 ${invalidItems.length} 个商品未维护采购价，请先维护`);
        return;
    }
    onOk(selectedRows);
  };

  return (
    <Modal
      title="选择商品"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={1000}
      confirmLoading={loading}
    >
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item name="keyword" label="关键字">
          <Input placeholder="名称/编码" onPressEnter={fetchData} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={fetchData}>查询</Button>
        </Form.Item>
      </Form>
      
      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
          }
        }}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ y: 400 }}
      />
    </Modal>
  );
};

export default ProductPoolModal;
