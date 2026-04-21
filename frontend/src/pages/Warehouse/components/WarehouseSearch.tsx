import React, { useState } from 'react';
import { Form, Input, Select, Button, Space, Cascader, Tag, Modal, message } from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined, SaveOutlined } from '@ant-design/icons';
import request from '../../../utils/request';
import { useSearchHistory } from '../../../utils/hooks/useSearchHistory';
import SearchFormLayout from '../../../components/SearchFormLayout';

interface WarehouseSearchValues {
  keyword?: string;
  region?: string[];
  productKeyword?: string[];
  managerKeyword?: string;
  statuses?: string[];
  [key: string]: unknown;
}

export interface WarehouseSearchProps {
  onSearch: (values: WarehouseSearchValues) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addressOptions: any[];
}

const WarehouseSearch: React.FC<WarehouseSearchProps> = ({ onSearch, addressOptions }) => {
  const [form] = Form.useForm();
  
  const { history, saveHistory } = useSearchHistory<WarehouseSearchValues>({
    storageKey: 'warehouse_search_history',
    maxHistory: 5
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedSchemes, setSavedSchemes] = useState<any[]>(() => {
    const savedSchemesData = localStorage.getItem('warehouse_search_schemes');
    return savedSchemesData ? JSON.parse(savedSchemesData) : [];
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [managerOptions, setManagerOptions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [productOptions, setProductOptions] = useState<any[]>([]);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [schemeName, setSchemeName] = useState('');
    const [activeHistoryTag, setActiveHistoryTag] = useState<number | null>(null);

    const handleSearch = async () => {
    const values = await form.validateFields();
    saveHistory(values);
    setActiveHistoryTag(0);
    onSearch(values);
  };

  const handleReset = () => {
    form.resetFields();
    setActiveHistoryTag(null);
    onSearch({});
  };

  const saveScheme = () => {
    if (!schemeName) {
      message.error('请输入方案名称');
      return;
    }
    const values = form.getFieldsValue();
    // Clean up empty values
    const cleanedValues = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
    );

    const newSchemes = [...savedSchemes, { name: schemeName, values: cleanedValues }];
    setSavedSchemes(newSchemes);
    localStorage.setItem('warehouse_search_schemes', JSON.stringify(newSchemes));
    setIsSaveModalOpen(false);
    setSchemeName('');
    message.success('方案保存成功');
  };
  
  const deleteScheme = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSchemes = [...savedSchemes];
      newSchemes.splice(index, 1);
      setSavedSchemes(newSchemes);
      localStorage.setItem('warehouse_search_schemes', JSON.stringify(newSchemes));
  };

  const applyScheme = (values: WarehouseSearchValues) => {
      form.setFieldsValue(values);
      handleSearch();
  };
  
  const applyHistory = (values: WarehouseSearchValues, index: number) => {
      form.setFieldsValue(values);
      setActiveHistoryTag(index);
      onSearch(values);
  };

  const fetchManagers = async (value: string) => {
    if (!value) return;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await request.get('/users/list', { params: { username: value, size: 10 } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setManagerOptions(res.content.map((u: any) => ({ label: `${u.username} (${u.phone || u.id})`, value: u.username })));
    } catch (e) {
        console.error(e);
    }
  };

  const fetchProducts = async (value: string) => {
      if(!value) return;
       try {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const res: any = await request.get('/products', { params: { name: value, size: 10 } }); 
           const list = res.content || [];
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           setProductOptions(list.map((p: any) => ({ label: `${p.name} (${p.skuCode})`, value: p.name })));
       } catch (e) {
           console.error(e);
       }
  };

  return (
    <SearchFormLayout
      form={form}
      onSearch={handleSearch}
      onReset={handleReset}
      extraButtons={
         <Button onClick={() => setIsSaveModalOpen(true)} icon={<SaveOutlined />}>保存</Button>
      }
    >
      <Form.Item name="keyword" label="库名/编号" style={{ marginBottom: 0 }}>
        <Input placeholder="库名或编号" allowClear />
      </Form.Item>
      <Form.Item name="region" label="地区" style={{ marginBottom: 0 }}>
        <Cascader options={addressOptions} placeholder="省/市/区" changeOnSelect />
      </Form.Item>
      <Form.Item name="productKeyword" label="商品" style={{ marginBottom: 0 }}>
        <Select
          mode="tags"
          placeholder="商品名/SKU/分类"
          onSearch={fetchProducts}
          filterOption={false}
          showSearch
          options={productOptions}
          allowClear
        />
      </Form.Item>
      <Form.Item name="managerKeyword" label="管理员" style={{ marginBottom: 0 }}>
        <Select
          showSearch
          placeholder="姓名/工号/手机"
          defaultActiveFirstOption={false}
          showArrow={false}
          filterOption={false}
          onSearch={fetchManagers}
          options={managerOptions}
          allowClear
        />
      </Form.Item>
      <Form.Item name="statuses" label="状态" style={{ marginBottom: 0 }}>
        <Select mode="multiple" placeholder="状态" allowClear maxTagCount={1}>
          <Select.Option value="ACTIVE">启用</Select.Option>
          <Select.Option value="INACTIVE">禁用</Select.Option>
          <Select.Option value="PENDING">待审核</Select.Option>
        </Select>
      </Form.Item>

      {/* History and Schemes */}
      {(history.length > 0 || savedSchemes.length > 0) && (
          <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                {savedSchemes.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                        <span style={{ color: '#999', marginRight: 8 }}>常用方案:</span>
                        <Space wrap>
                            {savedSchemes.map((scheme, index) => (
                                <Tag 
                                    key={index} 
                                    color="blue" 
                                    style={{ cursor: 'pointer' }} 
                                    onClick={() => applyScheme(scheme.values)}
                                    closable
                                    onClose={(e) => deleteScheme(index, e)}
                                >
                                    {scheme.name}
                                </Tag>
                            ))}
                        </Space>
                    </div>
                )}
                {history.length > 0 && (
                    <div>
                        <span style={{ color: '#999', marginRight: 8 }}><HistoryOutlined /> 最近搜索:</span>
                        <Space wrap>
                            {history.map((h, index) => (
                                <Tag 
                                    key={index} 
                                    style={{ cursor: 'pointer' }}
                                    color={activeHistoryTag === index ? 'processing' : 'default'}
                                    onClick={() => applyHistory(h, index)}
                                >
                                    {/* Display logic for tag content */}
                                    {(() => {
                                        const parts = [];
                                        if (h.keyword) parts.push(h.keyword);
                                        if (h.region) parts.push('地区');
                                        if (h.productKeyword) parts.push('商品');
                                        if (h.managerKeyword) parts.push(h.managerKeyword);
                                        if (h.statuses) parts.push(h.statuses.join(','));
                                        return parts.length > 0 ? parts.join(' | ') : '全部';
                                    })()}
                                </Tag>
                            ))}
                        </Space>
                    </div>
                )}
            </div>
        )}
        
        <Modal 
            title="保存搜索方案" 
            open={isSaveModalOpen} 
            onOk={saveScheme} 
            onCancel={() => setIsSaveModalOpen(false)}
        >
            <Input 
                placeholder="请输入方案名称" 
                value={schemeName} 
                onChange={e => setSchemeName(e.target.value)} 
            />
        </Modal>
    </SearchFormLayout>
  );
};

export default WarehouseSearch;