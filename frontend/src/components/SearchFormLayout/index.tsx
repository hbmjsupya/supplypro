import React from 'react';
import { Card, Form, Button, Space } from 'antd';
import type { FormInstance, FormProps } from 'antd';

interface SearchFormLayoutProps {
  children: React.ReactNode;
  onSearch?: () => void;
  onReset: () => void;
  onFinish?: (values: any) => void;
  form?: FormInstance;
  initialValues?: any;
  formProps?: FormProps;
  extraButtons?: React.ReactNode;
}

const SearchFormLayout: React.FC<SearchFormLayoutProps> = ({ 
  children, 
  onSearch, 
  onReset,
  onFinish,
  form,
  initialValues,
  formProps,
  extraButtons
}) => {
  const handleSearchClick = () => {
    if (onSearch) {
      onSearch();
    } else if (form) {
      form.submit();
    }
  };

  return (
    <Card 
      style={{ marginBottom: 16, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }} 
      bodyStyle={{ padding: 0 }}
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish} {...formProps}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px 24px',
          alignItems: 'end'
        }}>
          {children}
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0'
        }}>
          <Space size={8}>
             {extraButtons}
             <Button onClick={onReset}>重置</Button>
             <Button type="primary" onClick={handleSearchClick}>查询</Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default SearchFormLayout;