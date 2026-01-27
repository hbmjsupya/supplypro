import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Space, Select, Table, Row, Col, message, Modal, Radio, Switch, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageDoc from '../../components/PageDoc';
import { LogisticsProvider, LogisticsAccount } from '../../types/logistics';
import { getLogisticsProviderById, saveLogisticsProvider } from '../../services/logisticsService';

const LogisticsProviderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = !id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Account State
  const [accounts, setAccounts] = useState<LogisticsAccount[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountForm] = Form.useForm();

  useEffect(() => {
    if (!isCreate && id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (providerId: string) => {
    // setLoading(true);
    try {
      const data = await getLogisticsProviderById(providerId);
      if (data) {
        form.setFieldsValue(data);
        setAccounts(data.accounts);
      } else {
        message.error('未找到数据');
        navigate('/supply-chain/logistics-provider');
      }
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      // setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    // Validate accounts
    if (accounts.length === 0) {
        message.warning('请至少添加一个结算账户');
        return;
    }
    const defaultAccount = accounts.find(a => a.isDefault);
    if (!defaultAccount) {
        message.warning('请设置一个默认结算账户');
        return;
    }

    // setLoading(true);
    try {
      const provider: LogisticsProvider = {
        id: isCreate ? `LP${Date.now()}` : id!,
        name: values.name,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        status: isCreate ? 'enabled' : 'enabled', // Default enabled for new
        settlementType: values.settlementType,
        settlementCycle: values.settlementCycle,
        accounts: accounts,
        createTime: isCreate ? new Date().toISOString() : undefined!, // Preserve existing if edit (handled in service but simplified here)
      };
      
      // If edit, we might want to preserve other fields if any, but for now this is fine
      if (!isCreate) {
          // fetch original to keep createTime and status if not passed
          const original = await getLogisticsProviderById(id!);
          if (original) {
              provider.createTime = original.createTime;
              provider.status = original.status;
          }
      }

      await saveLogisticsProvider(provider);
      message.success('保存成功');
      navigate('/supply-chain/logistics-provider');
    } catch (error) {
      message.error('保存失败');
    } finally {
      // setLoading(false);
    }
  };

  // Account Handlers
  const handleAddAccount = () => {
    accountForm.validateFields().then(values => {
       const newKey = Date.now();
       // If this is the first account, make it default automatically
       const isFirst = accounts.length === 0;
       
       setAccounts([...accounts, { 
          key: newKey, 
          type: values.type, 
          name: values.name, 
          bank: values.bank, 
          account: values.account,
          isDefault: isFirst,
          status: true
       }]);
       setIsAccountModalOpen(false);
       accountForm.resetFields();
    });
  };

  const handleSetDefault = (key: number) => {
    const newAccounts = accounts.map(acc => ({
      ...acc,
      isDefault: acc.key === key
    }));
    setAccounts(newAccounts);
    message.success('默认账户已更新');
  };

  const handleToggleStatus = (key: number, checked: boolean) => {
     const newAccounts = accounts.map(acc => {
        if (acc.key === key) {
           return { ...acc, status: checked };
        }
        return acc;
     });
     setAccounts(newAccounts);
     message.success(`账户已${checked ? '启用' : '禁用'}`);
  };

  const handleDeleteAccount = (key: number) => {
      setAccounts(accounts.filter(a => a.key !== key));
  };

  return (
    <div>
      <PageDoc 
        pageTitle={`供应链管理 > 物流供应商管理 > ${isCreate ? '新增' : '编辑'}物流供应商`}
        description="填写物流供应商基础信息及结算账户信息。"
      />
      
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="基础信息" bordered={false} style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item 
                name="name" 
                label="物流供应商名称" 
                rules={[{ required: true, message: '请输入供应商名称' }]}
              >
                <Input placeholder="请输入供应商名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="contactName" 
                label="联系人" 
                rules={[{ required: true, message: '请输入联系人' }]}
              >
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                name="contactPhone" 
                label="联系电话" 
                rules={[{ required: true, message: '请输入联系电话' }]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="settlementType" label="结算类型" initialValue="Cash" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Cash">现付</Select.Option>
                  <Select.Option value="Period">周期结算</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.settlementType !== curr.settlementType}
              >
                {({ getFieldValue }) => {
                  return getFieldValue('settlementType') === 'Period' ? (
                    <Form.Item name="settlementCycle" label="结算周期" rules={[{ required: true }]}>
                      <Select>
                        <Select.Option value="Daily">日结</Select.Option>
                        <Select.Option value="Weekly">周结</Select.Option>
                        <Select.Option value="Monthly">月结</Select.Option>
                      </Select>
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="结算账户" bordered={false} style={{ marginBottom: 24 }}>
           <Button type="dashed" onClick={() => setIsAccountModalOpen(true)} style={{ marginBottom: 16 }}>
             新增账户
           </Button>
           <Table
             dataSource={accounts}
             pagination={false}
             columns={[
               { title: '账户类型', dataIndex: 'type', render: (val) => val === 'Company' ? '公司' : '个人' },
               { title: '开户名称', dataIndex: 'name' },
               { title: '开户银行', dataIndex: 'bank' },
               { title: '银行账号', dataIndex: 'account' },
               { title: '默认', dataIndex: 'isDefault', render: (val) => val ? <Tag color="green">默认</Tag> : '-' },
               { title: '状态', dataIndex: 'status', render: (val, record) => (
                  <Switch size="small" checked={val} onChange={(c) => handleToggleStatus(record.key!, c)} />
               ) },
               { title: '操作', render: (_, record) => (
                  <Space>
                     {!record.isDefault && <Button type="link" size="small" onClick={() => handleSetDefault(record.key!)}>设为默认</Button>}
                     <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAccount(record.key!)} />
                  </Space>
               ) }
             ]}
           />
        </Card>

        <div style={{ textAlign: 'center' }}>
           <Space size="large">
              <Button onClick={() => navigate('/supply-chain/logistics-provider')}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
           </Space>
        </div>
      </Form>

      <Modal
        title="新增结算账户"
        open={isAccountModalOpen}
        onOk={handleAddAccount}
        onCancel={() => setIsAccountModalOpen(false)}
      >
        <Form form={accountForm} layout="vertical">
           <Form.Item name="type" label="账户类型" initialValue="Company" rules={[{ required: true }]}>
              <Radio.Group>
                 <Radio value="Company">公司</Radio>
                 <Radio value="Personal">个人</Radio>
              </Radio.Group>
           </Form.Item>
           <Form.Item name="name" label="开户名称" rules={[{ required: true, message: '请输入开户名称' }]}>
              <Input placeholder="请输入开户名称" />
           </Form.Item>
           <Form.Item name="bank" label="开户银行" rules={[{ required: true, message: '请输入开户银行' }]}>
              <Input placeholder="请输入开户银行" />
           </Form.Item>
           <Form.Item name="account" label="银行账号" rules={[{ required: true, message: '请输入银行账号' }]}>
              <Input placeholder="请输入银行账号" />
           </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LogisticsProviderDetail;
