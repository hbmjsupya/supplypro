import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Card, Row, Col, Cascader, Tag, Modal, message } from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined, SaveOutlined } from '@ant-design/icons';
import request from '../../../utils/request';

interface WarehouseSearchProps {
  onSearch: (values: any) => void;
  addressOptions: any[];
}

const WarehouseSearch: React.FC<WarehouseSearchProps> = ({ onSearch, addressOptions }) => {
  const [form] = Form.useForm();
  const [history, setHistory] = useState<any[]>([]);
  const [savedSchemes, setSavedSchemes] = useState<any[]>([]);
  const [managerOptions, setManagerOptions] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [schemeName, setSchemeName] = useState('');
  const [activeHistoryTag, setActiveHistoryTag] = useState<number | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('warehouse_search_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedSchemesData = localStorage.getItem('warehouse_search_schemes');
    if (savedSchemesData) setSavedSchemes(JSON.parse(savedSchemesData));
  }, []);

  const handleSearch = async () => {
    const values = await form.validateFields();
    
    // Clean up empty values
    const cleanedValues = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
    );

    // Save to history (deduplicate)
    const newHistory = [cleanedValues, ...history.filter(h => JSON.stringify(h) !== JSON.stringify(cleanedValues))].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('warehouse_search_history', JSON.stringify(newHistory));
    setActiveHistoryTag(0);
    
    onSearch(cleanedValues);
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
        Object.entries(values).filter(([_, v]) => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
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

  const applyScheme = (values: any) => {
      form.setFieldsValue(values);
      handleSearch();
  };
  
  const applyHistory = (values: any, index: number) => {
      form.setFieldsValue(values);
      setActiveHistoryTag(index);
      onSearch(values);
  };

  const fetchManagers = async (value: string) => {
    if (!value) return;
    try {
        const res: any = await request.get('/users/list', { params: { username: value, size: 10 } });
        setManagerOptions(res.content.map((u: any) => ({ label: `${u.username} (${u.phone || u.id})`, value: u.username })));
    } catch (e) {
        console.error(e);
    }
  };

  const fetchProducts = async (value: string) => {
      if(!value) return;
       try {
           const res: any = await request.get('/products', { params: { name: value, size: 10 } }); 
           const list = res.content || [];
           setProductOptions(list.map((p: any) => ({ label: `${p.name} (${p.skuCode})`, value: p.name })));
       } catch (e) {
           console.error(e);
       }
  };

  return (
    <div style={{ marginBottom: 16 }}>
        <Card bordered={false}>
            <Form form={form} layout="vertical" onFinish={handleSearch}>
                <Row gutter={24}>
                    <Col span={6}>
                        <Form.Item name="keyword" label="库名/编号">
                            <Input placeholder="请输入库名或编号" allowClear />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="region" label="所在地区">
                             <Cascader options={addressOptions} placeholder="请选择省/市/区" changeOnSelect />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="productKeyword" label="包含商品">
                            <Select
                                mode="tags"
                                placeholder="请输入商品名/SKU/分类"
                                onSearch={fetchProducts}
                                filterOption={false}
                                showSearch
                                options={productOptions}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="managerKeyword" label="管理员">
                             <Select
                                showSearch
                                placeholder="请输入姓名/工号/手机号"
                                defaultActiveFirstOption={false}
                                showArrow={false}
                                filterOption={false}
                                onSearch={fetchManagers}
                                options={managerOptions}
                                allowClear
                             />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="statuses" label="状态">
                            <Select mode="multiple" placeholder="请选择状态" allowClear>
                                <Select.Option value="ACTIVE">启用</Select.Option>
                                <Select.Option value="INACTIVE">禁用</Select.Option>
                                <Select.Option value="PENDING">待审核</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={18} style={{ textAlign: 'right', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                        <Form.Item label=" ">
                            <Space>
                                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
                                <Button onClick={handleReset} icon={<ReloadOutlined />}>重置</Button>
                                <Button onClick={() => setIsSaveModalOpen(true)} icon={<SaveOutlined />}>保存方案</Button>
                            </Space>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            
            {/* History and Schemes */}
            {(history.length > 0 || savedSchemes.length > 0) && (
                <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
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
        </Card>
        
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
    </div>
  );
};

export default WarehouseSearch;